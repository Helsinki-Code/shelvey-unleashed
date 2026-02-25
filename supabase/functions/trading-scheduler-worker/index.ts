import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type JobType = "phase_task_generation" | "team_performance_snapshot" | "reconciliation" | "stage_progression";

const PHASE_TASK_BLUEPRINT: Record<number, Array<{
  teamType: "research" | "backtest" | "strategy" | "execution" | "risk" | "compliance";
  taskType: "research" | "backtest" | "strategy_design" | "deploy" | "monitor" | "risk_review" | "compliance_review";
  title: string;
  description: string;
  priority: "medium" | "high";
}>> = {
  1: [
    {
      teamType: "research",
      taskType: "research",
      title: "Research market context for active symbols",
      description: "Compile real market/account/order activity context for this project.",
      priority: "medium",
    },
  ],
  2: [
    {
      teamType: "backtest",
      taskType: "backtest",
      title: "Backtest candidate strategy assumptions",
      description: "Use real candidate and execution history to validate baseline signals.",
      priority: "high",
    },
    {
      teamType: "strategy",
      taskType: "strategy_design",
      title: "Refine strategy parameters from backtest results",
      description: "Map approved candidate parameters to deployable strategy configuration.",
      priority: "high",
    },
  ],
  3: [
    {
      teamType: "strategy",
      taskType: "strategy_design",
      title: "Prepare strategy for paper/staged deployment",
      description: "Validate lifecycle approvals and deployment readiness.",
      priority: "high",
    },
    {
      teamType: "risk",
      taskType: "risk_review",
      title: "Run pre-deployment risk review",
      description: "Assess risk controls against current portfolio and execution profile.",
      priority: "high",
    },
  ],
  4: [
    {
      teamType: "execution",
      taskType: "deploy",
      title: "Deploy approved strategy set",
      description: "Ensure approved strategies are wired for execution flow.",
      priority: "high",
    },
  ],
  5: [
    {
      teamType: "execution",
      taskType: "monitor",
      title: "Monitor live/paper execution quality",
      description: "Track fill quality and execution consistency vs project risk limits.",
      priority: "high",
    },
    {
      teamType: "risk",
      taskType: "risk_review",
      title: "Continuous risk review",
      description: "Validate real-time risk posture and drawdown boundaries.",
      priority: "high",
    },
  ],
  6: [
    {
      teamType: "backtest",
      taskType: "backtest",
      title: "Post-cycle strategy performance backtest",
      description: "Re-run evaluation with latest execution data for iteration inputs.",
      priority: "medium",
    },
    {
      teamType: "compliance",
      taskType: "compliance_review",
      title: "Compliance and audit review",
      description: "Reconcile lifecycle approvals, transitions, and execution records.",
      priority: "medium",
    },
  ],
};

const STAGES = ["research", "backtest", "paper", "staged_live", "full_live"] as const;
type Stage = (typeof STAGES)[number];

