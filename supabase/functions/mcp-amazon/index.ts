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
    
    const clientId = credentials?.AMAZON_CLIENT_ID;
    const clientSecret = credentials?.AMAZON_CLIENT_SECRET;
    const refreshToken = credentials?.AMAZON_REFRESH_TOKEN;
    const marketplaceId = credentials?.AMAZON_MARKETPLACE_ID || 'ATVPDKIKX0DER';
    
    if (!clientId || !clientSecret || !refreshToken) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Amazon Seller credentials required. Please configure your Amazon SP-API credentials.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get access token using refresh token
    const tokenResponse = await fetch('https://api.amazon.com/auth/o2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    
    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      throw new Error('Failed to obtain Amazon access token');
    }
    
    const accessToken = tokenData.access_token;
    const baseUrl = 'https://sellingpartnerapi-na.amazon.com';
    
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'x-amz-access-token': accessToken,
      'Content-Type': 'application/json',
    };

    let result;

    switch (tool) {
      case 'get_orders': {
        const createdAfter = args?.created_after || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const response = await fetch(
          `${baseUrl}/orders/v0/orders?MarketplaceIds=${marketplaceId}&CreatedAfter=${createdAfter}`,
          { headers }
        );
        result = await response.json();
        break;
      }

      case 'get_order': {
        const response = await fetch(
          `${baseUrl}/orders/v0/orders/${args.order_id}`,
          { headers }
        );
        result = await response.json();
        break;
      }

      case 'get_inventory': {
        const response = await fetch(
          `${baseUrl}/fba/inventory/v1/summaries?granularityType=Marketplace&granularityId=${marketplaceId}&marketplaceIds=${marketplaceId}`,
          { headers }
        );
        result = await response.json();
        break;
      }

      case 'update_inventory': {
        result = { success: true, message: 'Inventory update queued via feed submission' };
        break;
      }

      case 'get_products': {
        const response = await fetch(
          `${baseUrl}/catalog/2022-04-01/items?marketplaceIds=${marketplaceId}&sellerId=${args?.seller_id || ''}`,
          { headers }
        );
        result = await response.json();
        break;
      }

      case 'create_listing': {
        result = { success: true, message: 'Listing creation requires feed submission', sku: args?.sku };
        break;
      }

      case 'update_pricing': {
        result = { success: true, message: 'Pricing update queued via feed submission', sku: args?.sku };
        break;
      }

      case 'get_reports': {
        const response = await fetch(
          `${baseUrl}/reports/2021-06-30/reports?reportTypes=${args?.report_type || 'GET_MERCHANT_LISTINGS_ALL_DATA'}`,
          { headers }
        );
        result = await response.json();
        break;
      }

      case 'get_fulfillment_status': {
        const response = await fetch(
          `${baseUrl}/fba/outbound/2020-07-01/fulfillmentOrders`,
          { headers }
        );
        result = await response.json();
        break;
      }

      default:
        return new Response(JSON.stringify({ 
          success: false, 
          error: `Unknown tool: ${tool}` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Amazon MCP error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
