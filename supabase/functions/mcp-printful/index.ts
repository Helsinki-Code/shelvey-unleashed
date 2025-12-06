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
    const { action, userId, params } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's Printful API key
    const { data: apiKeyData } = await supabase
      .from('user_api_keys')
      .select('encrypted_value')
      .eq('user_id', userId)
      .eq('key_name', 'PRINTFUL_API_KEY')
      .single();

    if (!apiKeyData?.encrypted_value) {
      return new Response(JSON.stringify({ 
        error: 'Printful API key not configured',
        requiresKey: true 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = apiKeyData.encrypted_value;
    const baseUrl = 'https://api.printful.com';
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    let result;
    const startTime = Date.now();

    switch (action) {
      case 'get_store_info':
        const storeRes = await fetch(`${baseUrl}/stores`, { headers });
        result = await storeRes.json();
        break;

      case 'get_products':
        const productsRes = await fetch(`${baseUrl}/store/products`, { headers });
        result = await productsRes.json();
        break;

      case 'get_product':
        const productRes = await fetch(`${baseUrl}/store/products/${params.productId}`, { headers });
        result = await productRes.json();
        break;

      case 'create_product':
        const createRes = await fetch(`${baseUrl}/store/products`, {
          method: 'POST',
          headers,
          body: JSON.stringify(params.product),
        });
        result = await createRes.json();
        break;

      case 'get_orders':
        const ordersRes = await fetch(`${baseUrl}/orders`, { headers });
        result = await ordersRes.json();
        break;

      case 'get_order':
        const orderRes = await fetch(`${baseUrl}/orders/${params.orderId}`, { headers });
        result = await orderRes.json();
        break;

      case 'create_order':
        const orderCreateRes = await fetch(`${baseUrl}/orders`, {
          method: 'POST',
          headers,
          body: JSON.stringify(params.order),
        });
        result = await orderCreateRes.json();
        break;

      case 'confirm_order':
        const confirmRes = await fetch(`${baseUrl}/orders/${params.orderId}/confirm`, {
          method: 'POST',
          headers,
        });
        result = await confirmRes.json();
        break;

      case 'get_catalog':
        const catalogRes = await fetch(`${baseUrl}/products`, { headers });
        result = await catalogRes.json();
        break;

      case 'get_mockup_templates':
        const mockupRes = await fetch(`${baseUrl}/mockup-generator/templates/${params.productId}`, { headers });
        result = await mockupRes.json();
        break;

      case 'generate_mockup':
        const mockupGenRes = await fetch(`${baseUrl}/mockup-generator/create-task/${params.productId}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(params.mockupData),
        });
        result = await mockupGenRes.json();
        break;

      case 'get_shipping_rates':
        const shippingRes = await fetch(`${baseUrl}/shipping/rates`, {
          method: 'POST',
          headers,
          body: JSON.stringify(params.shippingData),
        });
        result = await shippingRes.json();
        break;

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const latency = Date.now() - startTime;

    // Log MCP usage
    await supabase.from('agent_mcp_usage').insert({
      agent_id: 'store-automation-agent',
      mcp_server_id: 'mcp-printful',
      action,
      request_payload: params,
      response_payload: result,
      latency_ms: latency,
      success: !result.error,
    });

    console.log(`Printful MCP: ${action} completed in ${latency}ms`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Printful MCP error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
