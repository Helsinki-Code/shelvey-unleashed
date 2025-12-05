import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tool, arguments: args, credentials } = await req.json();

    const accessToken = credentials?.SHOPIFY_ACCESS_TOKEN;
    const storeUrl = credentials?.SHOPIFY_STORE_URL;

    if (!accessToken || !storeUrl) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Shopify credentials required. Please configure your Shopify API keys in Settings.',
          requiresUserKeys: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const baseUrl = `https://${storeUrl}/admin/api/2024-01`;
    const headers = {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    };

    let result: any;

    switch (tool) {
      case 'get_shop_info': {
        const response = await fetch(`${baseUrl}/shop.json`, { headers });
        result = await response.json();
        break;
      }

      case 'get_products': {
        const limit = args?.limit || 50;
        const response = await fetch(`${baseUrl}/products.json?limit=${limit}`, { headers });
        result = await response.json();
        break;
      }

      case 'create_product': {
        const response = await fetch(`${baseUrl}/products.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            product: {
              title: args.title,
              body_html: args.description,
              vendor: args.vendor,
              product_type: args.product_type,
              variants: args.variants || [{ price: args.price || '0.00' }],
              images: args.images || [],
            }
          }),
        });
        result = await response.json();
        break;
      }

      case 'update_product': {
        const response = await fetch(`${baseUrl}/products/${args.product_id}.json`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ product: args.updates }),
        });
        result = await response.json();
        break;
      }

      case 'get_orders': {
        const status = args?.status || 'any';
        const limit = args?.limit || 50;
        const response = await fetch(`${baseUrl}/orders.json?status=${status}&limit=${limit}`, { headers });
        result = await response.json();
        break;
      }

      case 'create_order': {
        const response = await fetch(`${baseUrl}/orders.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            order: {
              line_items: args.line_items,
              customer: args.customer,
              email: args.email,
              shipping_address: args.shipping_address,
              financial_status: args.financial_status || 'pending',
            }
          }),
        });
        result = await response.json();
        break;
      }

      case 'get_customers': {
        const limit = args?.limit || 50;
        const response = await fetch(`${baseUrl}/customers.json?limit=${limit}`, { headers });
        result = await response.json();
        break;
      }

      case 'update_inventory': {
        const response = await fetch(`${baseUrl}/inventory_levels/set.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            location_id: args.location_id,
            inventory_item_id: args.inventory_item_id,
            available: args.available,
          }),
        });
        result = await response.json();
        break;
      }

      case 'get_collections': {
        const response = await fetch(`${baseUrl}/custom_collections.json`, { headers });
        result = await response.json();
        break;
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown tool: ${tool}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log(`[mcp-shopify] Tool ${tool} executed successfully`);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[mcp-shopify] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