function nextStage(stage: Stage): Stage | null {
  const idx = STAGES.indexOf(stage);
  if (idx < 0 || idx >= STAGES.length - 1) return null;
  return STAGES[idx + 1];
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBrokerStatus(status: string | null | undefined): string {
  const normalized = String(status || "").toLowerCase();
  if (["filled", "partially_filled"].includes(normalized)) return "executed";
  if (["canceled", "cancelled", "expired", "replaced"].includes(normalized)) return "cancelled";
  if (["rejected"].includes(normalized)) return "failed";
  if (["new", "accepted", "pending_new", "pending_cancel", "pending_replace"].includes(normalized)) return "approved";
  return "unknown";
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function resolveUser(
  supabase: ReturnType<typeof createClient>,
  req: Request,
  internalUserId?: string,
) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (token === serviceRoleKey && internalUserId) {
    return { userId: internalUserId, isServiceCall: true };
  }

  if (!token) return { userId: null, isServiceCall: false };
  const { data: { user } } = await supabase.auth.getUser(token);
  return { userId: user?.id || null, isServiceCall: false };
}

async function startJobRun(
  supabase: ReturnType<typeof createClient>,
  jobType: JobType,
  projectId: string | null,
  userId: string | null,
) {
  const { data, error } = await supabase
    .from("trading_scheduler_runs")
    .insert({
      job_type: jobType,
      project_id: projectId,
      user_id: userId,
      status: "running",
      details: {},
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(`Failed to create scheduler run: ${error?.message || "unknown"}`);
  return data.id as string;
}

async function finishJobRun(
  supabase: ReturnType<typeof createClient>,
  runId: string,
  status: "completed" | "failed",
  details: Record<string, unknown>,
  errorMessage?: string,
) {
  await supabase
    .from("trading_scheduler_runs")
    .update({
      status,
      details,
      error_message: errorMessage || null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", runId);
}

async function ensureTeamsForPhase(
  supabase: ReturnType<typeof createClient>,
  projectId: string,
  userId: string,
  phaseNumber: number,
) {
  const blueprint = PHASE_TASK_BLUEPRINT[phaseNumber] || [];
  if (blueprint.length === 0) return [] as any[];

  const { data: existingTeams, error: existingError } = await supabase
    .from("trading_teams")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", userId);
  if (existingError) throw existingError;

  const existing = existingTeams || [];
  const requiredTypes = Array.from(new Set(blueprint.map((task) => task.teamType)));
  const missing = requiredTypes.filter((teamType) => !existing.some((team: any) => team.team_type === teamType));

  if (missing.length > 0) {
    const inserts = missing.map((teamType) => ({
      project_id: projectId,
      user_id: userId,
      team_type: teamType,
      name: `${teamType.charAt(0).toUpperCase()}${teamType.slice(1)} Team`,
      status: "active",
      metadata: { auto_created: true, reason: "phase_task_generation" },
    }));
    const { error: insertError } = await supabase.from("trading_teams").insert(inserts);
    if (insertError) throw insertError;
  }

  const { data: refreshedTeams, error: refreshError } = await supabase
    .from("trading_teams")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", userId);
  if (refreshError) throw refreshError;
  return refreshedTeams || [];
}

async function buildTaskOutput(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  projectId: string,
  taskType: string,
) {
  const [riskRes, phaseRes, candidateRes, strategyRes, orderRes, executionRes] = await Promise.all([
    supabase.from("trading_risk_controls").select("*").eq("project_id", projectId).eq("user_id", userId).single(),
    supabase.from("trading_project_phases").select("phase_number,status,ceo_approved,user_approved").eq("project_id", projectId).eq("user_id", userId),
    supabase.from("trading_strategy_candidates").select("id,name,current_stage,status,risk_score,expected_return,max_drawdown,sharpe_ratio").eq("project_id", projectId).eq("user_id", userId),
    supabase.from("trading_strategies").select("id,name,is_active,paper_mode,lifecycle_stage,total_profit,total_trades,win_rate").eq("project_id", projectId).eq("user_id", userId),
    supabase.from("trading_orders").select("id,status,side,symbol,created_at,executed_at,reconciliation_status").eq("project_id", projectId).eq("user_id", userId).order("created_at", { ascending: false }).limit(300),
    supabase.from("trading_executions").select("id,profit_loss,executed_at,symbol,action").eq("user_id", userId).order("executed_at", { ascending: false }).limit(300),
  ]);

  const risk = riskRes.data || null;
  const phases = phaseRes.data || [];
  const candidates = candidateRes.data || [];
  const strategies = strategyRes.data || [];
  const orders = orderRes.data || [];
  const executions = executionRes.data || [];

  const now = Date.now();
  const last24h = executions.filter((exec: any) => {
    const ts = exec.executed_at ? new Date(exec.executed_at).getTime() : 0;
    return ts >= now - 24 * 60 * 60 * 1000;
  });
  const pnl24h = last24h.reduce((sum: number, exec: any) => sum + toNumber(exec.profit_loss, 0), 0);

  const base = {
    generated_at: new Date().toISOString(),
    source: "trading-scheduler-worker",
    project_id: projectId,
    phase_summary: phases,
  };

  if (taskType === "research") {
    return {
      ...base,
      candidates: candidates.map((candidate: any) => ({
        id: candidate.id,
        name: candidate.name,
        stage: candidate.current_stage,
        status: candidate.status,
      })),
      market_activity: {
        recent_orders: orders.slice(0, 20),
        executions_24h: last24h.length,
      },
    };
  }

  if (taskType === "backtest") {
    return {
      ...base,
      candidate_metrics: candidates.map((candidate: any) => ({
        id: candidate.id,
        name: candidate.name,
        stage: candidate.current_stage,
        risk_score: toNumber(candidate.risk_score, 0),
        expected_return: toNumber(candidate.expected_return, 0),
        max_drawdown: toNumber(candidate.max_drawdown, 0),
        sharpe_ratio: toNumber(candidate.sharpe_ratio, 0),
      })),
      execution_sample_size: executions.length,
    };
  }

  if (taskType === "strategy_design") {
    return {
      ...base,
      strategy_inventory: strategies.map((strategy: any) => ({
        id: strategy.id,
        name: strategy.name,
        lifecycle_stage: strategy.lifecycle_stage,
        paper_mode: strategy.paper_mode,
        is_active: strategy.is_active,
      })),
      candidate_inventory: candidates.map((candidate: any) => ({
        id: candidate.id,
        name: candidate.name,
        current_stage: candidate.current_stage,
        status: candidate.status,
      })),
    };
  }

  if (taskType === "deploy") {
    const deployable = strategies.filter((strategy: any) =>
      ["paper", "staged_live", "full_live"].includes(String(strategy.lifecycle_stage || "")));
    return {
      ...base,
      deployable_strategy_count: deployable.length,
      deployable_strategies: deployable,
      open_orders: orders.filter((order: any) => ["approved", "pending_approval"].includes(order.status)).length,
    };
  }

  if (taskType === "monitor") {
    return {
      ...base,
      live_orders: orders.filter((order: any) => order.status === "executed").slice(0, 50),
      pnl_24h: pnl24h,
      executions_24h: last24h.length,
      reconciliation: {
        pending: orders.filter((order: any) => order.reconciliation_status === "pending").length,
        mismatched: orders.filter((order: any) => order.reconciliation_status === "mismatched").length,
      },
    };
  }

  if (taskType === "risk_review") {
    return {
      ...base,
      risk_controls: risk,
      realized_pnl_24h: pnl24h,
      active_strategy_count: strategies.filter((strategy: any) => strategy.is_active).length,
    };
  }

  return {
    ...base,
    lifecycle: {
      candidates: candidates.map((candidate: any) => ({
        id: candidate.id,
        name: candidate.name,
        stage: candidate.current_stage,
        status: candidate.status,
      })),
      strategies: strategies.map((strategy: any) => ({
        id: strategy.id,
        name: strategy.name,
        lifecycle_stage: strategy.lifecycle_stage,
      })),
    },
    reconciliation_summary: {
      pending: orders.filter((order: any) => order.reconciliation_status === "pending").length,
      mismatched: orders.filter((order: any) => order.reconciliation_status === "mismatched").length,
      matched: orders.filter((order: any) => order.reconciliation_status === "matched").length,
    },
  };
}

async function runPhaseTaskGeneration(
  supabase: ReturnType<typeof createClient>,
  projectId: string,
  userId: string,
  phaseNumber?: number,
) {
  const { data: project, error: projectError } = await supabase
    .from("trading_projects")
    .select("id,user_id,current_phase")
    .eq("id", projectId)
    .eq("user_id", userId)
    .single();
  if (projectError || !project) throw new Error("Project not found for phase task generation");

  const targetPhase = Number(phaseNumber || project.current_phase || 1);
  const blueprint = PHASE_TASK_BLUEPRINT[targetPhase] || [];
  if (blueprint.length === 0) {
    return { created: 0, completed: 0, phaseNumber: targetPhase, reason: "no_blueprint" };
  }

  const teams = await ensureTeamsForPhase(supabase, projectId, userId, targetPhase);
  const teamByType = new Map(teams.map((team: any) => [team.team_type, team]));

  const { data: phase, error: phaseError } = await supabase
    .from("trading_project_phases")
    .select("id")
    .eq("project_id", projectId)
    .eq("phase_number", targetPhase)
    .single();
  if (phaseError || !phase) throw new Error("Project phase not found");

  let createdCount = 0;
  let completedCount = 0;

  for (const template of blueprint) {
    const team = teamByType.get(template.teamType);
    if (!team) continue;

    const inputPayload = { phaseNumber: targetPhase, autoGenerated: true };
    const { data: existingTask, error: existingError } = await supabase
      .from("trading_team_tasks")
      .select("id,status")
      .eq("project_id", projectId)
      .eq("team_id", team.id)
      .eq("user_id", userId)
      .eq("task_type", template.taskType)
      .eq("title", template.title)
      .contains("input_payload", inputPayload)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingError) throw existingError;

    let taskId = existingTask?.id as string | undefined;
    if (!taskId) {
      const { data: newTask, error: createError } = await supabase
        .from("trading_team_tasks")
        .insert({
          project_id: projectId,
          team_id: team.id,
          user_id: userId,
          task_type: template.taskType,
          title: template.title,
          description: template.description,
          priority: template.priority,
          status: "pending",
          input_payload: inputPayload,
        })
        .select("id")
        .single();
      if (createError || !newTask) throw new Error(createError?.message || "Failed to create team task");
      taskId = newTask.id;
      createdCount += 1;
    }

    const outputPayload = await buildTaskOutput(supabase, userId, projectId, template.taskType);
    const { error: completeError } = await supabase
      .from("trading_team_tasks")
      .update({
        status: "completed",
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        output_payload: outputPayload,
      })
      .eq("id", taskId)
      .eq("user_id", userId);
    if (completeError) throw completeError;
    completedCount += 1;
  }

  await supabase.from("trading_activity_logs").insert({
    project_id: projectId,
    phase_id: phase.id,
    user_id: userId,
    agent_id: "trading-scheduler-worker",
    agent_name: "Trading Scheduler Worker",
    action: `Generated ${createdCount} phase tasks and completed ${completedCount} using real project data`,
    status: "completed",
    details: { phaseNumber: targetPhase, createdCount, completedCount },
  });

  return { created: createdCount, completed: completedCount, phaseNumber: targetPhase };
}

async function runTeamSnapshotJob(
  supabase: ReturnType<typeof createClient>,
  projectId: string,
  userId: string,
) {
  const [teamsRes, tasksRes, candidatesRes, strategiesRes, executionsRes] = await Promise.all([
    supabase.from("trading_teams").select("id,name,team_type,status").eq("project_id", projectId).eq("user_id", userId),
    supabase.from("trading_team_tasks").select("team_id,status").eq("project_id", projectId).eq("user_id", userId),
    supabase.from("trading_strategy_candidates").select("id,source_team_id,promoted_strategy_id").eq("project_id", projectId).eq("user_id", userId),
    supabase.from("trading_strategies").select("id,promoted_from_candidate_id").eq("project_id", projectId).eq("user_id", userId),
    supabase.from("trading_executions").select("strategy_id,profit_loss").eq("user_id", userId).order("executed_at", { ascending: false }).limit(1500),
  ]);

  const teams = teamsRes.data || [];
  const tasks = tasksRes.data || [];
  const candidates = candidatesRes.data || [];
  const strategies = strategiesRes.data || [];
  const executions = executionsRes.data || [];

  const candidateTeamById = new Map(candidates.map((candidate: any) => [candidate.id, candidate.source_team_id]));
  const teamByStrategy = new Map<string, string>();
  strategies.forEach((strategy: any) => {
    const teamId = candidateTeamById.get(strategy.promoted_from_candidate_id);
    if (strategy.id && teamId) teamByStrategy.set(strategy.id, teamId);
  });

  const inserts = teams.map((team: any) => {
    const teamTasks = tasks.filter((task: any) => task.team_id === team.id);
    const teamExecutions = executions.filter((execution: any) => execution.strategy_id && teamByStrategy.get(execution.strategy_id) === team.id);
    const pnl = teamExecutions.reduce((sum: number, execution: any) => sum + toNumber(execution.profit_loss, 0), 0);
    const wins = teamExecutions.filter((execution: any) => toNumber(execution.profit_loss, 0) > 0).length;
    const winRate = teamExecutions.length > 0 ? (wins / teamExecutions.length) * 100 : 0;

    return {
      project_id: projectId,
      team_id: team.id,
      user_id: userId,
      pnl,
      pnl_percent: 0,
      active_tasks: teamTasks.filter((task: any) => task.status === "in_progress").length,
      completed_tasks: teamTasks.filter((task: any) => task.status === "completed").length,
      risk_events: teamTasks.filter((task: any) => task.status === "failed").length,
      win_rate: Number(winRate.toFixed(2)),
      snapshot_at: new Date().toISOString(),
    };
  });

  if (inserts.length > 0) {
    const { error } = await supabase.from("trading_team_performance_snapshots").insert(inserts);
    if (error) throw error;
  }

  return { snapshots: inserts.length };
}

async function invokeAlpacaGetOrders(
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  const { data, error } = await supabase.functions.invoke("mcp-alpaca", {
    body: {
      tool: "get_orders",
      arguments: { status: "all", limit: 500 },
      userId,
    },
  });

  if (error) throw error;
  if (data?.success === false) {
    throw new Error(data?.error || "Failed to pull broker orders");
  }

  return (data?.data || []) as any[];
}

async function runReconciliationJob(
  supabase: ReturnType<typeof createClient>,
  projectId: string,
  userId: string,
  runId: string,
) {
  const { data: project, error: projectError } = await supabase
    .from("trading_projects")
    .select("id,exchange,mode")
    .eq("id", projectId)
    .eq("user_id", userId)
    .single();
  if (projectError || !project) throw new Error("Project not found for reconciliation");

  if (project.exchange !== "alpaca") {
    return { checked: 0, matched: 0, mismatched: 0, skipped: "exchange_not_supported" };
  }

  const brokerOrders = await invokeAlpacaGetOrders(supabase, userId);
  const brokerById = new Map(
    brokerOrders
      .filter((order: any) => order?.id)
      .map((order: any) => [String(order.id), order]),
  );

  const { data: dbOrders, error: dbError } = await supabase
    .from("trading_orders")
    .select("id,project_id,user_id,status,broker_order_id,reconciliation_status")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .neq("status", "pending_approval")
    .order("created_at", { ascending: false })
    .limit(500);
  if (dbError) throw dbError;

  let matched = 0;
  let mismatched = 0;
  const updates: Array<Promise<any>> = [];
  const events: any[] = [];

  for (const order of dbOrders || []) {
    const brokerOrderId = order.broker_order_id ? String(order.broker_order_id) : null;
    if (!brokerOrderId) {
      mismatched += 1;
      updates.push(
        supabase
          .from("trading_orders")
          .update({
            reconciliation_status: "missing_broker_order",
            reconciled_at: new Date().toISOString(),
            reconciliation_notes: "Missing broker_order_id",
          })
          .eq("id", order.id)
          .eq("user_id", userId),
      );
      events.push({
        run_id: runId,
        project_id: projectId,
        user_id: userId,
        order_id: order.id,
        broker_order_id: null,
        db_status: order.status,
        broker_status: null,
        result: "missing_broker_order",
        notes: "DB order missing broker_order_id",
        payload: {},
      });
      continue;
    }

    const brokerOrder = brokerById.get(brokerOrderId);
    if (!brokerOrder) {
      mismatched += 1;
      updates.push(
        supabase
          .from("trading_orders")
          .update({
            reconciliation_status: "mismatched",
            reconciled_at: new Date().toISOString(),
            reconciliation_notes: "Broker order not found",
          })
          .eq("id", order.id)
          .eq("user_id", userId),
      );
      events.push({
        run_id: runId,
        project_id: projectId,
        user_id: userId,
        order_id: order.id,
        broker_order_id: brokerOrderId,
        db_status: order.status,
        broker_status: null,
        result: "mismatched",
        notes: "Broker order missing",
        payload: {},
      });
      continue;
    }

    const normalizedBroker = normalizeBrokerStatus(brokerOrder.status);
    const isMatch = normalizedBroker === order.status || (normalizedBroker === "approved" && order.status === "approved");

    updates.push(
      supabase
        .from("trading_orders")
        .update({
          reconciliation_status: isMatch ? "matched" : "mismatched",
          reconciled_at: new Date().toISOString(),
          reconciliation_notes: isMatch ? "Reconciled with broker order status" : `DB=${order.status} broker=${normalizedBroker}`,
        })
        .eq("id", order.id)
        .eq("user_id", userId),
    );

    if (isMatch) {
      matched += 1;
    } else {
      mismatched += 1;
      events.push({
        run_id: runId,
        project_id: projectId,
        user_id: userId,
        order_id: order.id,
        broker_order_id: brokerOrderId,
        db_status: order.status,
        broker_status: normalizedBroker,
        result: "mismatched",
        notes: "Status mismatch",
        payload: { broker_order: brokerOrder },
      });
    }
  }

  if (updates.length > 0) {
    await Promise.all(updates);
  }
  if (events.length > 0) {
    const { error } = await supabase.from("trading_reconciliation_events").insert(events);
    if (error) throw error;
  }

  return {
    checked: (dbOrders || []).length,
    matched,
    mismatched,
    brokerOrderCount: brokerOrders.length,
  };
}

async function runStageProgressionJob(
  supabase: ReturnType<typeof createClient>,
  projectId: string,
  userId: string,
) {
  const { data: candidates, error: candidateError } = await supabase
    .from("trading_strategy_candidates")
    .select("id,project_id,user_id,current_stage,status,source_team_id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .eq("status", "approved");
  if (candidateError) throw candidateError;

  let progressed = 0;

  for (const candidate of candidates || []) {
    const current = candidate.current_stage as Stage;
    if (!STAGES.includes(current)) continue;

    const next = nextStage(current);
    if (!next) {
      await supabase
        .from("trading_strategy_candidates")
        .update({ status: "deployed" })
        .eq("id", candidate.id)
        .eq("user_id", userId);
      continue;
    }

    const { data: approvals, error: approvalsError } = await supabase
      .from("trading_strategy_stage_approvals")
      .select("required_approver,status")
      .eq("candidate_id", candidate.id)
      .eq("stage", current)
      .eq("user_id", userId);
    if (approvalsError) throw approvalsError;

    const ceoApproved = (approvals || []).some((approval: any) => approval.required_approver === "ceo" && approval.status === "approved");
    const userApproved = (approvals || []).some((approval: any) => approval.required_approver === "user" && approval.status === "approved");
    if (!ceoApproved || !userApproved) continue;

    const { error: updateError } = await supabase
      .from("trading_strategy_candidates")
      .update({
        current_stage: next,
        status: "draft",
      })
      .eq("id", candidate.id)
      .eq("user_id", userId);
    if (updateError) throw updateError;

    await supabase.from("trading_stage_transition_events").insert({
      candidate_id: candidate.id,
      project_id: projectId,
      user_id: userId,
      from_stage: current,
      to_stage: next,
      reason: "auto_stage_progression",
      metadata: { scheduler: true },
    });

    progressed += 1;
  }

  return { progressed };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    );

    const { action, params } = await req.json();
    if (action !== "run_jobs") {
      return json({ success: false, error: "Unknown action" }, 400);
    }

    const internalUserId = params?.internalUserId ? String(params.internalUserId) : undefined;
    const { userId, isServiceCall } = await resolveUser(supabase, req, internalUserId);
    if (!userId) {
      return json({ success: false, error: "Unauthorized" }, 401);
    }

    const projectId = String(params?.projectId || "");
    if (!projectId) {
      return json({ success: false, error: "projectId is required" }, 400);
    }

    if (!isServiceCall) {
      const { data: ownedProject } = await supabase
        .from("trading_projects")
        .select("id")
        .eq("id", projectId)
        .eq("user_id", userId)
        .single();
      if (!ownedProject) return json({ success: false, error: "Project not found" }, 404);
    }

    const requestedJobTypes = Array.isArray(params?.jobTypes)
      ? params.jobTypes as JobType[]
      : (["phase_task_generation", "team_performance_snapshot", "reconciliation", "stage_progression"] as JobType[]);

    const summaries: Record<string, unknown> = {};

    for (const jobType of requestedJobTypes) {
      const runId = await startJobRun(supabase, jobType, projectId, userId);
      try {
        let details: Record<string, unknown> = {};
        if (jobType === "phase_task_generation") {
          details = await runPhaseTaskGeneration(supabase, projectId, userId, params?.phaseNumber);
        } else if (jobType === "team_performance_snapshot") {
          details = await runTeamSnapshotJob(supabase, projectId, userId);
        } else if (jobType === "reconciliation") {
          details = await runReconciliationJob(supabase, projectId, userId, runId);
        } else if (jobType === "stage_progression") {
          details = await runStageProgressionJob(supabase, projectId, userId);
        }
        await finishJobRun(supabase, runId, "completed", details);
        summaries[jobType] = details;
      } catch (error: any) {
        await finishJobRun(
          supabase,
          runId,
          "failed",
          {},
          error?.message || "Unknown job error",
        );
        summaries[jobType] = { error: error?.message || "Unknown job error" };
      }
    }

    return json({ success: true, summaries });
  } catch (error: any) {
    console.error("[trading-scheduler-worker] error:", error);
    return json({ success: false, error: error?.message || "Unknown error" }, 500);
  }
});
