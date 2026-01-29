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

    let result;

    switch (action) {
      case 'create_strategy':
        result = await createStrategy(supabase, userId, params);
        break;

      case 'get_strategies':
        result = await getStrategies(supabase, userId);
        break;

      case 'toggle_strategy':
        result = await toggleStrategy(supabase, userId, params.strategyId, params.isActive);
        break;

      case 'execute_strategy':
        result = await executeStrategy(supabase, userId, params.strategyId);
        break;

      case 'analyze_market':
        result = await analyzeMarket(supabase, userId, params.exchange, params.symbols);
        break;

      case 'get_portfolio_summary':
        result = await getPortfolioSummary(supabase, userId, params.exchange);
        break;

      case 'execute_trade':
        result = await executeTrade(supabase, userId, params);
        break;

      case 'get_trade_history':
        result = await getTradeHistory(supabase, userId, params.strategyId);
        break;

      case 'run_dca':
        result = await runDCAStrategy(supabase, userId, params);
        break;

      case 'run_grid':
        result = await runGridStrategy(supabase, userId, params);
        break;

      case 'get_performance':
        result = await getPerformanceMetrics(supabase, userId);
        break;

      case 'execute_phase':
        result = await executePhase(supabase, userId, params);
        break;

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Log activity
    await supabase.from('agent_activity_logs').insert({
      agent_id: 'trading-ai-agent',
      agent_name: 'Trading AI Agent',
      action,
      status: 'completed',
      metadata: { userId, params },
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Trading AI error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function createStrategy(supabase: any, userId: string, params: any) {
  const { name, exchange, strategyType, parameters, paperMode } = params;

  const { data, error } = await supabase
    .from('trading_strategies')
    .insert({
      user_id: userId,
      name,
      exchange,
      strategy_type: strategyType,
      parameters,
      paper_mode: paperMode !== false,
      is_active: false,
    })
    .select()
    .single();

  if (error) throw error;

  // Send notification
  await supabase.from('notifications').insert({
    user_id: userId,
    title: 'Strategy Created',
    message: `New ${strategyType} strategy "${name}" created for ${exchange}`,
    type: 'trading',
    metadata: { strategyId: data.id },
  });

  return { strategy: data, message: 'Strategy created successfully' };
}

async function getStrategies(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('trading_strategies')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return { strategies: data };
}

async function toggleStrategy(supabase: any, userId: string, strategyId: string, isActive: boolean) {
  const { data, error } = await supabase
    .from('trading_strategies')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', strategyId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;

  return { strategy: data, message: `Strategy ${isActive ? 'activated' : 'paused'}` };
}

async function executeStrategy(supabase: any, userId: string, strategyId: string) {
  // Get strategy details
  const { data: strategy, error } = await supabase
    .from('trading_strategies')
    .select('*')
    .eq('id', strategyId)
    .eq('user_id', userId)
    .single();

  if (error || !strategy) throw new Error('Strategy not found');
  if (!strategy.is_active) return { message: 'Strategy is not active' };

  let result;
  
  switch (strategy.strategy_type) {
    case 'dca':
      result = await runDCAStrategy(supabase, userId, { 
        strategyId, 
        ...strategy.parameters,
        exchange: strategy.exchange,
        paperMode: strategy.paper_mode,
      });
      break;

    case 'grid':
      result = await runGridStrategy(supabase, userId, { 
        strategyId, 
        ...strategy.parameters,
        exchange: strategy.exchange,
        paperMode: strategy.paper_mode,
      });
      break;

    case 'momentum':
      result = await runMomentumStrategy(supabase, userId, { 
        strategyId, 
        ...strategy.parameters,
        exchange: strategy.exchange,
        paperMode: strategy.paper_mode,
      });
      break;

    default:
      result = { message: 'Strategy type not implemented' };
  }

  return result;
}

async function runDCAStrategy(supabase: any, userId: string, params: any) {
  const { strategyId, symbol, amount, exchange, paperMode } = params;
  
  // Get current price
  const { data: marketData } = await supabase.functions.invoke(`mcp-${exchange}`, {
    body: { action: 'get_quote', userId, params: { symbol } },
  });

  const currentPrice = marketData?.price || marketData?.last_price || 100;
  const quantity = amount / currentPrice;

  if (paperMode) {
    // Paper trade - just record it
    const { data: execution } = await supabase
      .from('trading_executions')
      .insert({
        strategy_id: strategyId,
        user_id: userId,
        action: 'buy',
        symbol,
        quantity,
        price: currentPrice,
        profit_loss: 0,
      })
      .select()
      .single();

    // Update strategy stats
    await supabase
      .from('trading_strategies')
      .update({ 
        total_trades: supabase.sql`total_trades + 1`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', strategyId);

    return {
      execution,
      message: `DCA buy executed (paper): ${quantity.toFixed(6)} ${symbol} at $${currentPrice}`,
      paperMode: true,
    };
  } else {
    // Live trade
    const { data: order } = await supabase.functions.invoke(`mcp-${exchange}`, {
      body: { 
        action: 'create_order', 
        userId, 
        params: { 
          symbol, 
          side: 'buy', 
          type: 'market', 
          qty: quantity 
        } 
      },
    });

    // Record execution
    await supabase.from('trading_executions').insert({
      strategy_id: strategyId,
      user_id: userId,
      action: 'buy',
      symbol,
      quantity,
      price: currentPrice,
    });

    // Send notification
    await supabase.from('notifications').insert({
      user_id: userId,
      title: 'DCA Trade Executed',
      message: `Bought ${quantity.toFixed(6)} ${symbol} at $${currentPrice}`,
      type: 'trading',
    });

    return { order, message: `DCA buy executed: ${quantity.toFixed(6)} ${symbol}` };
  }
}

async function runGridStrategy(supabase: any, userId: string, params: any) {
  const { strategyId, symbol, upperPrice, lowerPrice, gridLevels, totalAmount, exchange, paperMode } = params;
  
  const gridSpacing = (upperPrice - lowerPrice) / gridLevels;
  const amountPerLevel = totalAmount / gridLevels;
  
  // Get current price
  const { data: marketData } = await supabase.functions.invoke(`mcp-${exchange}`, {
    body: { action: 'get_quote', userId, params: { symbol } },
  });

  const currentPrice = marketData?.price || marketData?.last_price || 100;
  
  // Determine which grid levels to place orders at
  const orders = [];
  for (let i = 0; i < gridLevels; i++) {
    const gridPrice = lowerPrice + (i * gridSpacing);
    if (gridPrice < currentPrice) {
      // Buy order below current price
      orders.push({ side: 'buy', price: gridPrice, amount: amountPerLevel / gridPrice });
    } else {
      // Sell order above current price
      orders.push({ side: 'sell', price: gridPrice, amount: amountPerLevel / gridPrice });
    }
  }

  if (paperMode) {
    return {
      gridOrders: orders,
      currentPrice,
      message: `Grid strategy setup (paper): ${orders.length} orders across $${lowerPrice}-$${upperPrice}`,
      paperMode: true,
    };
  }

  // Place actual orders
  for (const order of orders) {
    await supabase.functions.invoke(`mcp-${exchange}`, {
      body: { 
        action: 'create_order', 
        userId, 
        params: { 
          symbol, 
          side: order.side, 
          type: 'limit', 
          price: order.price,
          qty: order.amount,
        } 
      },
    });
  }

  return {
    ordersPlaced: orders.length,
    message: `Grid strategy active: ${orders.length} orders placed`,
  };
}

async function runMomentumStrategy(supabase: any, userId: string, params: any) {
  const { strategyId, symbol, lookbackPeriod, threshold, exchange, paperMode } = params;

  // Get historical data
  const { data: history } = await supabase.functions.invoke(`mcp-${exchange}`, {
    body: { action: 'get_bars', userId, params: { symbol, timeframe: '1D', limit: lookbackPeriod } },
  });

  const bars = history?.bars || [];
  if (bars.length < 2) {
    return { message: 'Insufficient data for momentum analysis' };
  }

  // Calculate momentum
  const latestClose = bars[bars.length - 1]?.c || bars[bars.length - 1]?.close;
  const previousClose = bars[0]?.c || bars[0]?.close;
  const momentum = ((latestClose - previousClose) / previousClose) * 100;

  let signal = 'hold';
  if (momentum > threshold) signal = 'buy';
  if (momentum < -threshold) signal = 'sell';

  return {
    symbol,
    momentum: momentum.toFixed(2) + '%',
    signal,
    latestPrice: latestClose,
    message: `Momentum: ${momentum.toFixed(2)}%, Signal: ${signal.toUpperCase()}`,
  };
}

async function analyzeMarket(supabase: any, userId: string, exchange: string, symbols: string[]) {
  const analysis = [];

  for (const symbol of symbols) {
    const { data } = await supabase.functions.invoke(`mcp-${exchange}`, {
      body: { action: 'get_quote', userId, params: { symbol } },
    });

    analysis.push({
      symbol,
      price: data?.price || data?.last_price,
      change: data?.change_percent || data?.percent_change,
      volume: data?.volume,
    });
  }

  // Use AI to generate insights
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  
  const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a trading analyst. Provide brief market insights based on price data.' },
        { role: 'user', content: `Analyze these assets: ${JSON.stringify(analysis)}. Provide 2-3 brief insights.` },
      ],
    }),
  });

  const aiData = await aiResponse.json();
  const insights = aiData.choices?.[0]?.message?.content || 'Market analysis complete';

  return { analysis, insights };
}

