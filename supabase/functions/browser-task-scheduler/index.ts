import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface TaskQueueItem {
  id: string;
  session_id: string;
  task_name: string;
  priority: number;
  scheduled_time?: string;
  max_retries: number;
  attempt_count: number;
  last_error?: string;
}

interface ScheduleResponse {
  task_id: string;
  status: string;
  scheduled_time?: string;
  message: string;
}

interface ExecuteResponse {
  task_id: string;
  status: string;
  execution_time_ms: number;
  attempts: number;
  message: string;
}

const RETRY_DELAYS = [2000, 4000, 8000]; // Exponential backoff: 2s, 4s, 8s

async function getTask(taskId: string) {
  const client = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data, error } = await client
      .from("browser_automation_tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Failed to fetch task:", error);
    return null;
  }
}

async function updateTaskStatus(
  taskId: string,
  userId: string,
  status: string,
  updateData?: Record<string, unknown>
) {
  const client = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data, error } = await client
      .from("browser_automation_tasks")
      .update({
        status,
        updated_at: new Date().toISOString(),
        ...updateData,
      })
      .eq("id", taskId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Failed to update task status:", error);
    return null;
  }
}

async function getTasksInQueue(
  sessionId: string,
  userId: string
): Promise<TaskQueueItem[]> {
  const client = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get pending and queued tasks, ordered by priority and created_at
    const { data, error } = await client
      .from("browser_automation_tasks")
      .select("id, session_id, task_name, priority, scheduled_time, max_retries, attempt_count, last_error")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .in("status", ["pending", "queued"])
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Failed to get task queue:", error);
    return [];
  }
}

async function checkTaskDependencies(taskId: string): Promise<boolean> {
  const client = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const task = await getTask(taskId);
    if (!task || !task.depends_on_task_id) return true; // No dependencies

    // Check if the dependency task is completed
    const { data: dependencyTask, error } = await client
      .from("browser_automation_tasks")
      .select("status")
      .eq("id", task.depends_on_task_id)
      .single();

    if (error) {
      console.error("Failed to check dependency:", error);
      return false;
    }

    return dependencyTask.status === "completed";
  } catch (error) {
    console.error("Error checking task dependencies:", error);
    return false;
  }
}

