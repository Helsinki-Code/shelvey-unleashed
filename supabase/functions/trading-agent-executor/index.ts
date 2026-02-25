import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PHASE_TASK_TYPES: Record<number, string[]> = {
  1: ["research"],
  2: ["backtest", "strategy_design"],
  3: ["strategy_design", "risk_review"],
  4: ["deploy"],
  5: ["monitor", "risk_review"],
  6: ["backtest", "compliance_review"],
};

async function fetchCompletedTasks(
  supabase: ReturnType<typeof createClient>,
  projectId: string,
  userId: string,
  taskTypes: string[],
) {
  const { data, error } = await supabase
    .from("trading_team_tasks")
    .select("id,title,task_type,output_payload,completed_at,updated_at,status")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .in("task_type", taskTypes)
    .eq("status", "completed")
    .order("completed_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function triggerPhaseTaskGeneration(
  projectId: string,
  phaseNumber: number,
  userId: string,
) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase environment is not configured");
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/trading-scheduler-worker`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${serviceRoleKey}`,
      "apikey": serviceRoleKey,
    },
    body: JSON.stringify({
      action: "run_jobs",
      params: {
        internalUserId: userId,
        projectId,
        phaseNumber,
        jobTypes: ["phase_task_generation"],
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || "Failed to auto-generate phase tasks");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { projectId, phaseNumber, userId } = await req.json();
    if (!projectId || !phaseNumber || !userId) {
      throw new Error("projectId, phaseNumber and userId are required");
    }

    const { data: phase, error: phaseError } = await supabase
      .from("trading_project_phases")
      .select("*")
      .eq("project_id", projectId)
      .eq("phase_number", phaseNumber)
      .single();

    if (phaseError || !phase) throw new Error("Phase not found");

    await supabase
      .from("trading_project_phases")
      .update({ status: "in_progress", started_at: new Date().toISOString() })
      .eq("id", phase.id);

    await supabase.from("trading_activity_logs").insert({
      project_id: projectId,
      phase_id: phase.id,
      user_id: userId,
      agent_id: phase.agent_id,
      agent_name: `${phase.phase_name} Agent`,
      action: `Collecting real task outputs for ${phase.phase_name}`,
      status: "in_progress",
      details: { phaseNumber },
    });

    const taskTypes = PHASE_TASK_TYPES[Number(phaseNumber)] || [];
    let completedTasks = await fetchCompletedTasks(supabase, projectId, userId, taskTypes);

    if (!completedTasks || completedTasks.length === 0) {
      await supabase.from("trading_activity_logs").insert({
        project_id: projectId,
        phase_id: phase.id,
        user_id: userId,
        agent_id: phase.agent_id,
        agent_name: `${phase.phase_name} Agent`,
        action: `No completed ${taskTypes.join(", ")} tasks found. Generating phase tasks from real project data.`,
        status: "in_progress",
        details: { taskTypesRequired: taskTypes, auto_generation: true },
      });

      await triggerPhaseTaskGeneration(projectId, Number(phaseNumber), userId);
      completedTasks = await fetchCompletedTasks(supabase, projectId, userId, taskTypes);
    }

    if (!completedTasks || completedTasks.length === 0) {
      await supabase
        .from("trading_project_phases")
        .update({ status: "in_progress" })
        .eq("id", phase.id);

      return new Response(
        JSON.stringify({
          success: false,
          error:
            "No real completed team tasks available for this phase after auto-generation. Synthetic deliverables are disabled.",
          requiredTaskTypes: taskTypes,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const workSteps = completedTasks.map((task: any, index: number) => ({
      step: index + 1,
      task_id: task.id,
      task_type: task.task_type,
      action: task.title,
      timestamp: task.completed_at || task.updated_at || new Date().toISOString(),
      result: "Completed task output attached",
    }));

    const deliverables = {
      source: "trading_team_tasks",
      phaseNumber,
      taskCount: completedTasks.length,
      taskTypes,
      outputs: completedTasks.map((task: any) => ({
        task_id: task.id,
        title: task.title,
        task_type: task.task_type,
        completed_at: task.completed_at || task.updated_at,
        output: task.output_payload || {},
      })),
    };

    await supabase
      .from("trading_project_phases")
      .update({
        status: "review",
        deliverables,
        agent_work_steps: workSteps,
      })
      .eq("id", phase.id);

    await supabase.from("trading_activity_logs").insert({
      project_id: projectId,
      phase_id: phase.id,
      user_id: userId,
      agent_id: phase.agent_id,
      agent_name: `${phase.phase_name} Agent`,
      action: `${phase.phase_name} phase ready for review using real task outputs`,
      status: "completed",
      details: { taskCount: completedTasks.length, taskTypes },
    });

    return new Response(JSON.stringify({ success: true, deliverables, workSteps }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Trading Agent Executor Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
