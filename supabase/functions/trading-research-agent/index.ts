import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function invokeAlpacaTool(
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string,
  tool: string,
  args: Record<string, unknown> = {}
) {
  const response = await fetch(`${supabaseUrl}/functions/v1/mcp-alpaca`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ tool, arguments: args, userId }),
  });

  const data = await response.json();
  if (data?.success === false) throw new Error(data?.error || `mcp-alpaca ${tool} failed`);
  return data?.data ?? data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { userId, projectId } = await req.json();

    if (!userId || !projectId) {
      return new Response(
        JSON.stringify({ error: 'userId and projectId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch project info
    const { data: project } = await supabase
      .from('trading_projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (!project) throw new Error('Project not found');

    // Gather real market data
    let account: any = null;
    let positions: any[] = [];
    let recentExecutions: any[] = [];

    if (project.exchange === 'alpaca') {
      try {
        [account, positions] = await Promise.all([
          invokeAlpacaTool(supabaseUrl, serviceRoleKey, userId, 'get_account'),
          invokeAlpacaTool(supabaseUrl, serviceRoleKey, userId, 'get_positions'),
        ]);
      } catch (e) {
        console.error('[research-agent] Could not fetch Alpaca data:', e);
      }
    }

    // Recent executions
    const { data: executions } = await supabase
      .from('trading_executions')
      .select('*')
      .eq('user_id', userId)
      .order('executed_at', { ascending: false })
      .limit(20);

    recentExecutions = executions || [];

    // Active strategies
    const { data: strategies } = await supabase
      .from('trading_strategies')
      .select('*')
      .eq('user_id', userId)
      .eq('project_id', projectId);

    // Risk controls
    const { data: risk } = await supabase
      .from('trading_risk_controls')
      .select('*')
      .eq('project_id', projectId)
      .single();

    // Build context for AI analysis
    const equity = toNumber(account?.equity || project.capital);
    const cash = toNumber(account?.cash || account?.buying_power);
    const positionsSummary = Array.isArray(positions)
      ? positions.map((p: any) => ({
          symbol: p.symbol,
          qty: p.qty,
          side: p.side,
          marketValue: p.market_value,
          unrealizedPL: p.unrealized_pl,
          unrealizedPLPct: p.unrealized_plpc,
          currentPrice: p.current_price,
          avgEntry: p.avg_entry_price,
        }))
      : [];

    const recentTradesSummary = recentExecutions.slice(0, 10).map((e: any) => ({
      symbol: e.symbol,
      action: e.action,
      quantity: e.quantity,
      price: e.price,
      profitLoss: e.profit_loss,
      date: e.executed_at,
    }));

    const prompt = `You are a professional quantitative research analyst for an autonomous AI trading company. Your job is to analyze the current portfolio, market conditions, and recent trades to generate actionable trade recommendations.

PORTFOLIO STATE:
- Total Equity: $${equity.toFixed(2)}
- Available Cash: $${cash.toFixed(2)}
- Exchange: ${project.exchange}
- Mode: ${project.mode} (${project.mode === 'live' ? 'REAL MONEY' : 'paper trading'})
- Risk Level: ${project.risk_level || 'moderate'}

CURRENT POSITIONS (${positionsSummary.length}):
${positionsSummary.length > 0 ? JSON.stringify(positionsSummary, null, 2) : 'No open positions'}

RECENT TRADES (last 10):
${recentTradesSummary.length > 0 ? JSON.stringify(recentTradesSummary, null, 2) : 'No recent trades'}

ACTIVE STRATEGIES: ${(strategies || []).length}
${(strategies || []).map((s: any) => `- ${s.name} (${s.strategy_type}, ${s.is_active ? 'active' : 'paused'})`).join('\n')}

RISK CONTROLS:
- Max Position Size: ${risk?.max_position_pct || 10}%
- Daily Loss Limit: ${risk?.daily_loss_limit || 5}%
- Kill Switch: ${risk?.kill_switch_active ? 'ACTIVE' : 'OFF'}

Based on this data, provide:
1. PORTFOLIO ASSESSMENT: Brief analysis of current portfolio health, concentration risk, and P&L
2. MARKET OUTLOOK: Based on position performance, what does the data suggest about current market conditions
3. TRADE RECOMMENDATIONS: 2-4 specific, actionable recommendations with:
   - Symbol, Action (BUY/SELL/HOLD), Quantity suggestion
   - Risk score (1-10, 10 = highest risk)
   - Reasoning
   - Stop loss and take profit levels
4. STRATEGY ADJUSTMENTS: Any changes to active strategies

Respond in valid JSON format with this structure:
{
  "assessment": "string",
  "outlook": "string",
  "recommendations": [
    {
      "symbol": "AAPL",
      "action": "BUY",
      "quantity": 10,
      "risk_score": 4,
      "reasoning": "string",
      "stop_loss": 150.00,
      "take_profit": 180.00,
      "confidence": 0.75
    }
  ],
  "strategy_adjustments": "string",
  "overall_risk_score": 5
}`;

    // Call Lovable AI (Gemini)
    let aiResponse: any = null;

    if (lovableApiKey) {
      const aiRes = await fetch('https://api.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${lovableApiKey}`,
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a quantitative trading research analyst. Always respond in valid JSON.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        const content = aiData?.choices?.[0]?.message?.content || '';
        
        // Parse JSON from response (handle markdown code blocks)
        const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) || content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            aiResponse = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          } catch {
            aiResponse = { assessment: content, recommendations: [] };
          }
        } else {
          aiResponse = { assessment: content, recommendations: [] };
        }
      }
    }

    if (!aiResponse) {
      aiResponse = {
        assessment: `Portfolio has $${equity.toFixed(2)} equity with ${positionsSummary.length} open positions. Unable to generate AI analysis - check API configuration.`,
        outlook: 'Analysis unavailable',
        recommendations: [],
        strategy_adjustments: 'No adjustments',
        overall_risk_score: 5,
      };
    }

    // Store research results as team tasks
    for (const rec of (aiResponse.recommendations || [])) {
      await supabase.from('trading_team_tasks').insert({
        project_id: projectId,
        user_id: userId,
        task_type: 'trade_recommendation',
        title: `${rec.action} ${rec.symbol} - Risk ${rec.risk_score}/10`,
        description: rec.reasoning,
        assigned_agent: 'research-analyst',
        status: 'pending_review',
        priority: rec.risk_score <= 3 ? 'low' : rec.risk_score <= 6 ? 'medium' : 'high',
        metadata: {
          symbol: rec.symbol,
          action: rec.action,
          quantity: rec.quantity,
          risk_score: rec.risk_score,
          stop_loss: rec.stop_loss,
          take_profit: rec.take_profit,
          confidence: rec.confidence,
          generated_at: new Date().toISOString(),
        },
      });
    }

    // Log activity
    await supabase.from('trading_activity_logs').insert({
      project_id: projectId,
      user_id: userId,
      agent_id: 'research-analyst',
      agent_name: 'AI Research Analyst',
      action: `Generated ${(aiResponse.recommendations || []).length} trade recommendations. Overall risk: ${aiResponse.overall_risk_score}/10`,
      status: 'completed',
      details: {
        assessment: aiResponse.assessment?.substring(0, 200),
        recommendations_count: (aiResponse.recommendations || []).length,
        overall_risk_score: aiResponse.overall_risk_score,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        research: aiResponse,
        portfolio: {
          equity,
          cash,
          positions: positionsSummary.length,
        },
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[trading-research-agent] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
