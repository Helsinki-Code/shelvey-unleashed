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

    const storeUrl = credentials?.WOOCOMMERCE_URL;
    const consumerKey = credentials?.WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret = credentials?.WOOCOMMERCE_CONSUMER_SECRET;

    if (!storeUrl || !consumerKey || !consumerSecret) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'WooCommerce credentials required. Please configure your WooCommerce API keys in Settings.',
          requiresUserKeys: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const baseUrl = `${storeUrl}/wp-json/wc/v3`;
    const auth = btoa(`${consumerKey}:${consumerSecret}`);
    const headers = {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    };

    let result: any;

    switch (tool) {
      case 'get_products': {
        const perPage = args?.per_page || 20;
        const page = args?.page || 1;
        const response = await fetch(`${baseUrl}/products?per_page=${perPage}&page=${page}`, { headers });
        result = await response.json();
        break;
      }

      case 'create_product': {
        const response = await fetch(`${baseUrl}/products`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: args.name,
            type: args.type || 'simple',
            regular_price: String(args.price),
            description: args.description,
            short_description: args.short_description,
            categories: args.categories || [],
            images: args.images || [],
            manage_stock: args.manage_stock || false,
            stock_quantity: args.stock_quantity,
          }),
        });
        result = await response.json();
        break;
      }

      case 'update_product': {
        const response = await fetch(`${baseUrl}/products/${args.product_id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(args.updates),
        });
        result = await response.json();
        break;
      }

      case 'get_orders': {
        const perPage = args?.per_page || 20;
        const status = args?.status || 'any';
        const response = await fetch(`${baseUrl}/orders?per_page=${perPage}&status=${status}`, { headers });
        result = await response.json();
        break;
      }

      case 'update_order': {
        const response = await fetch(`${baseUrl}/orders/${args.order_id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(args.updates),
        });
        result = await response.json();
        break;
      }

      case 'get_customers': {
        const perPage = args?.per_page || 20;
        const response = await fetch(`${baseUrl}/customers?per_page=${perPage}`, { headers });
        result = await response.json();
        break;
      }

      case 'get_categories': {
        const response = await fetch(`${baseUrl}/products/categories`, { headers });
        result = await response.json();
        break;
      }

      case 'get_coupons': {
        const response = await fetch(`${baseUrl}/coupons`, { headers });
        result = await response.json();
        break;
      }

      case 'create_coupon': {
        const response = await fetch(`${baseUrl}/coupons`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            code: args.code,
            discount_type: args.discount_type || 'percent',
            amount: String(args.amount),
            description: args.description,
            date_expires: args.date_expires,
            usage_limit: args.usage_limit,
          }),
        });
        result = await response.json();
        break;
      }

      case 'get_reports': {
        const period = args?.period || 'week';
        const response = await fetch(`${baseUrl}/reports/sales?period=${period}`, { headers });
        result = await response.json();
        break;
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown tool: ${tool}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log(`[mcp-woocommerce] Tool ${tool} executed successfully`);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[mcp-woocommerce] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
