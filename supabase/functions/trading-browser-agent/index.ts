import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, content-type",
};

interface TradingRequest {
  action:
    | "get_market_data"
    | "get_portfolio"
    | "execute_trade"
    | "get_alerts"
    | "create_alert"
    | "get_journal"
    | "get_compliance_report";
  exchangeId?: string;
  symbol?: string;
  condition?: string;
  price?: number;
  quantity?: number;
  side?: "buy" | "sell";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  );

  try {
    const body = (await req.json()) as TradingRequest;
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const userId = user.id;

    switch (body.action) {
      case "get_market_data": {
        const { data, error } = await supabase
          .from("trading_market_data")
          .select("*")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
          .limit(50);

        if (error) throw error;

        return new Response(JSON.stringify(data || []), {
          headers: corsHeaders,
        });
      }

      case "get_portfolio": {
        const { data, error } = await supabase
          .from("trading_portfolio_snapshots")
          .select("*")
          .eq("user_id", userId)
          .eq("exchange_id", body.exchangeId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== "PGRST116") throw error;

        // If no portfolio snapshot exists, return default
        if (!data) {
          return new Response(
            JSON.stringify({
              account_value: 0,
              cash_balance: 0,
              buying_power: 0,
              day_pl: 0,
              total_pl: 0,
              positions: [],
            }),
            { headers: corsHeaders }
          );
        }

        return new Response(JSON.stringify(data), { headers: corsHeaders });
      }

      case "execute_trade": {
        const { error } = await supabase
          .from("trading_browser_actions")
          .insert({
            user_id: userId,
            action: "execute_trade",
            exchange_id: body.exchangeId,
            symbol: body.symbol,
            side: body.side,
            quantity: body.quantity,
            price: body.price,
            status: "executed",
            timestamp: new Date().toISOString(),
          });

        if (error) throw error;

        return new Response(
          JSON.stringify({
            status: "executed",
            symbol: body.symbol,
            side: body.side,
            quantity: body.quantity,
          }),
          { headers: corsHeaders }
        );
      }

      case "get_alerts": {
        const { data, error } = await supabase
          .from("trading_alerts")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        return new Response(JSON.stringify(data || []), {
          headers: corsHeaders,
        });
      }

      case "create_alert": {
        const { error } = await supabase
          .from("trading_alerts")
          .insert({
            user_id: userId,
            symbol: body.symbol,
            condition: body.condition,
            price: body.price,
            is_active: true,
            created_at: new Date().toISOString(),
          });

        if (error) throw error;

        return new Response(
          JSON.stringify({
            status: "created",
            symbol: body.symbol,
            condition: body.condition,
            price: body.price,
          }),
          { headers: corsHeaders }
        );
      }

      case "get_journal": {
        const { data, error } = await supabase
          .from("trading_journals")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) throw error;

        // Calculate statistics
        if (data && data.length > 0) {
          const totalTrades = data.length;
          const winTrades = data.filter((t) => (t.pl_usd || 0) > 0).length;
          const lossTrades = totalTrades - winTrades;
          const totalPL = data.reduce((sum, t) => sum + (t.pl_usd || 0), 0);
          const winRate = ((winTrades / totalTrades) * 100).toFixed(2);
          const profitFactor =
            lossTrades > 0
              ? (
                  data
                    .filter((t) => (t.pl_usd || 0) > 0)
                    .reduce((sum, t) => sum + (t.pl_usd || 0), 0) /
                  Math.abs(
                    data
                      .filter((t) => (t.pl_usd || 0) < 0)
                      .reduce((sum, t) => sum + (t.pl_usd || 0), 0)
                  )
                ).toFixed(2)
              : "N/A";

          return new Response(
            JSON.stringify({
              trades: data,
              statistics: {
                totalTrades,
                winTrades,
                lossTrades,
                winRate,
                totalPL: totalPL.toFixed(2),
                profitFactor,
              },
            }),
            { headers: corsHeaders }
          );
        }

        return new Response(
          JSON.stringify({
            trades: [],
            statistics: {
              totalTrades: 0,
              winTrades: 0,
              lossTrades: 0,
              winRate: "0",
              totalPL: "0",
              profitFactor: "N/A",
            },
          }),
          { headers: corsHeaders }
        );
      }

      case "get_compliance_report": {
        const { data, error } = await supabase
          .from("trading_compliance_checks")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) throw error;

        return new Response(JSON.stringify(data || []), {
          headers: corsHeaders,
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: corsHeaders,
        });
    }
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
