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

    // Get user's Printify API key
    const { data: apiKeyData } = await supabase
      .from('user_api_keys')
      .select('encrypted_value, key_name')
      .eq('user_id', userId)
      .in('key_name', ['PRINTIFY_API_KEY', 'PRINTIFY_SHOP_ID']);

    const apiKey = apiKeyData?.find(k => k.key_name === 'PRINTIFY_API_KEY')?.encrypted_value;
    const shopId = apiKeyData?.find(k => k.key_name === 'PRINTIFY_SHOP_ID')?.encrypted_value;

    if (!apiKey) {
      return new Response(JSON.stringify({ 
        error: 'Printify API key not configured',
        requiresKey: true 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = 'https://api.printify.com/v1';
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    let result;
    const startTime = Date.now();

    switch (action) {
      case 'get_shops':
        const shopsRes = await fetch(`${baseUrl}/shops.json`, { headers });
        result = await shopsRes.json();
        break;

      case 'get_products':
        const productsRes = await fetch(`${baseUrl}/shops/${shopId || params.shopId}/products.json`, { headers });
        result = await productsRes.json();
        break;

      case 'get_product':
        const productRes = await fetch(`${baseUrl}/shops/${shopId || params.shopId}/products/${params.productId}.json`, { headers });
        result = await productRes.json();
        break;

      case 'create_product':
        const createRes = await fetch(`${baseUrl}/shops/${shopId || params.shopId}/products.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify(params.product),
        });
        result = await createRes.json();
        break;

      case 'publish_product':
        const publishRes = await fetch(`${baseUrl}/shops/${shopId || params.shopId}/products/${params.productId}/publish.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify(params.publishData || { 
            title: true, 
            description: true, 
            images: true, 
            variants: true, 
            tags: true 
          }),
        });
        result = await publishRes.json();
        break;

      case 'get_orders':
        const ordersRes = await fetch(`${baseUrl}/shops/${shopId || params.shopId}/orders.json`, { headers });
        result = await ordersRes.json();
        break;

      case 'get_blueprints':
        const blueprintsRes = await fetch(`${baseUrl}/catalog/blueprints.json`, { headers });
        result = await blueprintsRes.json();
        break;

      case 'get_blueprint':
        const blueprintRes = await fetch(`${baseUrl}/catalog/blueprints/${params.blueprintId}.json`, { headers });
        result = await blueprintRes.json();
        break;

      case 'get_print_providers':
        const providersRes = await fetch(`${baseUrl}/catalog/blueprints/${params.blueprintId}/print_providers.json`, { headers });
        result = await providersRes.json();
        break;

      case 'upload_image':
        const uploadRes = await fetch(`${baseUrl}/uploads/images.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            file_name: params.fileName,
            url: params.imageUrl,
          }),
        });
        result = await uploadRes.json();
        break;

      case 'get_shipping':
        const shippingRes = await fetch(`${baseUrl}/shops/${shopId || params.shopId}/products/${params.productId}/shipping.json`, { headers });
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
      mcp_server_id: 'mcp-printify',
      action,
      request_payload: params,
      response_payload: result,
      latency_ms: latency,
      success: !result.error,
    });

    console.log(`Printify MCP: ${action} completed in ${latency}ms`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Printify MCP error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
