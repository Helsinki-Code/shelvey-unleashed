import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, ShieldAlert, TrendingUp, Wrench, AlertTriangle, Workflow, Activity } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TradingCEOControlTowerProps {
  projectId: string;
}

interface DashboardResponse {
  summary: {
    teams: number;
    candidates: number;
    activeStrategies: number;
    pendingApprovals: number;
    killSwitchActive: boolean;
    maxPositionPct: number | null;
    dailyLossLimit: number | null;
    realizedPnLToday: number;
    maxDrawdown: number;
  };
  teamMetrics: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    activeTasks: number;
    pendingTasks: number;
    completedTasks: number;
    pnl: number;
  }>;
  strategyMetrics: Array<{
    id: string;
    name: string;
    lifecycle_stage: string;
    is_active: boolean;
    paper_mode: boolean;
    pnl: number;
    totalTrades: number;
    winRate: number;
  }>;
  pendingApprovals: Array<{
    id: string;
    candidate_id: string;
    candidate_name: string;
    stage: string;
    required_approver: "ceo" | "user";
    created_at: string;
  }>;
  lifecycleCounts: Record<string, number>;
  operations?: {
    schedulerRuns: Array<{
      id: string;
      job_type: string;
      status: string;
      details: Record<string, unknown>;
      started_at: string;
      completed_at: string | null;
      error_message: string | null;
    }>;
    reconciliationEvents: Array<{
      id: string;
      result: string;
      notes: string | null;
      db_status: string | null;
      broker_status: string | null;
      created_at: string;
    }>;
    reconciliationSummary: {
      mismatched: number;
      missingBrokerOrder: number;
      errors: number;
    };
  };
}

