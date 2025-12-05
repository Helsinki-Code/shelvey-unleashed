import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to create HMAC signature for Binance API
async function createSignature(queryString: string, secretKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(queryString));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tool, arguments: args, credentials } = await req.json();

    const apiKey = credentials?.BINANCE_API_KEY;
    const secretKey = credentials?.BINANCE_SECRET_KEY;
    const isTestnet = credentials?.BINANCE_TESTNET === 'true';

    if (!apiKey || !secretKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Binance credentials required. Please configure your Binance API keys in Settings.',
          requiresUserKeys: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const baseUrl = isTestnet 
      ? 'https://testnet.binance.vision/api/v3'
      : 'https://api.binance.com/api/v3';

    const headers = {
      'X-MBX-APIKEY': apiKey,
      'Content-Type': 'application/json',
    };

    let result: any;

    switch (tool) {
      case 'get_account': {
        const timestamp = Date.now();
        const queryString = `timestamp=${timestamp}`;
        const signature = await createSignature(queryString, secretKey);
        const response = await fetch(
          `${baseUrl}/account?${queryString}&signature=${signature}`, 
          { headers }
        );
        result = await response.json();
        break;
      }

      case 'get_ticker_price': {
        const symbol = args?.symbol?.toUpperCase();
        const url = symbol 
          ? `${baseUrl}/ticker/price?symbol=${symbol}`
          : `${baseUrl}/ticker/price`;
        const response = await fetch(url);
        result = await response.json();
        break;
      }

      case 'get_ticker_24hr': {
        const symbol = args?.symbol?.toUpperCase();
        const url = symbol 
          ? `${baseUrl}/ticker/24hr?symbol=${symbol}`
          : `${baseUrl}/ticker/24hr`;
        const response = await fetch(url);
        result = await response.json();
        break;
      }

      case 'get_klines': {
        const symbol = args.symbol.toUpperCase();
        const interval = args.interval || '1h'; // 1m, 5m, 15m, 1h, 4h, 1d, etc.
        const limit = args.limit || 100;
        const response = await fetch(
          `${baseUrl}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
        );
        result = await response.json();
        break;
      }

      case 'place_order': {
        const timestamp = Date.now();
        const params = new URLSearchParams({
          symbol: args.symbol.toUpperCase(),
          side: args.side.toUpperCase(), // 'BUY' or 'SELL'
          type: args.type?.toUpperCase() || 'MARKET', // 'MARKET', 'LIMIT', 'STOP_LOSS', etc.
          timestamp: String(timestamp),
        });
        
        if (args.quantity) params.append('quantity', String(args.quantity));
        if (args.quoteOrderQty) params.append('quoteOrderQty', String(args.quoteOrderQty));
        if (args.price) params.append('price', String(args.price));
        if (args.timeInForce) params.append('timeInForce', args.timeInForce);
        if (args.stopPrice) params.append('stopPrice', String(args.stopPrice));
        
        const queryString = params.toString();
        const signature = await createSignature(queryString, secretKey);
        
        const response = await fetch(`${baseUrl}/order?${queryString}&signature=${signature}`, {
          method: 'POST',
          headers,
        });
        result = await response.json();
        break;
      }

      case 'cancel_order': {
        const timestamp = Date.now();
        const params = new URLSearchParams({
          symbol: args.symbol.toUpperCase(),
          timestamp: String(timestamp),
        });
        if (args.orderId) params.append('orderId', String(args.orderId));
        if (args.origClientOrderId) params.append('origClientOrderId', args.origClientOrderId);
        
        const queryString = params.toString();
        const signature = await createSignature(queryString, secretKey);
        
        const response = await fetch(`${baseUrl}/order?${queryString}&signature=${signature}`, {
          method: 'DELETE',
          headers,
        });
        result = await response.json();
        break;
      }

      case 'get_open_orders': {
        const timestamp = Date.now();
        const params = new URLSearchParams({ timestamp: String(timestamp) });
        if (args?.symbol) params.append('symbol', args.symbol.toUpperCase());
        
        const queryString = params.toString();
        const signature = await createSignature(queryString, secretKey);
        
        const response = await fetch(
          `${baseUrl}/openOrders?${queryString}&signature=${signature}`, 
          { headers }
        );
        result = await response.json();
        break;
      }

      case 'get_all_orders': {
        const timestamp = Date.now();
        const params = new URLSearchParams({
          symbol: args.symbol.toUpperCase(),
          timestamp: String(timestamp),
        });
        if (args?.limit) params.append('limit', String(args.limit));
        
        const queryString = params.toString();
        const signature = await createSignature(queryString, secretKey);
        
        const response = await fetch(
          `${baseUrl}/allOrders?${queryString}&signature=${signature}`, 
          { headers }
        );
        result = await response.json();
        break;
      }

      case 'get_my_trades': {
        const timestamp = Date.now();
        const params = new URLSearchParams({
          symbol: args.symbol.toUpperCase(),
          timestamp: String(timestamp),
        });
        if (args?.limit) params.append('limit', String(args.limit));
        
        const queryString = params.toString();
        const signature = await createSignature(queryString, secretKey);
        
        const response = await fetch(
          `${baseUrl}/myTrades?${queryString}&signature=${signature}`, 
          { headers }
        );
        result = await response.json();
        break;
      }

      case 'get_exchange_info': {
        const symbol = args?.symbol?.toUpperCase();
        const url = symbol 
          ? `${baseUrl}/exchangeInfo?symbol=${symbol}`
          : `${baseUrl}/exchangeInfo`;
        const response = await fetch(url);
        result = await response.json();
        break;
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown tool: ${tool}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log(`[mcp-binance] Tool ${tool} executed successfully (${isTestnet ? 'testnet' : 'mainnet'})`);

    return new Response(
      JSON.stringify({ success: true, data: result, mode: isTestnet ? 'testnet' : 'mainnet' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[mcp-binance] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
