import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Search,
  Brain,
  Settings,
  Zap,
  Activity,
  TrendingUp,
  Play,
  Pause,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Target,
  Shield,
} from "lucide-react";
import { TRADING_AGENTS, TRADING_PHASES } from "@/lib/trading-agents";
import type { Json } from "@/integrations/supabase/types";

interface AgentActivity {
  id: string;
  agent_id: string;
  agent_name: string;
  action: string;
  status: string;
  created_at: string;
  metadata?: Json;
}

interface RealTimeAgentExecutorProps {
  projectId: string;
  projectName: string;
  currentPhase: number;
  exchange: string;
  mode: "paper" | "live";
  capital: number;
  onPhaseChange?: (phase: number) => void;
}

const phaseIcons = [Search, Brain, Settings, Zap, Activity, TrendingUp];

export const RealTimeAgentExecutor = ({
  projectId,
  projectName,
  currentPhase,
  exchange,
  mode,
  capital,
  onPhaseChange,
}: RealTimeAgentExecutorProps) => {
  const [isRunning, setIsRunning] = useState(false);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<number>(2000);

  // Fetch activities with polling fallback
  const fetchActivities = useCallback(async () => {
    try {
      let query = supabase
        .from("agent_activity_logs")
        .select("*")
        .contains("metadata", { projectId })
        .order("created_at", { ascending: false })
        .limit(50);

      if (lastSyncTimestamp) {
        query = query.gt("created_at", lastSyncTimestamp);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        setActivities((prev) => {
          const combined = [...data, ...prev];
          const unique = combined.filter(
            (item, index, self) =>
              index === self.findIndex((t) => t.id === item.id)
          );
          return unique.slice(0, 100);
        });
        setLastSyncTimestamp(data[0].created_at);
        pollIntervalRef.current = 2000;
      } else {
        pollIntervalRef.current = Math.min(pollIntervalRef.current * 1.5, 15000);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
    }
  }, [lastSyncTimestamp]);

  useEffect(() => {
    // Real-time subscription
    const channel = supabase
      .channel(`trading-agent-activities-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "agent_activity_logs",
        },
        (payload) => {
          const newActivity = payload.new as AgentActivity;
          const metadata = newActivity.metadata as Record<string, unknown> | undefined;
          if (metadata?.projectId !== projectId) return;

          setActivities((prev) => {
            const filtered = prev.filter((a) => a.id !== newActivity.id);
            return [newActivity, ...filtered].slice(0, 100);
          });
          setLastSyncTimestamp(newActivity.created_at);
          pollIntervalRef.current = 2000;
        }
      )
      .subscribe();

    // Initial fetch
    fetchActivities();

    // Polling fallback
    const poll = () => {
      fetchActivities();
      intervalRef.current = setTimeout(poll, pollIntervalRef.current);
    };
    intervalRef.current = setTimeout(poll, pollIntervalRef.current);

    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
      supabase.removeChannel(channel);
    };
  }, [projectId, fetchActivities]);

  const startAgentExecution = async () => {
    setIsRunning(true);
    setProgress(0);
    toast.success("🚀 AI Agents activated - starting real-time execution");

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) {
        throw new Error("Not authenticated");
      }

      // Log the start
      await supabase.from("agent_activity_logs").insert({
        agent_id: "trading-orchestrator",
        agent_name: "Trading Orchestrator",
        action: `Starting ${TRADING_PHASES[currentPhase - 1]?.name} phase for ${projectName}`,
        status: "started",
        metadata: { projectId, phase: currentPhase, exchange, mode },
      });

      // Execute phase agent
      const agent = TRADING_AGENTS[currentPhase];
      setCurrentAgent(agent?.name || "Trading Agent");

      setProgress(15);

      // Execute real phase worker (no simulated outputs)
      const userId = session.data.session.user.id;
      const response = await supabase.functions.invoke("trading-agent-executor", {
        body: {
          projectId,
          phaseNumber: currentPhase,
          userId,
        },
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (response.error) throw response.error;
      setProgress(100);

      // Log completion
      await supabase.from("agent_activity_logs").insert({
        agent_id: agent?.id || "trading-agent",
        agent_name: agent?.name || "Trading Agent",
        action: `Completed ${TRADING_PHASES[currentPhase - 1]?.name} phase analysis`,
        status: "completed",
        metadata: {
          projectId,
          phase: currentPhase,
          result: response.data,
        },
      });

      setProgress(100);
      toast.success(`✅ ${agent?.name} completed phase ${currentPhase} execution`);

      // Auto-advance to next phase
      if (currentPhase < 6 && onPhaseChange) {
        setTimeout(() => {
          onPhaseChange(currentPhase + 1);
          toast.info(`📈 Advancing to ${TRADING_PHASES[currentPhase]?.name} phase`);
        }, 2000);
      }
    } catch (error: any) {
      console.error("Agent execution error:", error);
      toast.error(error.message || "Agent execution failed");
      
      await supabase.from("agent_activity_logs").insert({
        agent_id: "trading-orchestrator",
        agent_name: "Trading Orchestrator",
        action: `Phase ${currentPhase} execution failed: ${error.message}`,
        status: "failed",
        metadata: { projectId, phase: currentPhase, error: error.message },
      });
    } finally {
      setIsRunning(false);
      setCurrentAgent(null);
    }
  };

  const stopAgentExecution = () => {
    setIsRunning(false);
    setCurrentAgent(null);
    toast.warning("⏸️ Agent execution paused");
  };

  const PhaseIcon = phaseIcons[currentPhase - 1] || Activity;
  const currentAgentData = TRADING_AGENTS[currentPhase];

  return (
    <div className="space-y-4">
      {/* Agent Control Panel */}
      <Card className="border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-purple-500/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <PhaseIcon className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {currentAgentData?.name || "Trading Agent"}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Phase {currentPhase}: {TRADING_PHASES[currentPhase - 1]?.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={mode === "live" ? "destructive" : "secondary"}
                className="uppercase"
              >
                {mode} Mode
              </Badge>
              <Badge variant="outline">{exchange}</Badge>
              {isRunning ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={stopAgentExecution}
                  className="border-red-500 text-red-500 hover:bg-red-500/10"
                >
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={startAgentExecution}
                  className="bg-gradient-to-r from-blue-500 to-purple-500"
                >
                  <Play className="h-4 w-4 mr-1" />
                  Execute
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isRunning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {currentAgent} executing...
                </span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Phase Progress */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
            {TRADING_PHASES.map((phase, idx) => {
              const Icon = phaseIcons[idx];
              const isActive = idx + 1 === currentPhase;
              const isComplete = idx + 1 < currentPhase;
              return (
                <div
                  key={phase.number}
                  className={`flex flex-col items-center gap-1 ${
                    isActive
                      ? "text-blue-500"
                      : isComplete
                      ? "text-green-500"
                      : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`p-2 rounded-full ${
                      isActive
                        ? "bg-blue-500/20 ring-2 ring-blue-500"
                        : isComplete
                        ? "bg-green-500/20"
                        : "bg-muted/50"
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span className="text-xs">{phase.name}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Live Activity Feed */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-500 animate-pulse" />
              Live Agent Activity
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {activities.length} events
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            <div className="p-4 space-y-2">
              <AnimatePresence mode="popLayout">
                {activities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No activity yet. Click Execute to start.</p>
                  </div>
                ) : (
                  activities.map((activity) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div
                        className={`p-1.5 rounded-full ${
                          activity.status === "completed"
                            ? "bg-green-500/20 text-green-500"
                            : activity.status === "failed"
                            ? "bg-red-500/20 text-red-500"
                            : activity.status === "started"
                            ? "bg-blue-500/20 text-blue-500"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {activity.status === "completed" ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : activity.status === "failed" ? (
                          <AlertCircle className="h-3 w-3" />
                        ) : (
                          <Activity className="h-3 w-3" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">
                            {activity.agent_name}
                          </p>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(activity.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {activity.action}
                        </p>
                        {activity.metadata && typeof activity.metadata === 'object' && !Array.isArray(activity.metadata) && 'profit' in activity.metadata && typeof (activity.metadata as Record<string, unknown>).profit === 'number' && (
                          <div className="flex items-center gap-1 mt-1">
                            <DollarSign className="h-3 w-3 text-green-500" />
                            <span className="text-xs text-green-500 font-medium">
                              +${((activity.metadata as Record<string, number>).profit).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