export const TradingCEOControlTower = ({ projectId }: TradingCEOControlTowerProps) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [runningJob, setRunningJob] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setRefreshing(true);
      const { data, error } = await supabase.functions.invoke("trading-ceo-orchestrator", {
        body: {
          action: "get_live_dashboard",
          params: { projectId },
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to load dashboard");
      setDashboard(data);
    } catch (error: any) {
      console.error("Control tower load error:", error);
      toast.error(error.message || "Failed to load CEO dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 20000);
    return () => clearInterval(interval);
  }, [projectId]);

  const approveCheckpoint = async (approval: DashboardResponse["pendingApprovals"][number]) => {
    setApprovingId(approval.id);
    try {
      const { data, error } = await supabase.functions.invoke("trading-ceo-orchestrator", {
        body: {
          action: "approve_stage",
          params: {
            candidateId: approval.candidate_id,
            stage: approval.stage,
            approverType: approval.required_approver,
            approved: true,
          },
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Approval failed");
      toast.success(`${approval.required_approver.toUpperCase()} approved ${approval.stage}`);
      fetchDashboard();
    } catch (error: any) {
      console.error("Approval error:", error);
      toast.error(error.message || "Failed to approve stage");
    } finally {
      setApprovingId(null);
    }
  };

  const runWorkerJobs = async (jobTypes: string[], label: string, phaseNumber?: number) => {
    setRunningJob(label);
    try {
      const { data, error } = await supabase.functions.invoke("trading-ceo-orchestrator", {
        body: {
          action: "run_worker_jobs",
          params: {
            projectId,
            phaseNumber,
            jobTypes,
          },
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Worker job failed");
      toast.success(`${label} completed`);
      fetchDashboard();
    } catch (error: any) {
      console.error("Worker job error:", error);
      toast.error(error.message || `Failed to run ${label}`);
    } finally {
      setRunningJob(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>CEO Control Tower</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (!dashboard) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            CEO Control Tower
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchDashboard} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Metric title="Teams" value={dashboard.summary.teams} />
          <Metric title="Candidates" value={dashboard.summary.candidates} />
          <Metric title="Active Strategies" value={dashboard.summary.activeStrategies} />
          <Metric title="Pending Approvals" value={dashboard.summary.pendingApprovals} />
          <Metric title="PnL Today" value={`$${dashboard.summary.realizedPnLToday.toFixed(2)}`} />
          <Metric title="Max Drawdown" value={`$${dashboard.summary.maxDrawdown.toFixed(2)}`} />
        </div>

        <div className="p-4 rounded-lg border bg-muted/20">
          <div className="flex items-center gap-2 mb-3">
            <Workflow className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">Promotion Pipeline</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {["research", "backtest", "paper", "staged_live", "full_live"].map((stage) => (
              <div key={stage} className="p-3 rounded-md border bg-background/60">
                <p className="text-xs text-muted-foreground capitalize">{stage.replace("_", " ")}</p>
                <p className="text-xl font-semibold">{dashboard.lifecycleCounts?.[stage] || 0}</p>
              </div>
            ))}
          </div>
        </div>

        {dashboard.summary.killSwitchActive && (
          <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-sm flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            Kill switch is active. Live order execution is blocked.
          </div>
        )}

        <Tabs defaultValue="teams" className="space-y-3">
          <TabsList>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="strategies">Strategies</TabsTrigger>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
          </TabsList>

          <TabsContent value="teams">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Team P&L / Ops</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dashboard.teamMetrics.length === 0 && (
                  <p className="text-sm text-muted-foreground">No teams configured yet.</p>
                )}
                {dashboard.teamMetrics.map((team) => (
                  <div key={team.id} className="p-3 rounded border text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{team.name}</span>
                      <Badge variant="outline">{team.type}</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs text-muted-foreground">
                      <span>Active: {team.activeTasks}</span>
                      <span>Pending: {team.pendingTasks}</span>
                      <span>Completed: {team.completedTasks}</span>
                      <span className={team.pnl >= 0 ? "text-green-500" : "text-red-500"}>
                        PnL {team.pnl >= 0 ? "+" : ""}${team.pnl.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="strategies">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Strategy P&L / Risk</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dashboard.strategyMetrics.length === 0 && (
                  <p className="text-sm text-muted-foreground">No strategies in this project yet.</p>
                )}
                {dashboard.strategyMetrics.map((strategy) => (
                  <div key={strategy.id} className="p-3 rounded border text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{strategy.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{strategy.lifecycle_stage}</Badge>
                        <Badge variant={strategy.paper_mode ? "outline" : "destructive"}>
                          {strategy.paper_mode ? "PAPER" : "LIVE"}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 text-xs text-muted-foreground">
                      <span>Trades: {strategy.totalTrades}</span>
                      <span>Win: {strategy.winRate}%</span>
                      <span className={strategy.pnl >= 0 ? "text-green-500" : "text-red-500"}>
                        PnL {strategy.pnl >= 0 ? "+" : ""}${strategy.pnl.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="approvals">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">CEO Approval Checkpoints</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dashboard.pendingApprovals.length === 0 && (
                  <p className="text-sm text-muted-foreground">No pending stage approvals.</p>
                )}
                {dashboard.pendingApprovals.map((approval) => (
                  <div key={approval.id} className="p-2 rounded border text-sm flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{approval.candidate_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Stage: {approval.stage} | Required: {approval.required_approver.toUpperCase()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => approveCheckpoint(approval)}
                      disabled={approvingId === approval.id}
                    >
                      Approve
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="operations">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Autonomous Operations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <Button size="sm" variant="outline" disabled={!!runningJob} onClick={() => runWorkerJobs(["phase_task_generation"], "Phase Tasks")}>
                    Generate Tasks
                  </Button>
                  <Button size="sm" variant="outline" disabled={!!runningJob} onClick={() => runWorkerJobs(["team_performance_snapshot"], "Snapshots")}>
                    Snapshots
                  </Button>
                  <Button size="sm" variant="outline" disabled={!!runningJob} onClick={() => runWorkerJobs(["reconciliation"], "Reconciliation")}>
                    Reconcile
                  </Button>
                  <Button size="sm" variant="outline" disabled={!!runningJob} onClick={() => runWorkerJobs(["stage_progression"], "Stage Progression")}>
                    Progression
                  </Button>
                  <Button size="sm" disabled={!!runningJob} onClick={() => runWorkerJobs(["phase_task_generation", "team_performance_snapshot", "reconciliation", "stage_progression"], "All Worker Jobs")}>
                    Run All
                  </Button>
                </div>

                {dashboard.operations?.reconciliationSummary && (
                  <div className="grid grid-cols-3 gap-2">
                    <Metric title="Mismatched" value={dashboard.operations.reconciliationSummary.mismatched} />
                    <Metric title="Missing Broker ID" value={dashboard.operations.reconciliationSummary.missingBrokerOrder} />
                    <Metric title="Reconcile Errors" value={dashboard.operations.reconciliationSummary.errors} />
                  </div>
                )}

                {(dashboard.operations?.reconciliationSummary?.mismatched || 0) > 0 && (
                  <div className="p-2 rounded border border-amber-500/40 bg-amber-500/10 text-xs flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                    Broker reconciliation has mismatches. Review recent reconciliation events.
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Recent Worker Runs</p>
                    {(dashboard.operations?.schedulerRuns || []).slice(0, 5).map((run) => (
                      <div key={run.id} className="p-2 rounded border text-xs flex items-center justify-between gap-2">
                        <span className="font-medium">{run.job_type.split("_").join(" ")}</span>
                        <Badge variant={run.status === "completed" ? "secondary" : run.status === "failed" ? "destructive" : "outline"}>
                          {run.status}
                        </Badge>
                      </div>
                    ))}
                    {(dashboard.operations?.schedulerRuns || []).length === 0 && (
                      <p className="text-xs text-muted-foreground">No scheduler runs yet.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Recent Reconciliation Events</p>
                    {(dashboard.operations?.reconciliationEvents || []).slice(0, 5).map((event) => (
                      <div key={event.id} className="p-2 rounded border text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{event.result.split("_").join(" ")}</span>
                          <Badge variant={event.result === "matched" ? "secondary" : "destructive"}>
                            {event.db_status || "n/a"} / {event.broker_status || "n/a"}
                          </Badge>
                        </div>
                        {event.notes && <p className="text-muted-foreground mt-1">{event.notes}</p>}
                      </div>
                    ))}
                    {(dashboard.operations?.reconciliationEvents || []).length === 0 && (
                      <p className="text-xs text-muted-foreground">No reconciliation events yet.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="p-3 rounded border bg-muted/20 text-xs text-muted-foreground flex items-center gap-2">
          <Activity className="h-3 w-3" />
          Lifecycle fields are orchestrator-locked. Manual DB updates to stage/status are blocked by backend policy.
        </div>
      </CardContent>
    </Card>
  );
};

const Metric = ({ title, value }: { title: string; value: string | number }) => (
  <div className="p-2 rounded border bg-muted/30">
    <p className="text-xs text-muted-foreground">{title}</p>
    <p className="font-semibold">{value}</p>
  </div>
);

export default TradingCEOControlTower;
