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

    // Get credentials
    const { data: credData, error: credError } = await supabase.functions.invoke('get-mcp-credentials', {
      body: { userId, mcpServer: 'whatsapp' }
    });

    if (credError || !credData?.credentials?.WHATSAPP_TOKEN) {
      throw new Error('WhatsApp credentials not configured');
    }

    const token = credData.credentials.WHATSAPP_TOKEN;
    const phoneNumberId = credData.credentials.WHATSAPP_PHONE_NUMBER_ID;
    let result: unknown;

    switch (action) {
      case 'send_message':
        const sendResponse = await fetch(
          `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: params.to,
              type: 'text',
              text: { body: params.message }
            })
          }
        );
        result = await sendResponse.json();
        break;

      case 'send_template':
        const templateResponse = await fetch(
          `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: params.to,
              type: 'template',
              template: {
                name: params.templateName,
                language: { code: params.language || 'en_US' },
                components: params.components || []
              }
            })
          }
        );
        result = await templateResponse.json();
        break;

      case 'get_media':
        const mediaResponse = await fetch(
          `https://graph.facebook.com/v18.0/${params.mediaId}`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );
        result = await mediaResponse.json();
        break;

      case 'get_templates':
        const businessId = credData.credentials.WHATSAPP_BUSINESS_ID;
        const templatesResponse = await fetch(
          `https://graph.facebook.com/v18.0/${businessId}/message_templates`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );
        result = await templatesResponse.json();
        break;

      default:
        throw new Error(`Unknown WhatsApp action: ${action}`);
    }

    const latency = Date.now() - startTime;

    await supabase.from('agent_mcp_usage').insert({
      agent_id: params?.agentId || 'system',
      mcp_server_id: 'mcp-whatsapp',
      action,
      request_payload: params,
      response_payload: result,
      success: true,
      latency_ms: latency
    });

    await supabase.rpc('update_mcp_metrics', {
      p_server_id: 'mcp-whatsapp',
      p_latency_ms: latency,
      p_requests_increment: 1
    });

    return new Response(JSON.stringify({ success: true, data: result, latency_ms: latency }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('WhatsApp MCP error:', errorMessage);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
