import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type TradeSide = "buy" | "sell";
type TradeType = "market" | "limit";

interface GatewayRequest {
  projectId: string;
  symbol: string;
  side: TradeSide;
  orderType?: TradeType;
  quantity: number;
  limitPrice?: number;
  source?: string;
  internalUserId?: string;
  strategyId?: string;
}

function normalizeSymbol(symbol: string): string {
  return String(symbol || "").trim().toUpperCase().replace("/", "-");
}

function extractPrice(payload: any): number {
  const candidates = [
    payload?.price,
    payload?.last_price,
    payload?.last,
    payload?.c,
    payload?.ap,
    payload?.ask_price,
    payload?.quote?.ap,
    payload?.bid_price,
    payload?.quote?.bp,
  ];

  for (const candidate of candidates) {
    const parsed = Number(candidate);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  throw new Error("Unable to determine reference market price");
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function invokeAlpacaTool(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  tool: string,
  args: Record<string, unknown> = {}
) {
  const { data, error } = await supabase.functions.invoke("mcp-alpaca", {
    body: {
      tool,
      arguments: args,
      userId,
    },
  });

  if (error) throw error;
  if (data?.success === false) {
    throw new Error(data?.error || `mcp-alpaca ${tool} failed`);
  }

  return data?.data ?? data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    );

    const body = (await req.json()) as GatewayRequest;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    let effectiveUserId: string | null = null;

    if (token) {
      const {
        data: { user },
      } = await supabase.auth.getUser(token);
      if (user?.id) {
        effectiveUserId = user.id;
      }
    }

    // Allow secure internal function-to-function calls using service role authorization.
    if (!effectiveUserId && body.internalUserId && token === serviceRoleKey) {
      effectiveUserId = body.internalUserId;
    }

    if (!effectiveUserId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const projectId = body.projectId;
    const symbol = normalizeSymbol(body.symbol);
    const side = String(body.side || "").toLowerCase() as TradeSide;
    const orderType = String(body.orderType || "market").toLowerCase() as TradeType;
    const quantity = toNumber(body.quantity);
    const limitPrice = body.limitPrice === undefined ? undefined : toNumber(body.limitPrice);
    const source = body.source || "unknown";
    const strategyId = body.strategyId || null;

    if (!projectId) throw new Error("projectId is required");
    if (!symbol) throw new Error("symbol is required");
    if (!["buy", "sell"].includes(side)) throw new Error("Invalid side");
    if (!["market", "limit"].includes(orderType)) throw new Error("Invalid orderType");
    if (!(quantity > 0)) throw new Error("quantity must be > 0");
    if (orderType === "limit" && !(toNumber(limitPrice) > 0)) {
      throw new Error("limitPrice must be > 0 for limit orders");
    }

    const [{ data: project, error: projectError }, { data: risk, error: riskError }] = await Promise.all([
      supabase
        .from("trading_projects")
        .select("*")
        .eq("id", projectId)
        .eq("user_id", effectiveUserId)
        .single(),
      supabase
        .from("trading_risk_controls")
        .select("*")
        .eq("project_id", projectId)
        .eq("user_id", effectiveUserId)
        .single(),
    ]);

    if (projectError || !project) throw new Error("Trading project not found");
    if (riskError || !risk) throw new Error("Risk controls not configured");

    if (project.exchange !== "alpaca") {
      throw new Error("Only Alpaca is supported in production gateway right now");
    }
    if (project.status !== "active") {
      throw new Error(`Project is not active (status: ${project.status})`);
    }
    if (risk.kill_switch_active) {
      throw new Error("Kill switch is active; trading is blocked");
    }

    const now = Date.now();
    const duplicateWindowStart = new Date(now - 10_000).toISOString();
    const { data: duplicateOrders } = await supabase
      .from("trading_orders")
      .select("id, status, created_at")
      .eq("project_id", projectId)
      .eq("user_id", effectiveUserId)
      .eq("symbol", symbol)
      .eq("side", side)
      .eq("order_type", orderType)
      .eq("quantity", quantity)
      .gte("created_at", duplicateWindowStart)
      .in("status", ["pending_approval", "approved", "executed"]);

    if ((duplicateOrders || []).length > 0) {
      throw new Error("Duplicate order detected; please retry after a few seconds");
    }

    const marketData = await invokeAlpacaTool(supabase, effectiveUserId, "get_market_data", { symbol });
    const marketPrice = extractPrice(marketData);
    const referencePrice = orderType === "limit" ? toNumber(limitPrice) : marketPrice;
    const orderNotional = quantity * referencePrice;

    const account = await invokeAlpacaTool(supabase, effectiveUserId, "get_account");
    const equity = toNumber(account?.equity || account?.portfolio_value || project.capital, toNumber(project.capital));
    const buyingPower = toNumber(account?.buying_power || account?.cash || 0);
    const maxPositionPct = toNumber(risk.max_position_pct, 10);
    const maxPositionNotional = equity * (maxPositionPct / 100);

    if (orderNotional > maxPositionNotional) {
      throw new Error(
        `Order exceeds max position size. Notional $${orderNotional.toFixed(2)} > limit $${maxPositionNotional.toFixed(2)}`
      );
    }

    if (side === "buy" && buyingPower > 0 && orderNotional > buyingPower) {
      throw new Error(
        `Insufficient buying power. Required $${orderNotional.toFixed(2)}, available $${buyingPower.toFixed(2)}`
      );
    }

    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);

    const { data: todayExecutions } = await supabase
      .from("trading_executions")
      .select("profit_loss")
      .eq("user_id", effectiveUserId)
      .gte("executed_at", dayStart.toISOString());

    const realizedPnLToday = (todayExecutions || []).reduce(
      (sum: number, row: any) => sum + toNumber(row?.profit_loss, 0),
      0
    );

    const dailyLossLimitPct = toNumber(risk.daily_loss_limit, 5);
    const dailyLossLimitUsd = equity * (dailyLossLimitPct / 100);
    if (realizedPnLToday <= -dailyLossLimitUsd) {
      throw new Error(
        `Daily loss limit reached (${dailyLossLimitPct}% / $${dailyLossLimitUsd.toFixed(2)}). Trading blocked`
      );
    }

    const { data: createdOrder, error: createError } = await supabase
      .from("trading_orders")
      .insert({
        project_id: projectId,
        user_id: effectiveUserId,
        symbol,
        side,
        order_type: orderType,
        quantity,
        price: orderType === "limit" ? limitPrice : null,
        gateway_source: source,
        status: project.mode === "live" ? "approved" : "executed",
        approved_by_ceo: project.mode === "live",
        approved_by_user: project.mode === "live",
      })
      .select("*")
      .single();

    if (createError || !createdOrder) throw new Error(createError?.message || "Failed to create order record");

    if (project.mode !== "live") {
      await supabase.from("trading_activity_logs").insert({
        project_id: projectId,
        user_id: effectiveUserId,
        agent_id: "trading-order-gateway",
        agent_name: "Trading Order Gateway",
        action: `Paper ${side} order executed for ${symbol}`,
        status: "completed",
        details: {
          source,
          order_id: createdOrder.id,
          mode: "paper",
          quantity,
          reference_price: referencePrice,
          notional: orderNotional,
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          mode: "paper",
          order: createdOrder,
          riskChecks: {
            maxPositionNotional,
            orderNotional,
            realizedPnLToday,
            dailyLossLimitUsd,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const brokerOrder = await invokeAlpacaTool(supabase, effectiveUserId, "place_order", {
      symbol,
      side,
      type: orderType,
      qty: quantity,
      limit_price: orderType === "limit" ? limitPrice : undefined,
    });

    const executionPrice = toNumber(
      brokerOrder?.filled_avg_price ?? brokerOrder?.limit_price ?? referencePrice,
      referencePrice,
    );

    await supabase
      .from("trading_orders")
      .update({
        broker_order_id: brokerOrder?.id ? String(brokerOrder.id) : null,
        status: "executed",
        execution_price: executionPrice,
        executed_at: new Date().toISOString(),
        reconciliation_status: brokerOrder?.id ? "pending" : "missing_broker_order",
        reconciliation_notes: brokerOrder?.id ? null : "Broker order id missing from execution response",
      })
      .eq("id", createdOrder.id);

    await supabase.from("trading_executions").insert({
      user_id: effectiveUserId,
      strategy_id: strategyId,
      action: side,
      symbol,
      quantity,
      price: executionPrice,
      executed_at: new Date().toISOString(),
    });

    await supabase.from("trading_activity_logs").insert({
      project_id: projectId,
      user_id: effectiveUserId,
      agent_id: "trading-order-gateway",
      agent_name: "Trading Order Gateway",
      action: `${side.toUpperCase()} order executed for ${symbol}`,
      status: "completed",
      details: {
        source,
        order_id: createdOrder.id,
        broker_order_id: brokerOrder?.id,
        quantity,
        execution_price: executionPrice,
        notional: orderNotional,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        mode: "live",
        orderId: createdOrder.id,
        brokerOrder,
        riskChecks: {
          maxPositionNotional,
          orderNotional,
          realizedPnLToday,
          dailyLossLimitUsd,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[trading-order-gateway] error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
