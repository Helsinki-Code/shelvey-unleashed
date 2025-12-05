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

    const apiKey = credentials?.ALPACA_API_KEY;
    const secretKey = credentials?.ALPACA_SECRET_KEY;
    const isPaper = credentials?.ALPACA_PAPER !== 'false';

    if (!apiKey || !secretKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Alpaca credentials required. Please configure your Alpaca API keys in Settings.',
          requiresUserKeys: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const baseUrl = isPaper 
      ? 'https://paper-api.alpaca.markets/v2'
      : 'https://api.alpaca.markets/v2';
    const dataUrl = 'https://data.alpaca.markets/v2';
    
    const headers = {
      'APCA-API-KEY-ID': apiKey,
      'APCA-API-SECRET-KEY': secretKey,
      'Content-Type': 'application/json',
    };

    let result: any;

    switch (tool) {
      case 'get_account': {
        const response = await fetch(`${baseUrl}/account`, { headers });
        result = await response.json();
        break;
      }

      case 'get_positions': {
        const response = await fetch(`${baseUrl}/positions`, { headers });
        result = await response.json();
        break;
      }

      case 'get_position': {
        const symbol = args.symbol.toUpperCase();
        const response = await fetch(`${baseUrl}/positions/${symbol}`, { headers });
        result = await response.json();
        break;
      }

      case 'get_orders': {
        const status = args?.status || 'open';
        const limit = args?.limit || 50;
        const response = await fetch(`${baseUrl}/orders?status=${status}&limit=${limit}`, { headers });
        result = await response.json();
        break;
      }

      case 'place_order': {
        const response = await fetch(`${baseUrl}/orders`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            symbol: args.symbol.toUpperCase(),
            qty: args.qty,
            side: args.side, // 'buy' or 'sell'
            type: args.type || 'market', // 'market', 'limit', 'stop', 'stop_limit'
            time_in_force: args.time_in_force || 'day', // 'day', 'gtc', 'ioc', 'fok'
            limit_price: args.limit_price,
            stop_price: args.stop_price,
            extended_hours: args.extended_hours || false,
          }),
        });
        result = await response.json();
        break;
      }

      case 'cancel_order': {
        const response = await fetch(`${baseUrl}/orders/${args.order_id}`, {
          method: 'DELETE',
          headers,
        });
        if (response.status === 204) {
          result = { success: true, message: 'Order cancelled' };
        } else {
          result = await response.json();
        }
        break;
      }

      case 'cancel_all_orders': {
        const response = await fetch(`${baseUrl}/orders`, {
          method: 'DELETE',
          headers,
        });
        result = await response.json();
        break;
      }

      case 'get_market_data': {
        const symbol = args.symbol.toUpperCase();
        const response = await fetch(`${dataUrl}/stocks/${symbol}/quotes/latest`, { headers });
        result = await response.json();
        break;
      }

      case 'get_bars': {
        const symbol = args.symbol.toUpperCase();
        const timeframe = args.timeframe || '1Day';
        const limit = args.limit || 100;
        const response = await fetch(
          `${dataUrl}/stocks/${symbol}/bars?timeframe=${timeframe}&limit=${limit}`, 
          { headers }
        );
        result = await response.json();
        break;
      }

      case 'get_portfolio_history': {
        const period = args?.period || '1M';
        const timeframe = args?.timeframe || '1D';
        const response = await fetch(
          `${baseUrl}/account/portfolio/history?period=${period}&timeframe=${timeframe}`, 
          { headers }
        );
        result = await response.json();
        break;
      }

      case 'get_watchlists': {
        const response = await fetch(`${baseUrl}/watchlists`, { headers });
        result = await response.json();
        break;
      }

      case 'get_assets': {
        const status = args?.status || 'active';
        const assetClass = args?.asset_class || 'us_equity';
        const response = await fetch(
          `${baseUrl}/assets?status=${status}&asset_class=${assetClass}`, 
          { headers }
        );
        result = await response.json();
        break;
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown tool: ${tool}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log(`[mcp-alpaca] Tool ${tool} executed successfully (${isPaper ? 'paper' : 'live'} trading)`);

    return new Response(
      JSON.stringify({ success: true, data: result, mode: isPaper ? 'paper' : 'live' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[mcp-alpaca] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
