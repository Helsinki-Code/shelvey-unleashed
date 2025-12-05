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
      body: { userId, mcpServer: 'canva' }
    });

    if (credError || !credData?.credentials?.CANVA_API_KEY) {
      throw new Error('Canva credentials not configured');
    }

    const apiKey = credData.credentials.CANVA_API_KEY;
    const baseUrl = 'https://api.canva.com/rest/v1';
    let result: unknown;

    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    switch (action) {
      case 'list_designs':
        const designsResponse = await fetch(
          `${baseUrl}/designs?limit=${params?.limit || 20}`,
          { headers }
        );
        result = await designsResponse.json();
        break;

      case 'get_design':
        const designResponse = await fetch(
          `${baseUrl}/designs/${params.designId}`,
          { headers }
        );
        result = await designResponse.json();
        break;

      case 'create_design':
        const createResponse = await fetch(
          `${baseUrl}/designs`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              design_type: params.designType || 'doc',
              title: params.title
            })
          }
        );
        result = await createResponse.json();
        break;

      case 'export_design':
        const exportResponse = await fetch(
          `${baseUrl}/designs/${params.designId}/exports`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              format: params.format || 'png',
              quality: params.quality || 'regular'
            })
          }
        );
        result = await exportResponse.json();
        break;

      case 'list_templates':
        const templatesResponse = await fetch(
          `${baseUrl}/brand-templates?limit=${params?.limit || 20}`,
          { headers }
        );
        result = await templatesResponse.json();
        break;

      case 'get_user_profile':
        const profileResponse = await fetch(
          `${baseUrl}/users/me`,
          { headers }
        );
        result = await profileResponse.json();
        break;

      default:
        throw new Error(`Unknown Canva action: ${action}`);
    }

    const latency = Date.now() - startTime;

    await supabase.from('agent_mcp_usage').insert({
      agent_id: params?.agentId || 'system',
      mcp_server_id: 'mcp-canva',
      action,
      request_payload: params,
      response_payload: result,
      success: true,
      latency_ms: latency
    });

    await supabase.rpc('update_mcp_metrics', {
      p_server_id: 'mcp-canva',
      p_latency_ms: latency,
      p_requests_increment: 1
    });

    return new Response(JSON.stringify({ success: true, data: result, latency_ms: latency }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Canva MCP error:', errorMessage);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