async function scheduleTask(
  taskId: string,
  userId: string,
  scheduledTime?: Date
): Promise<ScheduleResponse> {
  try {
    const task = await getTask(taskId);
    if (!task) throw new Error("Task not found");

    // Check dependencies before scheduling
    const canExecute = await checkTaskDependencies(taskId);
    if (!canExecute) {
      throw new Error("Task dependencies not satisfied");
    }

    // Calculate scheduled time
    let scheduleTimestamp = scheduledTime
      ? scheduledTime.toISOString()
      : new Date().toISOString();

    // If scheduled time is in the past, schedule for immediate execution
    if (new Date(scheduleTimestamp) < new Date()) {
      scheduleTimestamp = new Date().toISOString();
    }

    // Update task with scheduled time and queued status
    await updateTaskStatus(taskId, userId, "queued", {
      scheduled_time: scheduleTimestamp,
      updated_at: new Date().toISOString(),
    });

    return {
      task_id: taskId,
      status: "queued",
      scheduled_time: scheduleTimestamp,
      message: `Task scheduled for ${scheduleTimestamp}`,
    };
  } catch (error) {
    throw new Error(
      `Failed to schedule task: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

async function executeNextTask(
  sessionId: string,
  userId: string
): Promise<ExecuteResponse> {
  const startTime = Date.now();

  try {
    // Get all queued/pending tasks
    const queue = await getTasksInQueue(sessionId, userId);

    if (queue.length === 0) {
      return {
        task_id: "",
        status: "no_tasks",
        execution_time_ms: 0,
        attempts: 0,
        message: "No tasks in queue",
      };
    }

    // Find next executable task
    let nextTask = null;
    for (const queueItem of queue) {
      const isDependencyMet = await checkTaskDependencies(queueItem.id);
      if (isDependencyMet) {
        nextTask = queueItem;
        break;
      }
    }

    if (!nextTask) {
      return {
        task_id: "",
        status: "blocked",
        execution_time_ms: 0,
        attempts: 0,
        message: "All tasks are blocked by dependencies",
      };
    }

    // Check if task has scheduled time that hasn't arrived yet
    const task = await getTask(nextTask.id);
    if (task.scheduled_time) {
      const scheduledTime = new Date(task.scheduled_time);
      const now = new Date();
      if (scheduledTime > now) {
        const delayMs = scheduledTime.getTime() - now.getTime();
        return {
          task_id: nextTask.id,
          status: "scheduled",
          execution_time_ms: delayMs,
          attempts: 0,
          message: `Task will execute in ${Math.ceil(delayMs / 1000)} seconds`,
        };
      }
    }

    // Mark task as executing
    await updateTaskStatus(nextTask.id, userId, "executing", {
      attempt_count: nextTask.attempt_count + 1,
      started_at: new Date().toISOString(),
    });

    // In production, this would call the actual task executor
    // For now, we simulate successful execution
    const executorResponse = await simulateTaskExecution(nextTask);

    const executionTime = Date.now() - startTime;

    // Update task with result
    if (executorResponse.success) {
      await updateTaskStatus(nextTask.id, userId, "completed", {
        result: executorResponse.result,
        success: true,
        execution_time_ms: executionTime,
        completed_at: new Date().toISOString(),
      });

      return {
        task_id: nextTask.id,
        status: "completed",
        execution_time_ms: executionTime,
        attempts: nextTask.attempt_count + 1,
        message: `Task completed successfully`,
      };
    } else {
      throw new Error(executorResponse.error || "Task execution failed");
    }
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    console.error("Task execution error:", errorMessage);

    // Task will be retried by retry handler
    return {
      task_id: "",
      status: "failed",
      execution_time_ms: executionTime,
      attempts: 1,
      message: `Execution failed: ${errorMessage}`,
    };
  }
}

async function retryTask(
  taskId: string,
  userId: string
): Promise<ExecuteResponse> {
  const startTime = Date.now();

  try {
    const task = await getTask(taskId);
    if (!task) throw new Error("Task not found");

    const attemptCount = task.attempt_count || 0;

    // Check if max retries exceeded
    if (attemptCount >= task.max_retries) {
      await updateTaskStatus(taskId, userId, "failed", {
        last_error: `Max retries (${task.max_retries}) exceeded`,
      });

      return {
        task_id: taskId,
        status: "failed",
        execution_time_ms: 0,
        attempts: attemptCount,
        message: `Max retries exceeded for task ${taskId}`,
      };
    }

    // Calculate retry delay (exponential backoff)
    const retryDelayMs =
      RETRY_DELAYS[Math.min(attemptCount, RETRY_DELAYS.length - 1)];

    // Schedule retry
    const retryTime = new Date(Date.now() + retryDelayMs);
    await scheduleTask(taskId, userId, retryTime);

    const executionTime = Date.now() - startTime;

    return {
      task_id: taskId,
      status: "scheduled_retry",
      execution_time_ms: executionTime,
      attempts: attemptCount,
      message: `Task will retry in ${retryDelayMs / 1000} seconds (attempt ${attemptCount + 1}/${task.max_retries})`,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;

    return {
      task_id: taskId,
      status: "failed",
      execution_time_ms: executionTime,
      attempts: 0,
      message: `Failed to schedule retry: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

async function cancelTask(
  taskId: string,
  userId: string
): Promise<{ task_id: string; status: string; message: string }> {
  try {
    const task = await getTask(taskId);
    if (!task) throw new Error("Task not found");

    // Can only cancel pending/queued tasks
    if (!["pending", "queued"].includes(task.status)) {
      throw new Error(
        `Cannot cancel task with status: ${task.status}`
      );
    }

    await updateTaskStatus(taskId, userId, "cancelled", {
      completed_at: new Date().toISOString(),
    });

    return {
      task_id: taskId,
      status: "cancelled",
      message: `Task ${taskId} cancelled successfully`,
    };
  } catch (error) {
    throw new Error(
      `Failed to cancel task: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

async function getQueueStatus(
  sessionId: string,
  userId: string
): Promise<{
  total_tasks: number;
  pending: number;
  queued: number;
  executing: number;
  completed: number;
  failed: number;
}> {
  const client = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data, error } = await client
      .from("browser_automation_tasks")
      .select("status")
      .eq("session_id", sessionId)
      .eq("user_id", userId);

    if (error) throw error;

    const statuses = (data || []).map((t: { status: string }) => t.status);

    return {
      total_tasks: statuses.length,
      pending: statuses.filter((s) => s === "pending").length,
      queued: statuses.filter((s) => s === "queued").length,
      executing: statuses.filter((s) => s === "executing").length,
      completed: statuses.filter((s) => s === "completed").length,
      failed: statuses.filter((s) => s === "failed").length,
    };
  } catch (error) {
    console.error("Failed to get queue status:", error);
    return {
      total_tasks: 0,
      pending: 0,
      queued: 0,
      executing: 0,
      completed: 0,
      failed: 0,
    };
  }
}

/**
 * Simulate task execution (placeholder for actual executor)
 */
async function simulateTaskExecution(
  task: TaskQueueItem
): Promise<{ success: boolean; result?: Record<string, unknown>; error?: string }> {
  // Simulate execution with 90% success rate
  const success = Math.random() > 0.1;

  if (success) {
    return {
      success: true,
      result: {
        task_id: task.id,
        task_name: task.task_name,
        executed_at: new Date().toISOString(),
        output: "Task completed successfully",
      },
    };
  } else {
    return {
      success: false,
      error: "Simulated execution error",
    };
  }
}

// Main handler
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, data } = await req.json();

    let response: unknown;

    switch (action) {
      case "schedule_task":
        response = await scheduleTask(
          data.task_id,
          data.user_id,
          data.scheduled_time ? new Date(data.scheduled_time) : undefined
        );
        break;

      case "execute_next":
        response = await executeNextTask(data.session_id, data.user_id);
        break;

      case "retry_task":
        response = await retryTask(data.task_id, data.user_id);
        break;

      case "cancel_task":
        response = await cancelTask(data.task_id, data.user_id);
        break;

      case "get_queue_status":
        response = await getQueueStatus(data.session_id, data.user_id);
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
