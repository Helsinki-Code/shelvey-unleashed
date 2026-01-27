import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface PlaywrightTask {
  session_id: string;
  task_id: string;
  user_id: string;
  task_name: string;
  actions: PlaywrightAction[];
  parameters: Record<string, unknown>;
  timeout_seconds?: number;
}

interface PlaywrightAction {
  type: "navigate" | "click" | "fill" | "submit" | "extract" | "screenshot" | "wait" | "scroll";
  selector?: string;
  value?: string;
  xpath?: string;
  url?: string;
  waitTime?: number;
}

interface PlaywrightResponse {
  task_id: string;
  session_id: string;
  status: "success" | "failed" | "pending";
  result?: Record<string, unknown>;
  error?: string;
  screenshots?: string[];
  execution_time_ms?: number;
  cost_usd?: number;
}

async function logAuditAction(
  sessionId: string,
  taskId: string,
  userId: string,
  actionData: {
    action_type: string;
    action_description: string;
    url?: string;
    element_selector?: string;
    success: boolean;
    response_data?: Record<string, unknown>;
    error?: string;
    duration_ms?: number;
  }
) {
  const client = createClient(supabaseUrl, supabaseServiceKey);

  try {
    await client.from("browser_automation_audit").insert({
      session_id: sessionId,
      task_id: taskId,
      user_id: userId,
      action_type: actionData.action_type,
      action_description: actionData.action_description,
      url: actionData.url,
      element_selector: actionData.element_selector,
      success: actionData.success,
      response_data: actionData.response_data || {},
      error: actionData.error,
      duration_ms: actionData.duration_ms,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to log audit action:", error);
  }
}

async function updateTaskStatus(
  taskId: string,
  userId: string,
  status: string,
  result?: Record<string, unknown>,
  error?: string,
  executionTimeMs?: number
) {
  const client = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
      execution_time_ms: executionTimeMs || 0,
    };

    if (status === "completed") {
      updateData.completed_at = new Date().toISOString();
    }

    if (result) {
      updateData.result = result;
      updateData.success = true;
    }

    if (error) {
      updateData.last_error = error;
      updateData.success = false;
    }

    await client
      .from("browser_automation_tasks")
      .update(updateData)
      .eq("id", taskId)
      .eq("user_id", userId);
  } catch (error) {
    console.error("Error updating task status:", error);
  }
}

/**
 * Execute Playwright action sequence
 * Simulated implementation - in production would use actual Playwright MCP
 */