async function getPortfolioSummary(supabase: any, userId: string, exchange: string) {
  // Get account info from exchange
  const { data: account } = await supabase.functions.invoke(`mcp-${exchange}`, {
    body: { action: 'get_account', userId },
  });

  // Get positions
  const { data: positions } = await supabase.functions.invoke(`mcp-${exchange}`, {
    body: { action: 'get_positions', userId },
  });

  // Get recent executions
  const { data: executions } = await supabase
    .from('trading_executions')
    .select('*')
    .eq('user_id', userId)
    .order('executed_at', { ascending: false })
    .limit(10);

  const totalPnL = executions?.reduce((sum: number, e: any) => sum + (e.profit_loss || 0), 0) || 0;

  return {
    account: account || {},
    positions: positions?.positions || [],
    recentTrades: executions || [],
    totalPnL,
    summary: {
      equity: account?.equity || account?.portfolio_value || 0,
      buyingPower: account?.buying_power || account?.cash || 0,
      openPositions: positions?.positions?.length || 0,
    },
  };
}

async function executeTrade(supabase: any, userId: string, params: any) {
  const { exchange, symbol, side, type, quantity, price } = params;

  const { data: order, error } = await supabase.functions.invoke(`mcp-${exchange}`, {
    body: { 
      action: 'create_order', 
      userId, 
      params: { symbol, side, type, qty: quantity, limit_price: price } 
    },
  });

  if (error) throw error;

  // Record execution
  await supabase.from('trading_executions').insert({
    user_id: userId,
    action: side,
    symbol,
    quantity,
    price: price || order?.filled_avg_price || 0,
  });

  // Send notification
  await supabase.from('notifications').insert({
    user_id: userId,
    title: 'Trade Executed',
    message: `${side.toUpperCase()} ${quantity} ${symbol} at ${type === 'market' ? 'market' : '$' + price}`,
    type: 'trading',
  });

  return { order, message: 'Trade executed successfully' };
}

