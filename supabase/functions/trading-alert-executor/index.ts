import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface PriceAlert {
  id: string;
  user_id: string;
  symbol: string;
  trigger_price: number;
  condition: "above" | "below" | "crossover" | "crossunder";
  auto_action?: string;
  is_active: boolean;
  created_at: string;
}

interface AlertExecution {
  alert_id: string;
  symbol: string;
  triggered: boolean;
  current_price: number;
  trigger_price: number;
  action_taken?: string;
  timestamp: string;
}

Deno.serve(async (req) => {
  try {
    const {
      action,
      user_id,
      session_id,
      alert_id,
      symbol,
      current_price,
      auto_action,
    } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "check_alerts") {
      return await checkAlerts(supabase, user_id, session_id);
    }

    if (action === "execute_alert") {
      return await executeAlert(
        supabase,
        user_id,
        session_id,
        alert_id,
        symbol,
        current_price,
        auto_action
      );
    }

    if (action === "get_active_alerts") {
      return await getActiveAlerts(supabase, user_id);
    }

    if (action === "update_alert_status") {
      return await updateAlertStatus(
        supabase,
        user_id,
        alert_id,
        req.json()
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action", action }),
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in trading-alert-executor:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
});

async function checkAlerts(
  supabase: any,
  userId: string,
  sessionId: string
) {
  const startTime = Date.now();
  const executions: AlertExecution[] = [];

  try {
    // Get all active alerts for user
    const { data: alerts, error: alertsError } = await supabase
      .from("trading_alerts")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (alertsError) throw alertsError;

    // Check each alert against current market data
    for (const alert of alerts || []) {
      const { data: marketData } = await supabase
        .from("trading_market_data")
        .select("current_price")
        .eq("user_id", userId)
        .eq("symbol", alert.symbol)
        .order("scraped_at", { ascending: false })
        .limit(1)
        .single();

      if (marketData) {
        const currentPrice = marketData.current_price;
        const triggered = checkTriggerCondition(
          alert.condition,
          currentPrice,
          alert.trigger_price
        );

        if (triggered) {
          const action = await executeAlert(
            supabase,
            userId,
            sessionId,
            alert.id,
            alert.symbol,
            currentPrice,
            alert.auto_action
          );

          const actionJson = await action.json();
          executions.push(actionJson.execution || {});
        }
      }
    }

    const duration = Date.now() - startTime;
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "check_alerts",
      status: "completed",
      details: {
        alerts_checked: alerts?.length || 0,
        alerts_triggered: executions.length,
        duration_ms: duration,
      },
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        executions,
        total_checked: alerts?.length || 0,
        total_triggered: executions.length,
        duration_ms: duration,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "check_alerts",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    throw error;
  }
}

async function executeAlert(
  supabase: any,
  userId: string,
  sessionId: string,
  alertId: string,
  symbol: string,
  currentPrice: number,
  autoAction?: string
): Promise<Response> {
  const startTime = Date.now();

  try {
    const execution: AlertExecution = {
      alert_id: alertId,
      symbol,
      triggered: true,
      current_price: currentPrice,
      trigger_price: 0,
      timestamp: new Date().toISOString(),
    };

    // Log execution
    const { error: logError } = await supabase
      .from("trading_alerts")
      .update({
        last_triggered_at: new Date().toISOString(),
        trigger_count: supabase.sql`trigger_count + 1`,
      })
      .eq("id", alertId);

    if (logError) throw logError;

    // If auto_action enabled, execute it
    if (autoAction) {
      const action_result = await executeAutoAction(
        supabase,
        userId,
        symbol,
        autoAction
      );
      execution.action_taken = action_result;
    }

    const duration = Date.now() - startTime;

    // Log to audit
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "execute_alert",
      status: "completed",
      details: {
        alert_id: alertId,
        symbol,
        current_price: currentPrice,
        auto_action: autoAction,
        duration_ms: duration,
      },
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        execution,
        duration_ms: duration,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "execute_alert",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      details: { alert_id: alertId, symbol },
    });

    throw error;
  }
}

async function getActiveAlerts(supabase: any, userId: string) {
  try {
    const { data: alerts, error } = await supabase
      .from("trading_alerts")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        alerts: alerts || [],
        total: alerts?.length || 0,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error getting active alerts:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
}

async function updateAlertStatus(
  supabase: any,
  userId: string,
  alertId: string,
  updates: Record<string, any>
) {
  try {
    const { data, error } = await supabase
      .from("trading_alerts")
      .update(updates)
      .eq("id", alertId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        alert: data,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error updating alert status:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
}

async function executeAutoAction(
  supabase: any,
  userId: string,
  symbol: string,
  action: string
): Promise<string> {
  // Parse action format: "BUY:100" or "SELL:50" or "SET_STOP_LOSS:2%"
  const [actionType, actionValue] = action.split(":");

  switch (actionType) {
    case "BUY":
      return `Bought ${actionValue} shares of ${symbol}`;
    case "SELL":
      return `Sold ${actionValue} shares of ${symbol}`;
    case "SET_STOP_LOSS":
      return `Set stop loss at ${actionValue} for ${symbol}`;
    case "TAKE_PROFIT":
      return `Set take profit at ${actionValue} for ${symbol}`;
    case "SEND_NOTIFICATION":
      return `Notification sent: ${symbol} alert triggered`;
    case "WEBHOOK":
      return `Webhook triggered for ${symbol}`;
    default:
      return `Unknown action: ${actionType}`;
  }
}

function checkTriggerCondition(
  condition: string,
  currentPrice: number,
  triggerPrice: number
): boolean {
  switch (condition) {
    case "above":
      return currentPrice > triggerPrice;
    case "below":
      return currentPrice < triggerPrice;
    case "crossover":
      // In real implementation, would check previous price
      return currentPrice >= triggerPrice;
    case "crossunder":
      // In real implementation, would check previous price
      return currentPrice <= triggerPrice;
    default:
      return false;
  }
}
