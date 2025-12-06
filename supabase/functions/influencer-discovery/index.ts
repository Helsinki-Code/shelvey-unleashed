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
    const { action, userId, projectId, params } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let result: unknown;

    switch (action) {
      case 'discover': {
        // Use Perplexity MCP for influencer research
        const { data: perplexityResult } = await supabase.functions.invoke('mcp-perplexity', {
          body: {
            action: 'search',
            userId,
            params: {
              query: `Find ${params.platform || 'Instagram'} influencers in ${params.niche} niche with ${params.followerRange || '10K-100K'} followers who are known for ${params.contentStyle || 'authentic engagement'}`,
              focus: 'web'
            }
          }
        });

        // Parse and structure the results
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        
        const parseResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { 
                role: "system", 
                content: `Extract influencer data from research. Return JSON array with objects containing: name, handle, platform, followerCount (number), engagementRate (decimal), niche, bio (short description).` 
              },
              { 
                role: "user", 
                content: `Extract influencer profiles from this research:\n${JSON.stringify(perplexityResult)}\n\nNiche: ${params.niche}\nPlatform: ${params.platform || 'Instagram'}`
              }
            ]
          }),
        });

        const aiData = await parseResponse.json();
        let influencers = [];
        
        try {
          const content = aiData.choices?.[0]?.message?.content || '[]';
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            influencers = JSON.parse(jsonMatch[0]);
          }
        } catch {
          console.error('Failed to parse influencer data');
        }

        // Save discovered influencers to database
        for (const influencer of influencers) {
          await supabase.from('influencer_contacts').upsert({
            user_id: userId,
            project_id: projectId,
            influencer_name: influencer.name,
            platform: influencer.platform || params.platform || 'Instagram',
            handle: influencer.handle,
            follower_count: influencer.followerCount,
            engagement_rate: influencer.engagementRate,
            niche: influencer.niche || params.niche,
            status: 'discovered',
            metadata: { bio: influencer.bio, source: 'perplexity_discovery' }
          }, { onConflict: 'user_id,project_id,handle' });
        }

        result = { discovered: influencers.length, influencers };

        await supabase.from('agent_activity_logs').insert({
          agent_id: 'influencer-agent',
          agent_name: 'Influencer Outreach Agent',
          action: `Discovered ${influencers.length} influencers in ${params.niche}`,
          status: 'completed',
          metadata: { niche: params.niche, platform: params.platform, count: influencers.length }
        });
        break;
      }

      case 'get_pipeline': {
        const { data, error } = await supabase
          .from('influencer_contacts')
          .select('*')
          .eq('project_id', projectId)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Group by status for pipeline view
        const pipeline = {
          discovered: data?.filter(i => i.status === 'discovered') || [],
          contacted: data?.filter(i => i.status === 'contacted') || [],
          negotiating: data?.filter(i => i.status === 'negotiating') || [],
          contracted: data?.filter(i => i.status === 'contracted') || [],
          active: data?.filter(i => i.status === 'active') || []
        };

        result = pipeline;
        break;
      }

      case 'update_status': {
        const { data, error } = await supabase
          .from('influencer_contacts')
          .update({
            status: params.status,
            last_contacted_at: params.status === 'contacted' ? new Date().toISOString() : undefined,
            contract_value: params.contractValue,
            notes: params.notes
          })
          .eq('id', params.influencerId)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        result = data;

        await supabase.from('agent_activity_logs').insert({
          agent_id: 'influencer-agent',
          agent_name: 'Influencer Outreach Agent',
          action: `Updated ${data.influencer_name} to ${params.status}`,
          status: 'completed',
          metadata: { influencer_id: params.influencerId, new_status: params.status }
        });
        break;
      }

      case 'generate_outreach': {
        // Get influencer details
        const { data: influencer } = await supabase
          .from('influencer_contacts')
          .select('*')
          .eq('id', params.influencerId)
          .single();

        // Get project details for context
        const { data: project } = await supabase
          .from('business_projects')
          .select('*')
          .eq('id', projectId)
          .single();

        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { 
                role: "system", 
                content: "You are an influencer marketing expert. Write personalized, professional outreach messages that feel authentic and not spammy." 
              },
              { 
                role: "user", 
                content: `Write an outreach message for:
                Influencer: ${influencer?.influencer_name} (@${influencer?.handle})
                Platform: ${influencer?.platform}
                Niche: ${influencer?.niche}
                Followers: ${influencer?.follower_count}
                
                Our Brand: ${project?.name}
                Industry: ${project?.industry}
                Description: ${project?.description}
                
                Offer type: ${params.offerType || 'collaboration'}
                Budget range: ${params.budgetRange || 'flexible'}`
              }
            ]
          }),
        });

        const aiData = await response.json();
        result = { message: aiData.choices?.[0]?.message?.content };
        break;
      }

      case 'get_roi_metrics': {
        const { data: influencers } = await supabase
          .from('influencer_contacts')
          .select('*')
          .eq('project_id', projectId)
          .eq('user_id', userId)
          .in('status', ['contracted', 'active']);

        const totalInvestment = influencers?.reduce((sum, i) => sum + (parseFloat(i.contract_value) || 0), 0) || 0;
        const activeInfluencers = influencers?.filter(i => i.status === 'active').length || 0;

        result = {
          totalInfluencers: influencers?.length || 0,
          activeInfluencers,
          totalInvestment,
          avgContractValue: influencers?.length ? totalInvestment / influencers.length : 0
        };
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
    console.error('Influencer discovery error:', errorMessage);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
