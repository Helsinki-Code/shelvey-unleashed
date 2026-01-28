import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, content-type",
};

interface MonitoringRequest {
  action: "get_metrics" | "get_sessions" | "get_provider_health" | "get_alerts";
  userId?: string;
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
    const body = (await req.json()) as MonitoringRequest;
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
      case "get_metrics": {
        const { data: sessions, error: sessionsError } = await supabase
          .from("browser_automation_sessions")
          .select("*")
          .eq("user_id", userId);

        if (sessionsError) throw sessionsError;

        const activeSessions = sessions?.filter(
          (s) => s.status === "active"
        ).length || 0;
        const idleSessions = sessions?.filter(
          (s) => s.status === "idle"
        ).length || 0;

        const { data: tasks, error: tasksError } = await supabase
          .from("browser_automation_tasks")
          .select("*")
          .eq("user_id", userId);

        if (tasksError) throw tasksError;

        const completedTasks = tasks?.filter(
          (t) => t.status === "completed"
        ).length || 0;
        const failedTasks = tasks?.filter(
          (t) => t.status === "failed"
        ).length || 0;
        const successRate =
          completedTasks + failedTasks > 0
            ? (completedTasks / (completedTasks + failedTasks)) * 100
            : 0;

        const { data: audit, error: auditError } = await supabase
          .from("browser_automation_audit")
          .select("duration_ms")
          .eq("user_id", userId)
          .limit(100);

        if (auditError) throw auditError;

        const avgLatency =
          audit && audit.length > 0
            ? audit.reduce((sum, a) => sum + (a.duration_ms || 0), 0) /
              audit.length
            : 0;

        const { data: costs, error: costsError } = await supabase
          .from("browser_automation_cost_tracking")
          .select("cost_usd")
          .eq("user_id", userId)
          .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        if (costsError) throw costsError;

        const monthlyCost = costs?.reduce((sum, c) => sum + (c.cost_usd || 0), 0) || 0;

        return new Response(
          JSON.stringify({
            activeSessions,
            idleSessions,
            totalTasks: tasks?.length || 0,
            successRate: Math.round(successRate),
            avgLatency: Math.round(avgLatency),
            monthlyCost: Math.round(monthlyCost * 100) / 100,
          }),
          { headers: corsHeaders }
        );
      }

      case "get_sessions": {
        const { data, error } = await supabase
          .from("browser_automation_sessions")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;

        return new Response(JSON.stringify(data || []), {
          headers: corsHeaders,
        });
      }

      case "get_provider_health": {
        const providers = [
          "agent-browser",
          "playwright",
          "brightdata",
          "fallback",
        ];
        const health: Record<string, any> = {};

        for (const provider of providers) {
          const { data, error } = await supabase
            .from("browser_automation_provider_health")
            .select("uptime_percentage, avg_response_time_ms, error_rate, last_error")
            .eq("provider", provider)
            .order("updated_at", { ascending: false })
            .limit(1);

          if (!error && data && data.length > 0) {
            health[provider] = data[0];
          } else {
            health[provider] = {
              uptime_percentage: 100,
              avg_response_time_ms: 1000,
              error_rate: 0,
              last_error: null,
            };
          }
        }

        return new Response(JSON.stringify(health), { headers: corsHeaders });
      }

      case "get_alerts": {
        const { data, error } = await supabase
          .from("browser_automation_approvals")
          .select("*")
          .eq("user_id", userId)
          .eq("status", "pending")
          .order("created_at", { ascending: false });

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
