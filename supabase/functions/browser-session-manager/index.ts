import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface BrowserSessionRequest {
  session_type: "trading" | "blog" | "seo" | "social" | "form" | "visual";
  session_name?: string;
  description?: string;
  user_id: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

interface BrowserSessionResponse {
  id: string;
  status: string;
  provider: string;
  created_at: string;
  message: string;
}

interface TaskDefinition {
  task_name: string;
  task_category: string;
  parameters: Record<string, unknown>;
  requires_approval: boolean;
}

// Provider selection logic
function selectProvider(
  taskComplexity: number,
  requiresVision: boolean,
  isHighRisk: boolean
): string {
  if (requiresVision || taskComplexity > 7) {
    return "agent-browser"; // Claude Opus 4.5 with vision
  }
  if (isHighRisk) {
    return "agent-browser"; // Use most capable provider for high-risk
  }
  if (taskComplexity < 5) {
    return "playwright"; // Lightweight headless for simple tasks
  }
  return "playwright"; // Default to Playwright
}

async function createSession(
  req: BrowserSessionRequest
): Promise<BrowserSessionResponse> {
  const client = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Create session record
    const { data: session, error: sessionError } = await client
      .from("browser_automation_sessions")
      .insert({
        user_id: req.user_id,
        session_type: req.session_type,
        session_name: req.session_name,
        description: req.description,
        provider: selectProvider(5, false, false), // Will be refined based on tasks
        status: "initializing",
        metadata: req.metadata || {},
        tags: req.tags || [],
      })
      .select()
      .single();

    if (sessionError) {
      throw new Error(`Session creation failed: ${sessionError.message}`);
    }

    return {
      id: session.id,
      status: session.status,
      provider: session.provider,
      created_at: session.created_at,
      message: `Browser session ${session.id} created successfully`,
    };
  } catch (error) {
    throw new Error(`Failed to create session: ${error.message}`);
  }
}

async function getSession(sessionId: string, userId: string) {
  const client = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: session, error } = await client
      .from("browser_automation_sessions")
      .select(
        `
      *,
      tasks:browser_automation_tasks(*),
      audit:browser_automation_audit(*)
      `
      )
      .eq("id", sessionId)
      .eq("user_id", userId)
      .single();

    if (error) {
      throw new Error(`Session not found: ${error.message}`);
    }

    return session;
  } catch (error) {
    throw new Error(`Failed to fetch session: ${error.message}`);
  }
}

async function updateSessionStatus(
  sessionId: string,
  userId: string,
  status: string,
  updateData?: Record<string, unknown>
) {
  const client = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: session, error } = await client
      .from("browser_automation_sessions")
      .update({
        status,
        updated_at: new Date().toISOString(),
        ...updateData,
      })
      .eq("id", sessionId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update session: ${error.message}`);
    }

    return session;
  } catch (error) {
    throw new Error(`Failed to update session status: ${error.message}`);
  }
}

async function closeSession(sessionId: string, userId: string) {
  const client = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get all pending tasks and mark as skipped
    const { data: tasks, error: tasksError } = await client
      .from("browser_automation_tasks")
      .update({ status: "skipped" })
      .eq("session_id", sessionId)
      .eq("status", "pending")
      .select();

    if (tasksError && tasksError.code !== "PGRST116") {
      throw new Error(`Failed to skip pending tasks: ${tasksError.message}`);
    }

    // Close session
    const endTime = new Date().toISOString();
    const { data: session, error: sessionError } = await client
      .from("browser_automation_sessions")
      .update({
        status: "completed",
        end_time: endTime,
        completed_at: endTime,
        updated_at: endTime,
      })
      .eq("id", sessionId)
      .eq("user_id", userId)
      .select()
      .single();

    if (sessionError) {
      throw new Error(`Failed to close session: ${sessionError.message}`);
    }

    return {
      session_id: session.id,
      status: session.status,
      duration_ms: session.duration_ms,
      cost_usd: session.cost_usd,
      message: `Session closed successfully`,
    };
  } catch (error) {
    throw new Error(`Failed to close session: ${error.message}`);
  }
}

async function listSessions(userId: string, limit = 20, offset = 0) {
  const client = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: sessions, error } = await client
      .from("browser_automation_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to list sessions: ${error.message}`);
    }

    return sessions;
  } catch (error) {
    throw new Error(`Failed to list sessions: ${error.message}`);
  }
}

async function addTask(
  sessionId: string,
  userId: string,
  task: TaskDefinition
) {
  const client = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: newTask, error } = await client
      .from("browser_automation_tasks")
      .insert({
        session_id: sessionId,
        user_id: userId,
        task_name: task.task_name,
        task_category: task.task_category,
        parameters: task.parameters,
        requires_approval: task.requires_approval,
        status: "pending",
        priority: 5,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add task: ${error.message}`);
    }

    return newTask;
  } catch (error) {
    throw new Error(`Failed to add task: ${error.message}`);
  }
}

// Main handler
Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, data } = await req.json();

    let response: unknown;

    switch (action) {
      case "create_session":
        response = await createSession(data as BrowserSessionRequest);
        break;

      case "get_session":
        response = await getSession(data.session_id, data.user_id);
        break;

      case "update_session_status":
        response = await updateSessionStatus(
          data.session_id,
          data.user_id,
          data.status,
          data.updateData
        );
        break;

      case "close_session":
        response = await closeSession(data.session_id, data.user_id);
        break;

      case "list_sessions":
        response = await listSessions(data.user_id, data.limit, data.offset);
        break;

      case "add_task":
        response = await addTask(data.session_id, data.user_id, data.task);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
