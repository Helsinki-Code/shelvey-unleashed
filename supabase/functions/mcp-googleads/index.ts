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

    const { data: credData, error: credError } = await supabase.functions.invoke('get-mcp-credentials', {
      body: { userId, mcpServer: 'googleads' }
    });

    if (credError || !credData?.credentials?.GOOGLE_ADS_DEVELOPER_TOKEN) {
      throw new Error('Google Ads credentials not configured');
    }

    const developerToken = credData.credentials.GOOGLE_ADS_DEVELOPER_TOKEN;
    const accessToken = credData.credentials.GOOGLE_ADS_ACCESS_TOKEN;
    const customerId = credData.credentials.GOOGLE_ADS_CUSTOMER_ID;

    const baseUrl = 'https://googleads.googleapis.com/v15';
    let result: unknown;

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': developerToken,
      'Content-Type': 'application/json'
    };

    switch (action) {
      case 'get_campaigns':
        const campaignsQuery = `
          SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
                 metrics.impressions, metrics.clicks, metrics.cost_micros
          FROM campaign
          WHERE campaign.status != 'REMOVED'
          ORDER BY metrics.impressions DESC
          LIMIT ${params?.limit || 20}
        `;
        const campaignsResponse = await fetch(
          `${baseUrl}/customers/${customerId}/googleAds:searchStream`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({ query: campaignsQuery })
          }
        );
        result = await campaignsResponse.json();
        break;

      case 'get_ad_groups':
        const adGroupsQuery = `
          SELECT ad_group.id, ad_group.name, ad_group.status, ad_group.campaign,
                 metrics.impressions, metrics.clicks
          FROM ad_group
          WHERE ad_group.status != 'REMOVED'
          ${params?.campaignId ? `AND campaign.id = ${params.campaignId}` : ''}
          LIMIT ${params?.limit || 50}
        `;
        const adGroupsResponse = await fetch(
          `${baseUrl}/customers/${customerId}/googleAds:searchStream`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({ query: adGroupsQuery })
          }
        );
        result = await adGroupsResponse.json();
        break;

      case 'get_keywords':
        const keywordsQuery = `
          SELECT ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type,
                 metrics.impressions, metrics.clicks, metrics.average_cpc
          FROM keyword_view
          WHERE campaign.id = ${params.campaignId}
          LIMIT ${params?.limit || 100}
        `;
        const keywordsResponse = await fetch(
          `${baseUrl}/customers/${customerId}/googleAds:searchStream`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({ query: keywordsQuery })
          }
        );
        result = await keywordsResponse.json();
        break;

      case 'get_account_performance':
        const perfQuery = `
          SELECT metrics.impressions, metrics.clicks, metrics.cost_micros, 
                 metrics.conversions, metrics.average_cpc, metrics.ctr
          FROM customer
          WHERE segments.date DURING ${params?.dateRange || 'LAST_30_DAYS'}
        `;
        const perfResponse = await fetch(
          `${baseUrl}/customers/${customerId}/googleAds:searchStream`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({ query: perfQuery })
          }
        );
        result = await perfResponse.json();
        break;

      default:
        throw new Error(`Unknown Google Ads action: ${action}`);
    }

    const latency = Date.now() - startTime;

    await supabase.from('agent_mcp_usage').insert({
      agent_id: params?.agentId || 'system',
      mcp_server_id: 'mcp-googleads',
      action,
      request_payload: params,
      response_payload: result,
      success: true,
      latency_ms: latency
    });

    await supabase.rpc('update_mcp_metrics', {
      p_server_id: 'mcp-googleads',
      p_latency_ms: latency,
      p_requests_increment: 1
    });

    return new Response(JSON.stringify({ success: true, data: result, latency_ms: latency }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Google Ads MCP error:', errorMessage);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
