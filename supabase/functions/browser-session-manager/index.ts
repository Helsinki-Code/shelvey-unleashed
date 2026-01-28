import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, content-type",
};

interface SessionRequest {
  action:
    | "create"
    | "get"
    | "list"
    | "close"
    | "add_task"
    | "get_cost"
    | "get_audit";
  sessionId?: string;
  userId?: string;
  domain?: string;
  provider?: "agent-browser" | "playwright" | "brightdata";
  taskType?: string;
  metadata?: Record<string, any>;
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
    const body = (await req.json()) as SessionRequest;
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
      case "create": {
        const sessionId = crypto.randomUUID();
        const { error } = await supabase
          .from("browser_automation_sessions")
          .insert({
            session_id: sessionId,
            user_id: userId,
            domain: body.domain || "unknown",
            provider: body.provider || "agent-browser",
            status: "active",
            started_at: new Date().toISOString(),
            metadata: body.metadata || {},
          });

        if (error) throw error;

        return new Response(JSON.stringify({ sessionId, status: "active" }), {
          headers: corsHeaders,
        });
      }

      case "get": {
        const { data, error } = await supabase
          .from("browser_automation_sessions")
          .select("*")
          .eq("session_id", body.sessionId)
          .eq("user_id", userId)
          .single();

        if (error) throw error;

        return new Response(JSON.stringify(data), { headers: corsHeaders });
      }

      case "list": {
        const { data, error } = await supabase
          .from("browser_automation_sessions")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;

        return new Response(JSON.stringify(data), { headers: corsHeaders });
      }

      case "close": {
        const { error } = await supabase
          .from("browser_automation_sessions")
          .update({
            status: "closed",
            ended_at: new Date().toISOString(),
          })
          .eq("session_id", body.sessionId)
          .eq("user_id", userId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ status: "closed", sessionId: body.sessionId }),
          { headers: corsHeaders }
        );
      }

      case "add_task": {
        const taskId = crypto.randomUUID();
        const { error } = await supabase
          .from("browser_automation_tasks")
          .insert({
            task_id: taskId,
            session_id: body.sessionId,
            user_id: userId,
            task_type: body.taskType || "unknown",
            status: "pending",
            metadata: body.metadata || {},
          });

        if (error) throw error;

        return new Response(JSON.stringify({ taskId, status: "pending" }), {
          headers: corsHeaders,
        });
      }

      case "get_cost": {
        const { data, error } = await supabase.rpc("get_user_daily_cost", {
          user_id: userId,
        });

        if (error) throw error;

        return new Response(JSON.stringify({ dailyCost: data }), {
          headers: corsHeaders,
        });
      }

      case "get_audit": {
        const { data, error } = await supabase
          .from("browser_automation_audit")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) throw error;

        return new Response(JSON.stringify(data), { headers: corsHeaders });
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
