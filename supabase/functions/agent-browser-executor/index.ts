import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface AgentBrowserTask {
  session_id: string;
  task_id: string;
  user_id: string;
  task_name: string;
  parameters: Record<string, unknown>;
  instructions: string;
  context?: Record<string, unknown>;
}

interface AgentBrowserResponse {
  task_id: string;
  session_id: string;
  status: "success" | "failed" | "pending";
  success?: boolean;
  result?: Record<string, unknown>;
  error?: string;
  screenshots?: string[];
  tokens_used?: number;
  cost_usd?: number;
  execution_time_ms?: number;
}

async function logAuditAction(
  sessionId: string,
  taskId: string,
  userId: string,
  actionData: {
    action_type: string;
    action_description: string;
    url?: string;
    success: boolean;
    response_data?: Record<string, unknown>;
    error?: string;
    screenshot_url?: string;
    duration_ms?: number;
    metadata?: Record<string, unknown>;
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
      success: actionData.success,
      response_data: actionData.response_data || {},
      error: actionData.error,
      screenshot_url: actionData.screenshot_url,
      duration_ms: actionData.duration_ms,
      metadata: actionData.metadata || {},
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
  error?: string
) {
  const client = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    };

    if (result) {
      updateData.result = result;
      updateData.success = true;
    }

    if (error) {
      updateData.last_error = error;
      updateData.success = false;
    }

    const { data: task, error: updateError } = await client
      .from("browser_automation_tasks")
      .update(updateData)
      .eq("id", taskId)
      .eq("user_id", userId)
      .select()
      .single();

    if (updateError) {
      console.error("Failed to update task status:", updateError);
    }

    return task;
  } catch (error) {
    console.error("Error updating task status:", error);
  }
}

/**
 * Main handler for Agent-Browser execution
 * Executes complex, vision-required, or multi-step browser automation tasks
 * using Claude Opus 4.5 with computer use capabilities
 */
