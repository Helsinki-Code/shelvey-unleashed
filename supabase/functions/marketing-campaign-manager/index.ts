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
    const { action, userId, projectId, campaignData } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let result: unknown;

    switch (action) {
      case 'create_campaign': {
        const { data, error } = await supabase
          .from('marketing_campaigns')
          .insert({
            user_id: userId,
            project_id: projectId,
            name: campaignData.name,
            campaign_type: campaignData.type,
            budget: campaignData.budget,
            target_platforms: campaignData.platforms,
            start_date: campaignData.startDate,
            end_date: campaignData.endDate,
            settings: campaignData.settings || {}
          })
          .select()
          .single();

        if (error) throw error;
        result = data;

        // Log activity
        await supabase.from('agent_activity_logs').insert({
          agent_id: 'marketing-manager',
          agent_name: 'Head of Marketing',
          action: `Created ${campaignData.type} campaign: ${campaignData.name}`,
          status: 'completed',
          metadata: { campaign_id: data.id, type: campaignData.type }
        });
        break;
      }

      case 'update_campaign': {
        const { data, error } = await supabase
          .from('marketing_campaigns')
          .update({
            ...campaignData,
            updated_at: new Date().toISOString()
          })
          .eq('id', campaignData.id)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        result = data;
        break;
      }

      case 'get_campaigns': {
        const { data, error } = await supabase
          .from('marketing_campaigns')
          .select('*')
          .eq('project_id', projectId)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        result = data;
        break;
      }

      case 'launch_campaign': {
        // Update campaign status to active
        const { data: campaign, error: updateError } = await supabase
          .from('marketing_campaigns')
          .update({ status: 'active', start_date: new Date().toISOString() })
          .eq('id', campaignData.id)
          .eq('user_id', userId)
          .select()
          .single();

        if (updateError) throw updateError;

        // Schedule all pending posts for this campaign
        const { data: posts } = await supabase
          .from('social_posts')
          .select('*')
          .eq('campaign_id', campaignData.id)
          .eq('status', 'scheduled');

        // Trigger posting via MCPs
        for (const post of posts || []) {
          await supabase.functions.invoke('social-scheduler', {
            body: { action: 'post_now', userId, postId: post.id }
          });
        }

        result = { campaign, postsLaunched: posts?.length || 0 };

        await supabase.from('agent_activity_logs').insert({
          agent_id: 'marketing-manager',
          agent_name: 'Head of Marketing',
          action: `Launched campaign: ${campaign.name}`,
          status: 'completed',
          metadata: { campaign_id: campaign.id, posts_count: posts?.length || 0 }
        });
        break;
      }

      case 'get_analytics': {
        // Aggregate metrics from all campaigns
        const { data: campaigns } = await supabase
          .from('marketing_campaigns')
          .select('*')
          .eq('project_id', projectId)
          .eq('user_id', userId);

        const { data: posts } = await supabase
          .from('social_posts')
          .select('*, marketing_campaigns!inner(project_id)')
          .eq('marketing_campaigns.project_id', projectId)
          .eq('user_id', userId);

        const totalSpent = campaigns?.reduce((sum, c) => sum + (parseFloat(c.spent) || 0), 0) || 0;
        const totalBudget = campaigns?.reduce((sum, c) => sum + (parseFloat(c.budget) || 0), 0) || 0;
        const activeCampaigns = campaigns?.filter(c => c.status === 'active').length || 0;
        const publishedPosts = posts?.filter(p => p.status === 'posted').length || 0;

        result = {
          totalCampaigns: campaigns?.length || 0,
          activeCampaigns,
          totalBudget,
          totalSpent,
          remainingBudget: totalBudget - totalSpent,
          totalPosts: posts?.length || 0,
          publishedPosts,
          scheduledPosts: posts?.filter(p => p.status === 'scheduled').length || 0
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
    console.error('Marketing campaign manager error:', errorMessage);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
