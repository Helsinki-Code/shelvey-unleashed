import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, userId, postId, postData } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let result: unknown;

    switch (action) {
      case 'create_post': {
        const { data, error } = await supabase
          .from('social_posts')
          .insert({
            user_id: userId,
            campaign_id: postData.campaignId,
            content: postData.content,
            media_urls: postData.mediaUrls || [],
            platforms: postData.platforms,
            scheduled_at: postData.scheduledAt,
            status: postData.scheduledAt ? 'scheduled' : 'draft'
          })
          .select()
          .single();

        if (error) throw error;
        result = data;

        await supabase.from('agent_activity_logs').insert({
          agent_id: 'social-media-agent',
          agent_name: 'Social Media Manager',
          action: `Created post for ${postData.platforms.join(', ')}`,
          status: 'completed',
          metadata: { post_id: data.id, platforms: postData.platforms }
        });
        break;
      }

      case 'post_now': {
        // Get the post
        const { data: post, error: fetchError } = await supabase
          .from('social_posts')
          .select('*')
          .eq('id', postId)
          .single();

        if (fetchError) throw fetchError;

        const postResults: Record<string, unknown> = {};

        // Post to each platform via MCPs
        for (const platform of post.platforms) {
          try {
            const mcpFunction = `mcp-${platform.toLowerCase()}`;
            const content = post.content[platform] || post.content.default || '';

            const { data: mcpResult } = await supabase.functions.invoke(mcpFunction, {
              body: {
                action: 'create_post',
                userId,
                params: {
                  content,
                  mediaUrls: post.media_urls
                }
              }
            });

            postResults[platform] = { success: true, data: mcpResult };
          } catch (mcpError) {
            console.error(`Failed to post to ${platform}:`, mcpError);
            postResults[platform] = { success: false, error: String(mcpError) };
          }
        }

        // Update post status
        const { data, error } = await supabase
          .from('social_posts')
          .update({
            status: 'posted',
            posted_at: new Date().toISOString(),
            post_results: postResults
          })
          .eq('id', postId)
          .select()
          .single();

        if (error) throw error;
        result = { post: data, results: postResults };

        await supabase.from('agent_activity_logs').insert({
          agent_id: 'social-media-agent',
          agent_name: 'Social Media Manager',
          action: `Posted to ${post.platforms.join(', ')}`,
          status: 'completed',
          metadata: { post_id: postId, results: postResults }
        });
        break;
      }

      case 'schedule_post': {
        const { data, error } = await supabase
          .from('social_posts')
          .update({
            scheduled_at: postData.scheduledAt,
            status: 'scheduled'
          })
          .eq('id', postId)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        result = data;
        break;
      }

      case 'get_scheduled': {
        const { data, error } = await supabase
          .from('social_posts')
          .select('*, marketing_campaigns(name)')
          .eq('user_id', userId)
          .eq('status', 'scheduled')
          .order('scheduled_at', { ascending: true });

        if (error) throw error;
        result = data;
        break;
      }

      case 'process_scheduled': {
        // Get all posts scheduled for now or earlier
        const { data: duePosts, error } = await supabase
          .from('social_posts')
          .select('*')
          .eq('status', 'scheduled')
          .lte('scheduled_at', new Date().toISOString());

        if (error) throw error;

        const results = [];
        for (const post of duePosts || []) {
          const { data: postResult } = await supabase.functions.invoke('social-scheduler', {
            body: { action: 'post_now', userId: post.user_id, postId: post.id }
          });
          results.push({ postId: post.id, result: postResult });
        }

        result = { processed: results.length, results };
        break;
      }

      case 'generate_caption': {
        // Use OpenAI to generate platform-specific captions
        const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
        
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { 
                role: "system", 
                content: "You are a social media expert. Generate engaging, platform-appropriate captions. Return JSON with keys for each platform." 
              },
              { 
                role: "user", 
                content: `Generate captions for these platforms: ${postData.platforms.join(', ')}. 
                Topic/Product: ${postData.topic}
                Tone: ${postData.tone || 'professional yet engaging'}
                Include relevant hashtags and emojis where appropriate.`
              }
            ]
          }),
        });

        const aiData = await response.json();
        result = { captions: aiData.choices?.[0]?.message?.content };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Social scheduler error:', errorMessage);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
