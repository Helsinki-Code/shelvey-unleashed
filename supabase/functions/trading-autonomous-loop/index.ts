import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface TradingProject {
  id: string;
  user_id: string;
  name: string;
  exchange: string;
  mode: string;
  status: string;
  capital: number;
  total_pnl: number;
  autonomous_mode: boolean;
  current_phase: number;
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
  if (data?.success === false) {
    throw new Error(data?.error || `mcp-alpaca ${tool} failed`);
  }
  return data?.data ?? data;
}

async function invokeOrderGateway(
  supabaseUrl: string,
  serviceRoleKey: string,
  payload: Record<string, unknown>
) {
  const response = await fetch(`${supabaseUrl}/functions/v1/trading-order-gateway`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();
  if (!response.ok || result?.success === false) {
    throw new Error(result?.error || `Order gateway failed (${response.status})`);
  }
  return result;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const loopStartTime = Date.now();
  const results: Record<string, unknown>[] = [];

  try {
    // Fetch all active projects with autonomous_mode enabled
    const { data: projects, error: projectsError } = await supabase
      .from('trading_projects')
      .select('*')
      .eq('status', 'active')
      .eq('autonomous_mode', true);

    if (projectsError) throw projectsError;

    if (!projects || projects.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No autonomous projects found', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[autonomous-loop] Processing ${projects.length} autonomous projects`);

    for (const project of projects as TradingProject[]) {
      const projectResult: Record<string, unknown> = {
        projectId: project.id,
        projectName: project.name,
        exchange: project.exchange,
      };

      try {
        // Check kill switch
        const { data: risk } = await supabase
          .from('trading_risk_controls')
          .select('*')
          .eq('project_id', project.id)
          .eq('user_id', project.user_id)
          .single();

        if (risk?.kill_switch_active) {
          projectResult.skipped = 'Kill switch active';
          results.push(projectResult);
          continue;
        }

        // ═══════════════════════════════════════
        // 1. PORTFOLIO SYNC — Real Alpaca data
        // ═══════════════════════════════════════
        if (project.exchange === 'alpaca') {
          try {
            const [account, positions] = await Promise.all([
              invokeAlpacaTool(supabaseUrl, serviceRoleKey, project.user_id, 'get_account'),
              invokeAlpacaTool(supabaseUrl, serviceRoleKey, project.user_id, 'get_positions'),
            ]);

            const equity = toNumber(account?.equity || account?.portfolio_value);
            const cash = toNumber(account?.cash || account?.buying_power);
            const dayPL = toNumber(account?.equity) - toNumber(account?.last_equity);
            const unrealizedPL = toNumber(account?.unrealized_pl || 0);

            // Upsert portfolio snapshot
            await supabase
              .from('trading_portfolio_snapshots')
              .upsert({
                project_id: project.id,
                user_id: project.user_id,
                equity,
                cash,
                positions: positions || [],
                daily_pl: dayPL,
                unrealized_pl: unrealizedPL,
                snapshot_at: new Date().toISOString(),
              }, { onConflict: 'project_id' });

            // Update project P&L and capital from real broker data
            await supabase
              .from('trading_projects')
              .update({
                total_pnl: unrealizedPL + dayPL,
                capital: equity,
                last_sync_at: new Date().toISOString(),
              })
              .eq('id', project.id);

            // Max drawdown check — auto-activate kill switch if drawdown > threshold
            if (risk && equity > 0) {
              const maxDrawdownPct = toNumber(risk.max_drawdown_pct, 20);
              const peakEquity = toNumber(risk.peak_equity, equity);
              const currentDrawdown = ((peakEquity - equity) / peakEquity) * 100;

              // Track peak equity
              if (equity > peakEquity) {
                await supabase
                  .from('trading_risk_controls')
                  .update({ peak_equity: equity })
                  .eq('project_id', project.id);
              }

              if (currentDrawdown >= maxDrawdownPct) {
                await supabase
                  .from('trading_risk_controls')
                  .update({ kill_switch_active: true })
                  .eq('project_id', project.id);

                await supabase.from('trading_activity_logs').insert({
                  project_id: project.id,
                  user_id: project.user_id,
                  agent_id: 'risk-manager',
                  agent_name: 'Risk Manager',
                  action: `⚠️ KILL SWITCH AUTO-ACTIVATED: Drawdown ${currentDrawdown.toFixed(1)}% exceeds max ${maxDrawdownPct}%`,
                  status: 'completed',
                  details: { equity, peakEquity, currentDrawdown, maxDrawdownPct },
                });

                projectResult.killSwitchActivated = true;
                results.push(projectResult);
                continue;
              }
            }

            projectResult.portfolioSync = {
              equity,
              cash,
              positions: Array.isArray(positions) ? positions.length : 0,
              dayPL,
              unrealizedPL,
            };

            await supabase.from('trading_activity_logs').insert({
              project_id: project.id,
              user_id: project.user_id,
              agent_id: 'portfolio-sync',
              agent_name: 'Portfolio Sync Agent',
              action: `Portfolio synced: $${equity.toFixed(2)} equity, ${Array.isArray(positions) ? positions.length : 0} positions, P&L: $${(unrealizedPL + dayPL).toFixed(2)}`,
              status: 'completed',
              details: { equity, cash, dayPL, unrealizedPL },
            });
          } catch (syncError) {
            console.error(`[autonomous-loop] Portfolio sync error for ${project.id}:`, syncError);
            projectResult.portfolioSyncError = syncError instanceof Error ? syncError.message : String(syncError);
          }
        }

        // ═══════════════════════════════════════
        // 2. ALERT CHECKING — Real price-based triggers
        // ═══════════════════════════════════════
        try {
          const { data: alerts } = await supabase
            .from('trading_alerts')
            .select('*')
            .eq('user_id', project.user_id)
            .eq('is_active', true);

          let alertsTriggered = 0;

          for (const alert of (alerts || [])) {
            try {
              const marketData = await invokeAlpacaTool(
                supabaseUrl, serviceRoleKey,
                project.user_id, 'get_market_data',
                { symbol: alert.symbol }
              );

              const currentPrice = toNumber(
                marketData?.price || marketData?.last_price ||
                marketData?.ap || marketData?.ask_price ||
                marketData?.quote?.ap || marketData?.c
              );

              if (currentPrice <= 0) continue;

              const triggerPrice = toNumber(alert.trigger_price);
              let triggered = false;

              switch (alert.condition) {
                case 'above': triggered = currentPrice > triggerPrice; break;
                case 'below': triggered = currentPrice < triggerPrice; break;
                case 'crossover': triggered = currentPrice >= triggerPrice; break;
                case 'crossunder': triggered = currentPrice <= triggerPrice; break;
              }

              if (triggered && alert.auto_action) {
                const [actionType, actionValue] = (alert.auto_action as string).split(':');

                if (actionType === 'BUY' || actionType === 'SELL') {
                  const qty = toNumber(actionValue, 1);

                  await invokeOrderGateway(supabaseUrl, serviceRoleKey, {
                    projectId: project.id,
                    internalUserId: project.user_id,
                    symbol: alert.symbol,
                    side: actionType.toLowerCase(),
                    orderType: 'market',
                    quantity: qty,
                    source: 'alert-auto-executor',
                  });

                  alertsTriggered++;

                  await supabase.from('trading_activity_logs').insert({
                    project_id: project.id,
                    user_id: project.user_id,
                    agent_id: 'alert-executor',
                    agent_name: 'Alert Executor',
                    action: `Alert triggered: ${actionType} ${qty} ${alert.symbol} at $${currentPrice.toFixed(2)} (trigger: $${triggerPrice.toFixed(2)})`,
                    status: 'completed',
                    details: { alertId: alert.id, currentPrice, triggerPrice, actionType, qty },
                  });
                }

                // Deactivate one-time alerts
                await supabase
                  .from('trading_alerts')
                  .update({
                    is_active: false,
                    last_triggered_at: new Date().toISOString(),
                  })
                  .eq('id', alert.id);
              }
            } catch (alertErr) {
              console.error(`[autonomous-loop] Alert check error for ${alert.symbol}:`, alertErr);
            }
          }

          projectResult.alertsChecked = (alerts || []).length;
          projectResult.alertsTriggered = alertsTriggered;
        } catch (alertsError) {
          console.error(`[autonomous-loop] Alerts error:`, alertsError);
          projectResult.alertsError = alertsError instanceof Error ? alertsError.message : String(alertsError);
        }

        // ═══════════════════════════════════════
        // 3. ACTIVE STRATEGY EXECUTION
        // ═══════════════════════════════════════
        try {
          const { data: strategies } = await supabase
            .from('trading_strategies')
            .select('*')
            .eq('user_id', project.user_id)
            .eq('project_id', project.id)
            .eq('is_active', true);

          let strategiesExecuted = 0;

          for (const strategy of (strategies || [])) {
            try {
              // Check if it's time to execute based on strategy type
              const lastExecAt = strategy.last_executed_at ? new Date(strategy.last_executed_at).getTime() : 0;
              const now = Date.now();
              const params = strategy.parameters as Record<string, unknown> || {};

              if (strategy.strategy_type === 'dca') {
                const intervalMs = toNumber(params.interval_hours, 24) * 3600_000;
                if (now - lastExecAt < intervalMs) continue;

                // Execute DCA via trading-ai-agent
                const response = await fetch(`${supabaseUrl}/functions/v1/trading-ai-agent`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${serviceRoleKey}`,
                  },
                  body: JSON.stringify({
                    action: 'run_dca',
                    userId: project.user_id,
                    params: {
                      strategyId: strategy.id,
                      projectId: project.id,
                      symbol: params.symbol,
                      amount: params.amount,
                      exchange: project.exchange,
                      paperMode: project.mode !== 'live',
                    },
                  }),
                });

                const result = await response.json();
                if (result?.error) throw new Error(result.error);

                strategiesExecuted++;

                await supabase
                  .from('trading_strategies')
                  .update({ last_executed_at: new Date().toISOString() })
                  .eq('id', strategy.id);

              } else if (strategy.strategy_type === 'momentum') {
                // Check momentum signals every 5 min
                const response = await fetch(`${supabaseUrl}/functions/v1/trading-ai-agent`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${serviceRoleKey}`,
                  },
                  body: JSON.stringify({
                    action: 'execute_strategy',
                    userId: project.user_id,
                    params: { strategyId: strategy.id },
                  }),
                });

                const result = await response.json();
                if (result?.signal && result.signal !== 'hold') {
                  strategiesExecuted++;
                }

                await supabase
                  .from('trading_strategies')
                  .update({ last_executed_at: new Date().toISOString() })
                  .eq('id', strategy.id);
              }
            } catch (stratErr) {
              console.error(`[autonomous-loop] Strategy ${strategy.id} error:`, stratErr);
              await supabase.from('trading_activity_logs').insert({
                project_id: project.id,
                user_id: project.user_id,
                agent_id: 'strategy-executor',
                agent_name: 'Strategy Executor',
                action: `Strategy "${strategy.name}" execution error: ${stratErr instanceof Error ? stratErr.message : String(stratErr)}`,
                status: 'failed',
                details: { strategyId: strategy.id, error: stratErr instanceof Error ? stratErr.message : String(stratErr) },
              });
            }
          }

          projectResult.strategiesChecked = (strategies || []).length;
          projectResult.strategiesExecuted = strategiesExecuted;
        } catch (stratError) {
          projectResult.strategiesError = stratError instanceof Error ? stratError.message : String(stratError);
        }

        results.push(projectResult);
      } catch (projectError) {
        console.error(`[autonomous-loop] Error processing project ${project.id}:`, projectError);
        projectResult.error = projectError instanceof Error ? projectError.message : String(projectError);
        results.push(projectResult);
      }
    }

    const duration = Date.now() - loopStartTime;
    console.log(`[autonomous-loop] Completed in ${duration}ms. Processed ${results.length} projects.`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        duration_ms: duration,
        results,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[autonomous-loop] Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
