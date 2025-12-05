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

    const apiKey = credentials?.ETSY_API_KEY;
    const accessToken = credentials?.ETSY_ACCESS_TOKEN;

    if (!apiKey || !accessToken) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Etsy credentials required. Please configure your Etsy API keys in Settings.',
          requiresUserKeys: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const baseUrl = 'https://openapi.etsy.com/v3/application';
    const headers = {
      'x-api-key': apiKey,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    let result: any;

    switch (tool) {
      case 'get_shop': {
        const shopId = args.shop_id;
        const response = await fetch(`${baseUrl}/shops/${shopId}`, { headers });
        result = await response.json();
        break;
      }

      case 'get_listings': {
        const shopId = args.shop_id;
        const limit = args?.limit || 25;
        const state = args?.state || 'active';
        const response = await fetch(
          `${baseUrl}/shops/${shopId}/listings?limit=${limit}&state=${state}`, 
          { headers }
        );
        result = await response.json();
        break;
      }

      case 'create_listing': {
        const shopId = args.shop_id;
        const response = await fetch(`${baseUrl}/shops/${shopId}/listings`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            title: args.title,
            description: args.description,
            price: { amount: Math.round(args.price * 100), divisor: 100, currency_code: args.currency || 'USD' },
            quantity: args.quantity || 1,
            who_made: args.who_made || 'i_did',
            when_made: args.when_made || 'made_to_order',
            taxonomy_id: args.taxonomy_id,
            shipping_profile_id: args.shipping_profile_id,
          }),
        });
        result = await response.json();
        break;
      }

      case 'update_listing': {
        const listingId = args.listing_id;
        const response = await fetch(`${baseUrl}/listings/${listingId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(args.updates),
        });
        result = await response.json();
        break;
      }

      case 'get_orders': {
        const shopId = args.shop_id;
        const limit = args?.limit || 25;
        const response = await fetch(
          `${baseUrl}/shops/${shopId}/receipts?limit=${limit}`, 
          { headers }
        );
        result = await response.json();
        break;
      }

      case 'get_reviews': {
        const shopId = args.shop_id;
        const limit = args?.limit || 25;
        const response = await fetch(
          `${baseUrl}/shops/${shopId}/reviews?limit=${limit}`, 
          { headers }
        );
        result = await response.json();
        break;
      }

      case 'get_shipping_profiles': {
        const shopId = args.shop_id;
        const response = await fetch(`${baseUrl}/shops/${shopId}/shipping-profiles`, { headers });
        result = await response.json();
        break;
      }

      case 'get_shop_sections': {
        const shopId = args.shop_id;
        const response = await fetch(`${baseUrl}/shops/${shopId}/sections`, { headers });
        result = await response.json();
        break;
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown tool: ${tool}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log(`[mcp-etsy] Tool ${tool} executed successfully`);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[mcp-etsy] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