async function executeAgentBrowserTask(
  task: AgentBrowserTask
): Promise<AgentBrowserResponse> {
  const startTime = Date.now();

  try {
    // Step 1: Prepare task context
    const client = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch session details for context
    const { data: session, error: sessionError } = await client
      .from("browser_automation_sessions")
      .select("*")
      .eq("id", task.session_id)
      .eq("user_id", task.user_id)
      .single();

    if (sessionError || !session) {
      throw new Error(`Session not found: ${task.session_id}`);
    }

    // Step 2: Prepare credentials if needed
    let credentials: Record<string, unknown> = {};
    if (task.parameters.domain) {
      const { data: creds, error: credsError } = await client
        .from("browser_automation_credentials")
        .select("*")
        .eq("user_id", task.user_id)
        .eq("domain", task.parameters.domain as string)
        .eq("is_active", true)
        .maybeSingle();

      if (!credsError && creds) {
        // Note: In production, credentials should be decrypted here
        credentials = {
          domain: creds.domain,
          credential_type: creds.credential_type,
          // Actual decrypted values would go here
        };
      }
    }

    // Step 3: Log execution start
    await logAuditAction(
      task.session_id,
      task.task_id,
      task.user_id,
      {
        action_type: "agent_browser_start",
        action_description: `Starting Agent-Browser task: ${task.task_name}`,
        success: true,
        metadata: {
          task_name: task.task_name,
          model: "claude-opus-4-5",
        },
      }
    );

    // Step 4: Execute via Agent-Browser (simulated here)
    // In production, this would call the actual @vercel/agent-browser API
    const executionResult = await simulateAgentBrowserExecution(
      task,
      credentials
    );

    // Step 5: Log execution completion
    const isSuccess = executionResult.success ?? executionResult.status === "success";
    await logAuditAction(
      task.session_id,
      task.task_id,
      task.user_id,
      {
        action_type: "agent_browser_complete",
        action_description: `Completed Agent-Browser task: ${task.task_name}`,
        success: isSuccess,
        response_data: executionResult.result,
        error: executionResult.error,
        duration_ms: executionResult.execution_time_ms,
        screenshot_url: executionResult.screenshots?.[0],
      }
    );

    // Step 6: Update task status
    const executionTime = Date.now() - startTime;
    await updateTaskStatus(
      task.task_id,
      task.user_id,
      isSuccess ? "completed" : "failed",
      executionResult.result,
      executionResult.error
    );

    // Step 7: Update session cost and metrics
    if (isSuccess) {
      await client
        .from("browser_automation_sessions")
        .update({
          api_calls: (session.api_calls || 0) + 1,
          cost_usd: (session.cost_usd || 0) + (executionResult.cost_usd || 0.015),
          tokens_used: (session.tokens_used || 0) + (executionResult.tokens_used || 5000),
          updated_at: new Date().toISOString(),
        })
        .eq("id", task.session_id);
    }

    return {
      task_id: task.task_id,
      session_id: task.session_id,
      status: isSuccess ? "success" : "failed",
      result: executionResult.result,
      error: executionResult.error,
      screenshots: executionResult.screenshots,
      tokens_used: executionResult.tokens_used,
      cost_usd: executionResult.cost_usd,
      execution_time_ms: executionTime,
    };
  } catch (error) {
    console.error("Agent-Browser execution error:", error);

    // Log error to audit trail
    await logAuditAction(
      task.session_id,
      task.task_id,
      task.user_id,
      {
        action_type: "agent_browser_error",
        action_description: `Error executing Agent-Browser task: ${task.task_name}`,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    );

    // Update task with error
    await updateTaskStatus(
      task.task_id,
      task.user_id,
      "failed",
      undefined,
      error instanceof Error ? error.message : "Unknown error"
    );

    return {
      task_id: task.task_id,
      session_id: task.session_id,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      execution_time_ms: Date.now() - startTime,
    };
  }
}

/**
 * Simulate Agent-Browser execution (placeholder)
 * In production, this would call the actual @vercel/agent-browser API
 */
async function simulateAgentBrowserExecution(
  task: AgentBrowserTask,
  _credentials: Record<string, unknown>
): Promise<AgentBrowserResponse> {
  // This is a simulation. In production, this would:
  // 1. Call @vercel/agent-browser with the task instructions
  // 2. Use Claude Opus 4.5 with computer use to execute
  // 3. Return screenshots, extracted data, and execution results

  // Different task types
  if (task.task_name.includes("login") || task.task_name.includes("auth")) {
    return {
      task_id: task.task_id,
      session_id: task.session_id,
      status: "success",
      result: {
        authenticated: true,
        username: "user@example.com",
        session_token: "mock_token_123",
      },
      screenshots: ["https://example.com/screenshot1.png"],
      tokens_used: 4500,
      cost_usd: 0.015,
      execution_time_ms: 3000,
    };
  }

  if (task.task_name.includes("scrape")) {
    return {
      task_id: task.task_id,
      session_id: task.session_id,
      status: "success",
      result: {
        data_type: "web_scrape",
        items_extracted: 10,
        fields: ["title", "price", "description"],
        sample_data: {
          title: "Sample Item",
          price: "$99.99",
          description: "Sample description",
        },
      },
      screenshots: [
        "https://example.com/scrape_screenshot1.png",
        "https://example.com/scrape_screenshot2.png",
      ],
      tokens_used: 6000,
      cost_usd: 0.02,
      execution_time_ms: 5000,
    };
  }

  if (task.task_name.includes("click")) {
    return {
      task_id: task.task_id,
      session_id: task.session_id,
      status: "success",
      result: {
        action: "click",
        element_found: true,
        page_loaded: true,
        new_url: "https://example.com/page2",
      },
      screenshots: ["https://example.com/screenshot_after_click.png"],
      tokens_used: 3000,
      cost_usd: 0.01,
      execution_time_ms: 2000,
    };
  }

  // Default response
  return {
    task_id: task.task_id,
    session_id: task.session_id,
    status: "success",
    result: {
      task_executed: true,
      message: `Executed task: ${task.task_name}`,
    },
    screenshots: [],
    tokens_used: 5000,
    cost_usd: 0.015,
    execution_time_ms: 3000,
  };
}

// Main handler
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const task = await req.json() as AgentBrowserTask;

    // Validate required fields
    if (!task.session_id || !task.task_id || !task.user_id || !task.task_name) {
      throw new Error("Missing required task fields");
    }

    const response = await executeAgentBrowserTask(task);

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
