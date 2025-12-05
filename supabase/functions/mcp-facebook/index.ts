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

  const startTime = Date.now();

  try {
    const { action, userId, params } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get credentials via the routing function
    const { data: credData, error: credError } = await supabase.functions.invoke('get-mcp-credentials', {
      body: { userId, mcpServer: 'facebook' }
    });

    if (credError || !credData?.credentials?.FACEBOOK_ACCESS_TOKEN) {
      throw new Error('Facebook credentials not configured');
    }

    const accessToken = credData.credentials.FACEBOOK_ACCESS_TOKEN;
    const pageId = credData.credentials.FACEBOOK_PAGE_ID;
    let result: unknown;

    switch (action) {
      case 'get_page_info':
        const pageResponse = await fetch(
          `https://graph.facebook.com/v18.0/${pageId}?fields=name,about,fan_count,followers_count&access_token=${accessToken}`
        );
        result = await pageResponse.json();
        break;

      case 'get_posts':
        const postsResponse = await fetch(
          `https://graph.facebook.com/v18.0/${pageId}/posts?fields=message,created_time,likes.summary(true),comments.summary(true)&limit=${params?.limit || 10}&access_token=${accessToken}`
        );
        result = await postsResponse.json();
        break;

      case 'create_post':
        const createResponse = await fetch(
          `https://graph.facebook.com/v18.0/${pageId}/feed`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: params.message,
              access_token: accessToken
            })
          }
        );
        result = await createResponse.json();
        break;

      case 'get_insights':
        const insightsResponse = await fetch(
          `https://graph.facebook.com/v18.0/${pageId}/insights?metric=page_impressions,page_engaged_users,page_fans&period=day&access_token=${accessToken}`
        );
        result = await insightsResponse.json();
        break;

      default:
        throw new Error(`Unknown Facebook action: ${action}`);
    }

    const latency = Date.now() - startTime;

    // Log MCP usage
    await supabase.from('agent_mcp_usage').insert({
      agent_id: params?.agentId || 'system',
      mcp_server_id: 'mcp-facebook',
      action,
      request_payload: params,
      response_payload: result,
      success: true,
      latency_ms: latency
    });

    // Update metrics
    await supabase.rpc('update_mcp_metrics', {
      p_server_id: 'mcp-facebook',
      p_latency_ms: latency,
      p_requests_increment: 1
    });

    return new Response(JSON.stringify({ success: true, data: result, latency_ms: latency }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Facebook MCP error:', errorMessage);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
