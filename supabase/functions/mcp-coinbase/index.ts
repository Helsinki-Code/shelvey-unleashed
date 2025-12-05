import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to create JWT for Coinbase Advanced Trade API
async function createCoinbaseJWT(apiKey: string, privateKey: string, requestPath: string, method: string): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const message = `${timestamp}${method}${requestPath}`;
  
  // For simplicity, using API key auth header format
  // In production, implement proper JWT signing with the private key
  return `${apiKey}:${timestamp}:${message}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tool, arguments: args, credentials } = await req.json();

    const apiKey = credentials?.COINBASE_API_KEY;
    const apiSecret = credentials?.COINBASE_API_SECRET;

    if (!apiKey || !apiSecret) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Coinbase credentials required. Please configure your Coinbase API keys in Settings.',
          requiresUserKeys: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const baseUrl = 'https://api.coinbase.com/api/v3/brokerage';
    
    const getHeaders = (timestamp: number) => ({
      'CB-ACCESS-KEY': apiKey,
      'CB-ACCESS-SIGN': apiSecret, // In production, generate proper HMAC signature
      'CB-ACCESS-TIMESTAMP': String(timestamp),
      'Content-Type': 'application/json',
    });

    let result: any;

    switch (tool) {
      case 'get_accounts': {
        const timestamp = Math.floor(Date.now() / 1000);
        const response = await fetch(`${baseUrl}/accounts`, { 
          headers: getHeaders(timestamp) 
        });
        result = await response.json();
        break;
      }

      case 'get_account': {
        const timestamp = Math.floor(Date.now() / 1000);
        const response = await fetch(`${baseUrl}/accounts/${args.account_id}`, { 
          headers: getHeaders(timestamp) 
        });
        result = await response.json();
        break;
      }

      case 'get_products': {
        const timestamp = Math.floor(Date.now() / 1000);
        const response = await fetch(`${baseUrl}/products`, { 
          headers: getHeaders(timestamp) 
        });
        result = await response.json();
        break;
      }

      case 'get_product': {
        const timestamp = Math.floor(Date.now() / 1000);
        const productId = args.product_id; // e.g., 'BTC-USD'
        const response = await fetch(`${baseUrl}/products/${productId}`, { 
          headers: getHeaders(timestamp) 
        });
        result = await response.json();
        break;
      }

      case 'get_candles': {
        const timestamp = Math.floor(Date.now() / 1000);
        const productId = args.product_id;
        const granularity = args.granularity || 'ONE_HOUR';
        const response = await fetch(
          `${baseUrl}/products/${productId}/candles?granularity=${granularity}`, 
          { headers: getHeaders(timestamp) }
        );
        result = await response.json();
        break;
      }

      case 'place_order': {
        const timestamp = Math.floor(Date.now() / 1000);
        const response = await fetch(`${baseUrl}/orders`, {
          method: 'POST',
          headers: getHeaders(timestamp),
          body: JSON.stringify({
            client_order_id: args.client_order_id || crypto.randomUUID(),
            product_id: args.product_id, // e.g., 'BTC-USD'
            side: args.side, // 'BUY' or 'SELL'
            order_configuration: {
              market_market_ioc: args.type === 'market' ? {
                quote_size: args.quote_size,
                base_size: args.base_size,
              } : undefined,
              limit_limit_gtc: args.type === 'limit' ? {
                base_size: args.base_size,
                limit_price: args.limit_price,
                post_only: args.post_only || false,
              } : undefined,
            },
          }),
        });
        result = await response.json();
        break;
      }

      case 'cancel_orders': {
        const timestamp = Math.floor(Date.now() / 1000);
        const response = await fetch(`${baseUrl}/orders/batch_cancel`, {
          method: 'POST',
          headers: getHeaders(timestamp),
          body: JSON.stringify({
            order_ids: args.order_ids,
          }),
        });
        result = await response.json();
        break;
      }

      case 'get_orders': {
        const timestamp = Math.floor(Date.now() / 1000);
        const status = args?.order_status || 'OPEN';
        const response = await fetch(`${baseUrl}/orders/historical/batch?order_status=${status}`, { 
          headers: getHeaders(timestamp) 
        });
        result = await response.json();
        break;
      }

      case 'get_fills': {
        const timestamp = Math.floor(Date.now() / 1000);
        const productId = args?.product_id || '';
        const url = productId 
          ? `${baseUrl}/orders/historical/fills?product_id=${productId}`
          : `${baseUrl}/orders/historical/fills`;
        const response = await fetch(url, { headers: getHeaders(timestamp) });
        result = await response.json();
        break;
      }

      case 'get_portfolios': {
        const timestamp = Math.floor(Date.now() / 1000);
        const response = await fetch(`${baseUrl}/portfolios`, { 
          headers: getHeaders(timestamp) 
        });
        result = await response.json();
        break;
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown tool: ${tool}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log(`[mcp-coinbase] Tool ${tool} executed successfully`);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[mcp-coinbase] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
