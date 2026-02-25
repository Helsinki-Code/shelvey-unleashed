import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const STAGES = ["research", "backtest", "paper", "staged_live", "full_live"] as const;
type Stage = (typeof STAGES)[number];

function stageIndex(stage: string) {
  return STAGES.indexOf(stage as Stage);
}

function assertNextStage(current: string, target: string) {
  const currentIdx = stageIndex(current);
  const targetIdx = stageIndex(target);
  if (currentIdx === -1 || targetIdx === -1) throw new Error("Invalid stage");
  if (targetIdx !== currentIdx + 1) {
    throw new Error(`Invalid promotion path. Must promote from ${current} to ${STAGES[currentIdx + 1]}`);
  }
}

function getNextStage(stage: string): Stage | null {
  const idx = stageIndex(stage);
  if (idx === -1 || idx >= STAGES.length - 1) return null;
  return STAGES[idx + 1];
}

async function invokeSchedulerWorker(
  projectId: string,
  internalUserId: string,
  jobTypes: string[],
  phaseNumber?: number,
) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Scheduler env missing");

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
        internalUserId,
        projectId,
        phaseNumber,
        jobTypes,
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || "Scheduler worker invocation failed");
  }

  return payload?.summaries || {};
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, params } = await req.json();

    switch (action) {
      case "create_team": {
        const { projectId, name, teamType, metadata } = params;
        const { data, error } = await supabase
          .from("trading_teams")
          .insert({
            project_id: projectId,
            user_id: user.id,
            name,
            team_type: teamType,
            metadata: metadata || {},
          })
          .select("*")
          .single();
        if (error) throw error;
        return json({ success: true, team: data });
      }

      case "add_team_member": {
        const { teamId, agentId, agentName, role, capabilities } = params;
        const { data, error } = await supabase
          .from("trading_team_members")
          .insert({
            team_id: teamId,
            user_id: user.id,
            agent_id: agentId,
            agent_name: agentName,
            role: role || "analyst",
            capabilities: capabilities || [],
          })
          .select("*")
          .single();
        if (error) throw error;
        return json({ success: true, member: data });
      }

      case "create_team_task": {
        const { projectId, teamId, assignedMemberId, taskType, title, description, priority, inputPayload } = params;
        const { data, error } = await supabase
          .from("trading_team_tasks")
          .insert({
            project_id: projectId,
            team_id: teamId,
            user_id: user.id,
            assigned_member_id: assignedMemberId || null,
            task_type: taskType,
            title,
            description: description || null,
            priority: priority || "medium",
            input_payload: inputPayload || {},
          })
          .select("*")
          .single();
        if (error) throw error;
        return json({ success: true, task: data });
      }

      case "create_strategy_candidate": {
        const { projectId, sourceTeamId, name, description, exchange, symbolUniverse, parameters } = params;
        const { data, error } = await supabase
          .from("trading_strategy_candidates")
          .insert({
            project_id: projectId,
            user_id: user.id,
            source_team_id: sourceTeamId || null,
            name,
            description: description || null,
            exchange: exchange || "alpaca",
            symbol_universe: symbolUniverse || [],
            parameters: parameters || {},
            current_stage: "research",
            status: "draft",
          })
          .select("*")
          .single();
        if (error) throw error;
        return json({ success: true, candidate: data });
      }

      case "submit_stage": {
        const { candidateId, stage, artifact, metrics } = params as {
          candidateId: string;
          stage: Stage;
          artifact?: Record<string, unknown>;
          metrics?: Record<string, unknown>;
        };

        const { data: candidate, error: candidateError } = await supabase
          .from("trading_strategy_candidates")
          .select("*")
          .eq("id", candidateId)
          .eq("user_id", user.id)
          .single();
        if (candidateError || !candidate) throw new Error("Strategy candidate not found");

        if (candidate.status === "in_review") {
          throw new Error("Candidate already has a stage pending approval");
        }

        const currentStage = candidate.current_stage as Stage;
        const nextStage = getNextStage(currentStage);

        if (stage !== currentStage && stage !== nextStage) {
          throw new Error(`Invalid stage submission from ${currentStage} to ${stage}`);
        }
        if (stage === currentStage && candidate.status !== "draft") {
          throw new Error(`Current stage ${currentStage} already submitted/approved`);
        }

        const artifacts = { ...(candidate.stage_artifacts || {}), [stage]: artifact || {} };
        const patch: Record<string, unknown> = {
          stage_artifacts: artifacts,
          status: "in_review",
        };
        if (metrics?.risk_score !== undefined) patch.risk_score = metrics.risk_score;
        if (metrics?.expected_return !== undefined) patch.expected_return = metrics.expected_return;
        if (metrics?.max_drawdown !== undefined) patch.max_drawdown = metrics.max_drawdown;
        if (metrics?.sharpe_ratio !== undefined) patch.sharpe_ratio = metrics.sharpe_ratio;

        const { error: updateError } = await supabase
          .from("trading_strategy_candidates")
          .update(patch)
          .eq("id", candidateId);
        if (updateError) throw updateError;

        const approvals = [
          { required_approver: "ceo" },
          { required_approver: "user" },
        ];

        for (const approval of approvals) {
          await supabase
            .from("trading_strategy_stage_approvals")
            .upsert({
              candidate_id: candidateId,
              project_id: candidate.project_id,
              user_id: user.id,
              stage,
              required_approver: approval.required_approver,
              status: "pending",
              feedback: null,
              approved_by: null,
              approved_at: null,
            }, {
              onConflict: "candidate_id,stage,required_approver",
            });
        }

        return json({ success: true, message: `${stage} submitted for approval` });
      }

      case "approve_stage": {
        const { candidateId, stage, approverType, approved, feedback } = params as {
          candidateId: string;
          stage: Stage;
          approverType: "ceo" | "user";
          approved: boolean;
          feedback?: string;
        };

        const { data: approval, error: approvalError } = await supabase
          .from("trading_strategy_stage_approvals")
          .select("*")
          .eq("candidate_id", candidateId)
          .eq("stage", stage)
          .eq("required_approver", approverType)
          .eq("user_id", user.id)
          .single();

        if (approvalError || !approval) throw new Error("Approval checkpoint not found");

        const { error: updateError } = await supabase
          .from("trading_strategy_stage_approvals")
          .update({
            status: approved ? "approved" : "rejected",
            approved_by: approved ? user.id : null,
            approved_at: approved ? new Date().toISOString() : null,
            feedback: feedback || null,
          })
          .eq("id", approval.id);
        if (updateError) throw updateError;

        if (!approved) {
          await supabase
            .from("trading_strategy_candidates")
            .update({ status: "rejected" })
            .eq("id", candidateId)
            .eq("user_id", user.id);
          return json({ success: true, message: `${stage} rejected by ${approverType}` });
        }

        const { data: stageApprovals } = await supabase
          .from("trading_strategy_stage_approvals")
          .select("status")
          .eq("candidate_id", candidateId)
          .eq("stage", stage)
          .eq("user_id", user.id);

        const allApproved = (stageApprovals || []).length >= 2 &&
          (stageApprovals || []).every((a: any) => a.status === "approved");

        if (allApproved) {
          const { data: candidate } = await supabase
            .from("trading_strategy_candidates")
            .select("*")
            .eq("id", candidateId)
            .eq("user_id", user.id)
            .single();

          if (!candidate) throw new Error("Candidate not found");

          await supabase
            .from("trading_strategy_candidates")
            .update({ status: "approved", current_stage: stage })
            .eq("id", candidateId)
            .eq("user_id", user.id);

          await supabase.from("trading_stage_transition_events").insert({
            candidate_id: candidateId,
            project_id: candidate.project_id,
            user_id: user.id,
            from_stage: candidate.current_stage,
            to_stage: stage,
            reason: "approved",
            metadata: { approved_by: approverType },
          });

          // Keep promoted strategy in sync with approved stage.
          if (candidate.promoted_strategy_id) {
            await supabase
              .from("trading_strategies")
              .update({
                lifecycle_stage: stage,
                paper_mode: stage !== "full_live" && stage !== "staged_live",
                ceo_approved: true,
                user_approved: true,
                last_stage_transition_at: new Date().toISOString(),
              })
              .eq("id", candidate.promoted_strategy_id)
              .eq("user_id", user.id);
          } else if (stage === "paper" || stage === "staged_live" || stage === "full_live") {
            const strategyType = String(candidate.parameters?.strategy_type || "momentum");
            const { data: strategy, error: strategyError } = await supabase
              .from("trading_strategies")
              .insert({
                user_id: user.id,
                project_id: candidate.project_id,
                name: candidate.name,
                exchange: candidate.exchange,
                strategy_type: strategyType,
                parameters: candidate.parameters || {},
                paper_mode: stage !== "full_live" && stage !== "staged_live",
                lifecycle_stage: stage,
                promoted_from_candidate_id: candidate.id,
                ceo_approved: true,
                user_approved: true,
                is_active: false,
                last_stage_transition_at: new Date().toISOString(),
              })
              .select("id")
              .single();
            if (strategyError || !strategy) {
              throw new Error("Failed to create promoted strategy");
            }
            await supabase
              .from("trading_strategy_candidates")
              .update({ promoted_strategy_id: strategy.id })
              .eq("id", candidateId)
              .eq("user_id", user.id);
          }
        }

        return json({
          success: true,
          allApproved,
          message: `${stage} approved by ${approverType}`,
        });
      }

      case "promote_candidate": {
        const { candidateId, targetStage } = params as { candidateId: string; targetStage: Stage };
        const { data: candidate, error: candidateError } = await supabase
          .from("trading_strategy_candidates")
          .select("*")
          .eq("id", candidateId)
          .eq("user_id", user.id)
          .single();
        if (candidateError || !candidate) throw new Error("Candidate not found");

        assertNextStage(candidate.current_stage, targetStage);

        const { data: approvals } = await supabase
          .from("trading_strategy_stage_approvals")
          .select("required_approver,status")
          .eq("candidate_id", candidateId)
          .eq("stage", targetStage)
          .eq("user_id", user.id);

        const ceoApproved = (approvals || []).some((a: any) => a.required_approver === "ceo" && a.status === "approved");
        const userApproved = (approvals || []).some((a: any) => a.required_approver === "user" && a.status === "approved");
        if (!ceoApproved || !userApproved) {
          throw new Error(`${targetStage} requires CEO and user approvals before promotion`);
        }

        let strategyId = candidate.promoted_strategy_id;
        if (!strategyId) {
          const strategyType = String(candidate.parameters?.strategy_type || "momentum");
          const { data: strategy, error: strategyError } = await supabase
            .from("trading_strategies")
            .insert({
              user_id: user.id,
              project_id: candidate.project_id,
              name: candidate.name,
              exchange: candidate.exchange,
              strategy_type: strategyType,
              parameters: candidate.parameters || {},
              paper_mode: targetStage !== "full_live" && targetStage !== "staged_live",
              lifecycle_stage: targetStage,
              promoted_from_candidate_id: candidate.id,
              ceo_approved: true,
              user_approved: true,
              is_active: false,
              last_stage_transition_at: new Date().toISOString(),
            })
            .select("id")
            .single();
          if (strategyError || !strategy) throw new Error("Failed to create strategy from candidate");
          strategyId = strategy.id;
        } else {
          await supabase
            .from("trading_strategies")
            .update({
              lifecycle_stage: targetStage,
              paper_mode: targetStage !== "full_live" && targetStage !== "staged_live",
              ceo_approved: true,
              user_approved: true,
              last_stage_transition_at: new Date().toISOString(),
            })
            .eq("id", strategyId)
            .eq("user_id", user.id);
        }

        await supabase
          .from("trading_strategy_candidates")
          .update({
            current_stage: targetStage,
            promoted_strategy_id: strategyId,
            status: targetStage === "full_live" ? "deployed" : "approved",
          })
          .eq("id", candidateId)
          .eq("user_id", user.id);

        await supabase.from("trading_stage_transition_events").insert({
          candidate_id: candidateId,
          project_id: candidate.project_id,
          user_id: user.id,
          from_stage: candidate.current_stage,
          to_stage: targetStage,
          reason: "manual_promote",
          metadata: {},
        });

        return json({ success: true, strategyId, stage: targetStage });
      }

      case "generate_phase_tasks": {
        const { projectId, phaseNumber } = params as { projectId: string; phaseNumber?: number };
        const summaries = await invokeSchedulerWorker(projectId, user.id, ["phase_task_generation"], phaseNumber);
        return json({ success: true, summaries });
      }

      case "run_worker_jobs": {
        const { projectId, phaseNumber, jobTypes } = params as {
          projectId: string;
          phaseNumber?: number;
          jobTypes?: string[];
        };
        const requested = (jobTypes && jobTypes.length > 0)
          ? jobTypes
          : ["phase_task_generation", "team_performance_snapshot", "reconciliation", "stage_progression"];
        const summaries = await invokeSchedulerWorker(projectId, user.id, requested, phaseNumber);
        return json({ success: true, summaries });
      }

      case "get_live_dashboard": {
        const { projectId } = params as { projectId: string };

        const [
          teamsRes,
          tasksRes,
          candidatesRes,
          strategiesRes,
          approvalsRes,
          riskRes,
          executionsRes,
          transitionsRes,
          schedulerRunsRes,
          reconciliationRes,
          snapshotsRes,
        ] = await Promise.all([
          supabase.from("trading_teams").select("*").eq("project_id", projectId).eq("user_id", user.id),
          supabase.from("trading_team_tasks").select("*").eq("project_id", projectId).eq("user_id", user.id),
          supabase.from("trading_strategy_candidates").select("*").eq("project_id", projectId).eq("user_id", user.id),
          supabase.from("trading_strategies").select("*").eq("project_id", projectId).eq("user_id", user.id),
          supabase.from("trading_strategy_stage_approvals").select("*").eq("project_id", projectId).eq("user_id", user.id),
          supabase.from("trading_risk_controls").select("*").eq("project_id", projectId).eq("user_id", user.id).single(),
          supabase.from("trading_executions").select("*").eq("user_id", user.id).order("executed_at", { ascending: false }).limit(1000),
          supabase.from("trading_stage_transition_events").select("*").eq("project_id", projectId).eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
          supabase.from("trading_scheduler_runs").select("*").eq("project_id", projectId).eq("user_id", user.id).order("started_at", { ascending: false }).limit(20),
          supabase.from("trading_reconciliation_events").select("*").eq("project_id", projectId).eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
          supabase.from("trading_team_performance_snapshots").select("*").eq("project_id", projectId).eq("user_id", user.id).order("snapshot_at", { ascending: false }).limit(40),
        ]);

        const teams = teamsRes.data || [];
        const tasks = tasksRes.data || [];
        const candidates = candidatesRes.data || [];
        const strategies = strategiesRes.data || [];
        const approvals = approvalsRes.data || [];
        const allExecutions = executionsRes.data || [];
        const transitions = transitionsRes.data || [];
        const schedulerRuns = schedulerRunsRes.data || [];
        const reconciliationEvents = reconciliationRes.data || [];
        const snapshots = snapshotsRes.data || [];

        const strategyIds = new Set(strategies.map((s: any) => s.id));
        const strategyExecutions = allExecutions.filter((e: any) => e.strategy_id && strategyIds.has(e.strategy_id));

        const strategyMetrics = strategies.map((strategy: any) => {
          const executions = strategyExecutions.filter((e: any) => e.strategy_id === strategy.id);
          const pnl = executions.reduce((sum: number, e: any) => sum + Number(e.profit_loss || 0), 0);
          const totalTrades = executions.length;
          const wins = executions.filter((e: any) => Number(e.profit_loss || 0) > 0).length;
          const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
          return {
            id: strategy.id,
            name: strategy.name,
            lifecycle_stage: strategy.lifecycle_stage,
            is_active: strategy.is_active,
            paper_mode: strategy.paper_mode,
            pnl,
            totalTrades,
            winRate: Number(winRate.toFixed(2)),
          };
        });

        const lifecycleCounts = STAGES.reduce((acc: Record<string, number>, stage) => {
          acc[stage] = strategies.filter((s: any) => s.lifecycle_stage === stage).length;
          return acc;
        }, {});

        const realizedPnLToday = allExecutions
          .filter((e: any) => {
            const executedAt = e.executed_at ? new Date(e.executed_at).getTime() : 0;
            const dayStart = new Date();
            dayStart.setUTCHours(0, 0, 0, 0);
            return executedAt >= dayStart.getTime();
          })
          .reduce((sum: number, e: any) => sum + Number(e.profit_loss || 0), 0);

        let runningPnl = 0;
        let peak = 0;
        let maxDrawdown = 0;
        [...allExecutions].reverse().forEach((e: any) => {
          runningPnl += Number(e.profit_loss || 0);
          if (runningPnl > peak) peak = runningPnl;
          const dd = peak - runningPnl;
          if (dd > maxDrawdown) maxDrawdown = dd;
        });

        const candidateById = new Map(candidates.map((c: any) => [c.id, c]));
        const strategyToTeam = new Map<string, string>();
        strategies.forEach((s: any) => {
          const candidate = candidateById.get(s.promoted_from_candidate_id);
          if (candidate?.source_team_id) strategyToTeam.set(s.id, candidate.source_team_id);
        });

        const teamMetrics = teams.map((team: any) => {
          const teamTasks = tasks.filter((t: any) => t.team_id === team.id);
          const teamStrategyIds = Array.from(strategyToTeam.entries())
            .filter(([, teamId]) => teamId === team.id)
            .map(([strategyId]) => strategyId);
          const pnl = strategyExecutions
            .filter((e: any) => e.strategy_id && teamStrategyIds.includes(e.strategy_id))
            .reduce((sum: number, e: any) => sum + Number(e.profit_loss || 0), 0);

          return {
            id: team.id,
            name: team.name,
            type: team.team_type,
            status: team.status,
            activeTasks: teamTasks.filter((t: any) => t.status === "in_progress").length,
            pendingTasks: teamTasks.filter((t: any) => t.status === "pending").length,
            completedTasks: teamTasks.filter((t: any) => t.status === "completed").length,
            pnl,
          };
        });

        const pendingApprovals = approvals.filter((a: any) => a.status === "pending").map((approval: any) => {
          const candidate = candidates.find((c: any) => c.id === approval.candidate_id);
          return {
            id: approval.id,
            candidate_id: approval.candidate_id,
            candidate_name: candidate?.name || "Unknown",
            stage: approval.stage,
            required_approver: approval.required_approver,
            created_at: approval.created_at,
          };
        });

        return json({
          success: true,
          summary: {
            teams: teams.length,
            candidates: candidates.length,
            activeStrategies: strategies.filter((s: any) => s.is_active).length,
            pendingApprovals: pendingApprovals.length,
            killSwitchActive: !!riskRes.data?.kill_switch_active,
            maxPositionPct: riskRes.data?.max_position_pct ?? null,
            dailyLossLimit: riskRes.data?.daily_loss_limit ?? null,
            realizedPnLToday,
            maxDrawdown,
          },
          teamMetrics,
          strategyMetrics,
          pendingApprovals,
          lifecycleCounts,
          stageTransitions: transitions,
          operations: {
            schedulerRuns,
            reconciliationEvents,
            latestSnapshots: snapshots,
            reconciliationSummary: {
              mismatched: reconciliationEvents.filter((event: any) => event.result === "mismatched").length,
              missingBrokerOrder: reconciliationEvents.filter((event: any) => event.result === "missing_broker_order").length,
              errors: reconciliationEvents.filter((event: any) => event.result === "error").length,
            },
          },
        });
      }

      default:
        return json({ success: false, error: "Unknown action" }, 400);
    }
  } catch (error: any) {
    console.error("[trading-ceo-orchestrator] error:", error);
    return json({ success: false, error: error?.message || "Unknown error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