async function executePlaywrightActions(
  task: PlaywrightTask,
  sessionId: string,
  userId: string
): Promise<{ success: boolean; result: Record<string, unknown>; error?: string; executionTime: number }> {
  const startTime = Date.now();
  const results: Record<string, unknown>[] = [];
  let currentUrl = "https://example.com";

  try {
    for (const action of task.actions) {
      const actionStartTime = Date.now();

      switch (action.type) {
        case "navigate":
          if (!action.url) throw new Error("Navigate action requires URL");

          currentUrl = action.url;
          await logAuditAction(sessionId, task.task_id, userId, {
            action_type: "navigate",
            action_description: `Navigate to ${action.url}`,
            url: action.url,
            success: true,
            duration_ms: Date.now() - actionStartTime,
          });

          results.push({ action: "navigate", url: action.url, status: "completed" });
          break;

        case "click":
          if (!action.selector && !action.xpath) {
            throw new Error("Click action requires selector or xpath");
          }

          await logAuditAction(sessionId, task.task_id, userId, {
            action_type: "click",
            action_description: `Click element: ${action.selector || action.xpath}`,
            url: currentUrl,
            element_selector: action.selector,
            success: true,
            duration_ms: Date.now() - actionStartTime,
          });

          results.push({
            action: "click",
            selector: action.selector,
            status: "completed",
          });
          break;

        case "fill":
          if (!action.selector || !action.value) {
            throw new Error("Fill action requires selector and value");
          }

          await logAuditAction(sessionId, task.task_id, userId, {
            action_type: "input",
            action_description: `Fill field: ${action.selector}`,
            url: currentUrl,
            element_selector: action.selector,
            success: true,
            duration_ms: Date.now() - actionStartTime,
          });

          results.push({
            action: "fill",
            selector: action.selector,
            value: "***REDACTED***",
            status: "completed",
          });
          break;

        case "submit":
          await logAuditAction(sessionId, task.task_id, userId, {
            action_type: "submit",
            action_description: "Submit form",
            url: currentUrl,
            success: true,
            duration_ms: Date.now() - actionStartTime,
          });

          results.push({ action: "submit", status: "completed" });
          break;

        case "extract":
          if (!action.selector && !action.xpath) {
            throw new Error("Extract action requires selector or xpath");
          }

          const extractedData = { text: "Sample extracted data" };

          await logAuditAction(sessionId, task.task_id, userId, {
            action_type: "extract",
            action_description: `Extract data from: ${action.selector || action.xpath}`,
            url: currentUrl,
            element_selector: action.selector,
            success: true,
            response_data: extractedData,
            duration_ms: Date.now() - actionStartTime,
          });

          results.push({
            action: "extract",
            selector: action.selector,
            data: extractedData,
            status: "completed",
          });
          break;

        case "screenshot":
          const screenshotUrl = `https://example.com/screenshot_${Date.now()}.png`;

          await logAuditAction(sessionId, task.task_id, userId, {
            action_type: "screenshot",
            action_description: "Take screenshot",
            url: currentUrl,
            success: true,
            duration_ms: Date.now() - actionStartTime,
          });

          results.push({
            action: "screenshot",
            url: screenshotUrl,
            status: "completed",
          });
          break;

        case "wait":
          if (!action.waitTime) throw new Error("Wait action requires waitTime");

          await logAuditAction(sessionId, task.task_id, userId, {
            action_type: "wait",
            action_description: `Wait ${action.waitTime}ms`,
            url: currentUrl,
            success: true,
            duration_ms: action.waitTime,
          });

          results.push({
            action: "wait",
            milliseconds: action.waitTime,
            status: "completed",
          });
          break;

        case "scroll":
          await logAuditAction(sessionId, task.task_id, userId, {
            action_type: "scroll",
            action_description: `Scroll page`,
            url: currentUrl,
            success: true,
            duration_ms: Date.now() - actionStartTime,
          });

          results.push({
            action: "scroll",
            status: "completed",
          });
          break;

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      // Check timeout
      if (task.timeout_seconds && (Date.now() - startTime) / 1000 > task.timeout_seconds) {
        throw new Error(`Task exceeded timeout of ${task.timeout_seconds} seconds`);
      }
    }

    const executionTime = Date.now() - startTime;

    return {
      success: true,
      result: {
        task_name: task.task_name,
        actions_executed: results.length,
        actions: results,
        total_duration_ms: executionTime,
      },
      executionTime,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;

    return {
      success: false,
      result: {
        task_name: task.task_name,
        actions_completed: results.length,
        actions: results,
      },
      error: error instanceof Error ? error.message : "Unknown error",
      executionTime,
    };
  }
}

async function executePlaywrightTask(task: PlaywrightTask): Promise<PlaywrightResponse> {
  const startTime = Date.now();

  try {
    // Update task status to executing
    await updateTaskStatus(task.task_id, task.user_id, "executing");

    // Log execution start
    await logAuditAction(task.session_id, task.task_id, task.user_id, {
      action_type: "playwright_start",
      action_description: `Starting Playwright task: ${task.task_name}`,
      success: true,
    });

    // Execute actions
    const executionResult = await executePlaywrightActions(task, task.session_id, task.user_id);

    // Update task status
    const executionTime = Date.now() - startTime;
    await updateTaskStatus(
      task.task_id,
      task.user_id,
      "completed",
      executionResult.result,
      executionResult.error,
      executionTime
    );

    // Update session metrics
    const client = createClient(supabaseUrl, supabaseServiceKey);
    const { data: session } = await client
      .from("browser_automation_sessions")
      .select("*")
      .eq("id", task.session_id)
      .single();

    if (session) {
      await client
        .from("browser_automation_sessions")
        .update({
          api_calls: (session.api_calls || 0) + 1,
          cost_usd: (session.cost_usd || 0) + 0.001, // Playwright is cheaper
          updated_at: new Date().toISOString(),
        })
        .eq("id", task.session_id);
    }

    return {
      task_id: task.task_id,
      session_id: task.session_id,
      status: executionResult.success ? "success" : "failed",
      result: executionResult.result,
      error: executionResult.error,
      execution_time_ms: executionTime,
      cost_usd: 0.001,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;

    console.error("Playwright execution error:", error);

    // Log error
    await logAuditAction(task.session_id, task.task_id, task.user_id, {
      action_type: "playwright_error",
      action_description: `Error executing Playwright task: ${task.task_name}`,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    // Update task
    await updateTaskStatus(
      task.task_id,
      task.user_id,
      "failed",
      undefined,
      error instanceof Error ? error.message : "Unknown error",
      executionTime
    );

    return {
      task_id: task.task_id,
      session_id: task.session_id,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      execution_time_ms: executionTime,
      cost_usd: 0.001,
    };
  }
}

// Main handler
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const task = await req.json() as PlaywrightTask;

    // Validate required fields
    if (!task.session_id || !task.task_id || !task.user_id || !task.task_name || !task.actions) {
      throw new Error("Missing required task fields");
    }

    const response = await executePlaywrightTask(task);

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
