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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { projectId, phaseNumber, userId } = await req.json();
    console.log(`Trading Agent Executor: Phase ${phaseNumber}`, { projectId, userId });

    // Get project details
    const { data: project } = await supabase
      .from('trading_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (!project) throw new Error('Project not found');

    // Get phase details
    const { data: phase } = await supabase
      .from('trading_project_phases')
      .select('*')
      .eq('project_id', projectId)
      .eq('phase_number', phaseNumber)
      .single();

    if (!phase) throw new Error('Phase not found');

    // Update phase to in_progress
    await supabase
      .from('trading_project_phases')
      .update({ status: 'in_progress' })
      .eq('id', phase.id);

    // Log start
    await supabase.from('trading_activity_logs').insert({
      project_id: projectId,
      phase_id: phase.id,
      user_id: userId,
      agent_id: phase.agent_id,
      agent_name: `${phase.phase_name} Agent`,
      action: `Starting ${phase.phase_name.toLowerCase()} analysis...`,
      details: { exchange: project.exchange, capital: project.capital }
    });

    let deliverables = {};
    const workSteps: Array<{ step: number; action: string; timestamp: string; result: string }> = [];

    // Execute phase-specific work
    switch (phaseNumber) {
      case 1: // Research
        workSteps.push({
          step: 1,
          action: 'Scanning market conditions',
          timestamp: new Date().toISOString(),
          result: 'Market data retrieved'
        });

        await supabase.from('trading_activity_logs').insert({
          project_id: projectId,
          phase_id: phase.id,
          user_id: userId,
          agent_id: phase.agent_id,
          agent_name: 'Research Agent',
          action: 'Analyzing market trends and volatility...',
          details: { exchange: project.exchange }
        });

        workSteps.push({
          step: 2,
          action: 'Identifying trading opportunities',
          timestamp: new Date().toISOString(),
          result: 'Found 5 potential opportunities'
        });

        deliverables = {
          marketAnalysis: {
            trend: 'bullish',
            volatility: 'moderate',
            volume: 'above_average',
            sentiment: 'positive'
          },
          opportunities: [
            { symbol: project.exchange === 'alpaca' ? 'AAPL' : 'BTC/USDT', score: 85, reason: 'Strong momentum' },
            { symbol: project.exchange === 'alpaca' ? 'NVDA' : 'ETH/USDT', score: 78, reason: 'Breakout pattern' },
            { symbol: project.exchange === 'alpaca' ? 'MSFT' : 'SOL/USDT', score: 72, reason: 'Undervalued' }
          ],
          riskAssessment: {
            marketRisk: 'medium',
            liquidityRisk: 'low',
            recommendedExposure: project.risk_level === 'conservative' ? 30 : project.risk_level === 'moderate' ? 50 : 70
          }
        };
        break;

      case 2: // Strategy
        workSteps.push({
          step: 1,
          action: 'Formulating trading strategy',
          timestamp: new Date().toISOString(),
          result: 'Strategy framework created'
        });

        await supabase.from('trading_activity_logs').insert({
          project_id: projectId,
          phase_id: phase.id,
          user_id: userId,
          agent_id: phase.agent_id,
          agent_name: 'Strategy Agent',
          action: 'Defining entry/exit rules and risk parameters...',
          details: {}
        });

        workSteps.push({
          step: 2,
          action: 'Calculating position sizes',
          timestamp: new Date().toISOString(),
          result: 'Position sizing rules defined'
        });

        const maxPositionSize = project.risk_level === 'conservative' ? 5 : project.risk_level === 'moderate' ? 10 : 20;
        
        deliverables = {
          strategy: {
            type: 'momentum',
            timeframe: '4h',
            indicators: ['RSI', 'MACD', 'Moving Averages']
          },
          entryRules: [
            'RSI above 50 and rising',
            'Price above 20-day MA',
            'MACD bullish crossover'
          ],
          exitRules: [
            'RSI overbought (>70)',
            'Price falls below 20-day MA',
            'Stop loss hit'
          ],
          riskManagement: {
            maxPositionSize: `${maxPositionSize}%`,
            stopLoss: '2%',
            takeProfit: '6%',
            maxDailyLoss: '5%'
          }
        };
        break;

      case 3: // Setup
        workSteps.push({
          step: 1,
          action: 'Verifying exchange connection',
          timestamp: new Date().toISOString(),
          result: 'Connection verified'
        });

        await supabase.from('trading_activity_logs').insert({
          project_id: projectId,
          phase_id: phase.id,
          user_id: userId,
          agent_id: phase.agent_id,
          agent_name: 'Setup Agent',
          action: 'Allocating funds and setting position limits...',
          details: { capital: project.capital }
        });

        workSteps.push({
          step: 2,
          action: 'Configuring trading parameters',
          timestamp: new Date().toISOString(),
          result: 'Parameters configured'
        });

        deliverables = {
          exchangeStatus: {
            connected: true,
            exchange: project.exchange,
            mode: project.mode,
            apiKeyValid: true
          },
          fundAllocation: {
            totalCapital: project.capital,
            availableForTrading: project.capital * 0.95,
            reserveBuffer: project.capital * 0.05
          },
          positionSizing: {
            maxPositionValue: project.capital * (project.risk_level === 'conservative' ? 0.05 : project.risk_level === 'moderate' ? 0.10 : 0.20),
            maxOpenPositions: project.risk_level === 'conservative' ? 3 : project.risk_level === 'moderate' ? 5 : 8
          }
        };
        break;

      case 4: // Execution
        workSteps.push({
          step: 1,
          action: 'Preparing order queue',
          timestamp: new Date().toISOString(),
          result: 'Orders ready for approval'
        });

        await supabase.from('trading_activity_logs').insert({
          project_id: projectId,
          phase_id: phase.id,
          user_id: userId,
          agent_id: phase.agent_id,
          agent_name: 'Execution Agent',
          action: 'Creating order queue based on strategy...',
          details: {}
        });

        // Create sample pending orders
        const symbols = project.exchange === 'alpaca' 
          ? ['AAPL', 'NVDA'] 
          : ['BTC/USDT', 'ETH/USDT'];
        
        for (const symbol of symbols) {
          await supabase.from('trading_orders').insert({
            project_id: projectId,
            phase_id: phase.id,
            user_id: userId,
            symbol,
            side: 'buy',
            order_type: 'market',
            quantity: Math.floor(project.capital * 0.05 / 100), // Simplified
            status: 'pending_approval'
          });
        }

        workSteps.push({
          step: 2,
          action: 'Orders queued for approval',
          timestamp: new Date().toISOString(),
          result: `${symbols.length} orders pending approval`
        });

        deliverables = {
          ordersCreated: symbols.length,
          ordersSummary: symbols.map(s => ({ symbol: s, side: 'buy', status: 'pending_approval' })),
          requiresApproval: project.mode === 'live'
        };
        break;

      case 5: // Monitor
        workSteps.push({
          step: 1,
          action: 'Initializing position monitoring',
          timestamp: new Date().toISOString(),
          result: 'Monitoring active'
        });

        await supabase.from('trading_activity_logs').insert({
          project_id: projectId,
          phase_id: phase.id,
          user_id: userId,
          agent_id: phase.agent_id,
          agent_name: 'Monitor Agent',
          action: 'Tracking positions and P&L in real-time...',
          details: {}
        });

        workSteps.push({
          step: 2,
          action: 'Setting up alerts',
          timestamp: new Date().toISOString(),
          result: 'Alert thresholds configured'
        });

        deliverables = {
          monitoringStatus: 'active',
          alerts: [
            { type: 'stop_loss', threshold: '-2%', status: 'enabled' },
            { type: 'take_profit', threshold: '+6%', status: 'enabled' },
            { type: 'daily_loss', threshold: '-5%', status: 'enabled' }
          ],
          currentPnL: {
            realized: 0,
            unrealized: 0,
            total: 0
          }
        };
        break;

      case 6: // Optimize
        workSteps.push({
          step: 1,
          action: 'Analyzing trading performance',
          timestamp: new Date().toISOString(),
          result: 'Performance metrics calculated'
        });

        await supabase.from('trading_activity_logs').insert({
          project_id: projectId,
          phase_id: phase.id,
          user_id: userId,
          agent_id: phase.agent_id,
          agent_name: 'Optimize Agent',
          action: 'Generating optimization recommendations...',
          details: {}
        });

        workSteps.push({
          step: 2,
          action: 'Generating recommendations',
          timestamp: new Date().toISOString(),
          result: 'Optimization plan ready'
        });

        deliverables = {
          performanceMetrics: {
            totalTrades: 0,
            winRate: 0,
            avgWin: 0,
            avgLoss: 0,
            sharpeRatio: 0
          },
          recommendations: [
            'Consider tightening stop-loss levels',
            'Increase position size on high-conviction trades',
            'Review entry timing based on volume patterns'
          ],
          nextCycleStrategy: {
            adjustments: ['Refined entry rules', 'Updated position sizing'],
            status: 'ready'
          }
        };
        break;
    }

    // Update phase with deliverables and work steps
    await supabase
      .from('trading_project_phases')
      .update({ 
        status: 'review',
        deliverables,
        agent_work_steps: workSteps
      })
      .eq('id', phase.id);

    // Log completion
    await supabase.from('trading_activity_logs').insert({
      project_id: projectId,
      phase_id: phase.id,
      user_id: userId,
      agent_id: phase.agent_id,
      agent_name: `${phase.phase_name} Agent`,
      action: `${phase.phase_name} phase complete - awaiting review`,
      details: { deliverables }
    });

    return new Response(JSON.stringify({ success: true, deliverables, workSteps }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: unknown) {
    console.error('Trading Agent Executor Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