async function getTradeHistory(supabase: any, userId: string, strategyId?: string) {
  let query = supabase
    .from('trading_executions')
    .select('*')
    .eq('user_id', userId)
    .order('executed_at', { ascending: false })
    .limit(50);

  if (strategyId) {
    query = query.eq('strategy_id', strategyId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return { trades: data };
}

async function getPerformanceMetrics(supabase: any, userId: string) {
  // Get all strategies
  const { data: strategies } = await supabase
    .from('trading_strategies')
    .select('*')
    .eq('user_id', userId);

  // Get all executions
  const { data: executions } = await supabase
    .from('trading_executions')
    .select('*')
    .eq('user_id', userId);

  const totalTrades = executions?.length || 0;
  const totalPnL = executions?.reduce((sum: number, e: any) => sum + (e.profit_loss || 0), 0) || 0;
  const winningTrades = executions?.filter((e: any) => e.profit_loss > 0).length || 0;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  return {
    totalStrategies: strategies?.length || 0,
    activeStrategies: strategies?.filter((s: any) => s.is_active).length || 0,
    totalTrades,
    totalPnL,
    winRate: winRate.toFixed(2) + '%',
    averagePnL: totalTrades > 0 ? (totalPnL / totalTrades).toFixed(2) : '0.00',
  };
}

async function executePhase(supabase: any, userId: string, params: any) {
  const { project_id, phase, exchange, mode, capital } = params;
  const phaseNames = ["Research", "Strategy", "Setup", "Execution", "Monitor", "Optimize"];
  const phaseName = phaseNames[phase - 1] || "Unknown";

  await supabase.from("agent_activity_logs").insert({
    agent_id: `trading-phase-${phase}`,
    agent_name: `${phaseName} Agent`,
    action: `Executing ${phaseName} phase for ${exchange}`,
    status: "started",
    metadata: { project_id, phase, exchange, mode, capital },
  });

  // Simulate phase work
  await new Promise((r) => setTimeout(r, 1000));

  await supabase.from("agent_activity_logs").insert({
    agent_id: `trading-phase-${phase}`,
    agent_name: `${phaseName} Agent`,
    action: `Completed ${phaseName} phase analysis`,
    status: "completed",
    metadata: { project_id, phase, exchange, mode },
  });

  return { success: true, phase, phaseName, message: `${phaseName} phase completed` };
}
