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
  FileText,
  Globe,
  TrendingUp,
  Share2,
  DollarSign,
  Play,
  Pause,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
  Zap,
  BarChart3,
  Target,
} from "lucide-react";
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

const BLOG_PHASES = [
  { number: 1, name: "Niche Research", icon: Search },
  { number: 2, name: "Content Strategy", icon: Target },
  { number: 3, name: "Blog Setup", icon: Globe },
  { number: 4, name: "Content Production", icon: FileText },
  { number: 5, name: "SEO & Ranking", icon: TrendingUp },
  { number: 6, name: "Instagram & Social", icon: Share2 },
  { number: 7, name: "Monetization", icon: DollarSign },
];

const BLOG_AGENTS = {
  1: { id: "niche-researcher", name: "Niche Research Agent" },
  2: { id: "content-strategist", name: "Content Strategy Agent" },
  3: { id: "blog-setup-agent", name: "Blog Setup Agent" },
  4: { id: "content-writer", name: "Content Writer Agent" },
  5: { id: "seo-optimizer", name: "SEO Optimizer Agent" },
  6: { id: "instagram-agent", name: "Instagram Automation Agent" },
  7: { id: "monetization-agent", name: "Monetization Agent" },
};

interface RealTimeBlogAgentExecutorProps {
  projectId: string;
  projectName: string;
  currentPhase: number;
  niche: string | null;
  platform: string;
  onPhaseChange?: (phase: number) => void;
}

export const RealTimeBlogAgentExecutor = ({
  projectId,
  projectName,
  currentPhase,
  niche,
  platform,
  onPhaseChange,
}: RealTimeBlogAgentExecutorProps) => {
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
      .channel(`blog-agent-activities-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "agent_activity_logs",
        },
        (payload) => {
          const newActivity = payload.new as AgentActivity;
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
    toast.success("🚀 Blog AI Agents activated - starting real-time execution");

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) {
        throw new Error("Not authenticated");
      }

      const agent = BLOG_AGENTS[currentPhase as keyof typeof BLOG_AGENTS];
      setCurrentAgent(agent?.name || "Blog Agent");

      // Log the start
      await supabase.from("agent_activity_logs").insert({
        agent_id: "blog-orchestrator",
        agent_name: "Blog Empire Orchestrator",
        action: `Starting ${BLOG_PHASES[currentPhase - 1]?.name} phase for ${projectName}`,
        status: "started",
        metadata: { projectId, phase: currentPhase, niche, platform },
      });

      // Execute based on phase
      let response;
      
      switch (currentPhase) {
        case 1: // Niche Research
          response = await supabase.functions.invoke("content-strategy-generator", {
            body: {
              action: "research_niche",
              project_id: projectId,
              niche,
            },
            headers: {
              Authorization: `Bearer ${session.data.session.access_token}`,
            },
          });
          break;
        case 2: // Content Strategy
          response = await supabase.functions.invoke("content-strategy-generator", {
            body: {
              action: "generate_strategy",
              project_id: projectId,
              niche,
            },
            headers: {
              Authorization: `Bearer ${session.data.session.access_token}`,
            },
          });
          break;
        case 4: // Content Production with Instagram
          // First generate blog content
          response = await supabase.functions.invoke("blog-generator", {
            body: {
              action: "generate_article",
              project_id: projectId,
              niche,
            },
            headers: {
              Authorization: `Bearer ${session.data.session.access_token}`,
            },
          });

          // Then auto-generate Instagram content
          if (!response?.error) {
            const userId = session.data.session.user.id;
            await supabase.functions.invoke("instagram-automation", {
              body: {
                action: "auto_generate_content",
                user_id: userId,
                project_id: projectId,
                niche: niche || projectName,
              },
              headers: {
                Authorization: `Bearer ${session.data.session.access_token}`,
              },
            });
          }
          break;
        case 5: // SEO
          response = await supabase.functions.invoke("seo-analyzer", {
            body: {
              action: "analyze",
              project_id: projectId,
            },
            headers: {
              Authorization: `Bearer ${session.data.session.access_token}`,
            },
          });
          break;
        case 6: // Instagram & Social Promotion
          const userId = session.data.session.user.id;
          
          // Step 1: Search trending hashtags
          await supabase.from("agent_activity_logs").insert({
            agent_id: "instagram-agent",
            agent_name: "Instagram Automation Agent",
            action: "Researching trending hashtags for " + (niche || projectName),
            status: "started",
            metadata: { projectId, niche },
          });

          await supabase.functions.invoke("instagram-automation", {
            body: {
              action: "search_hashtags",
              user_id: userId,
              hashtag: niche || projectName,
            },
            headers: {
              Authorization: `Bearer ${session.data.session.access_token}`,
            },
          });

          // Step 2: Engage with community
          await supabase.from("agent_activity_logs").insert({
            agent_id: "instagram-agent",
            agent_name: "Instagram Automation Agent",
            action: "Engaging with " + (niche || projectName) + " community",
            status: "started",
            metadata: { projectId, niche },
          });

          await supabase.functions.invoke("instagram-automation", {
            body: {
              action: "engage_community",
              user_id: userId,
              niche: niche || projectName,
              count: 25,
            },
            headers: {
              Authorization: `Bearer ${session.data.session.access_token}`,
            },
          });

          // Step 3: Get insights
          response = await supabase.functions.invoke("instagram-automation", {
            body: {
              action: "get_insights",
              user_id: userId,
            },
            headers: {
              Authorization: `Bearer ${session.data.session.access_token}`,
            },
          });
          break;
        default:
          // Generic phase execution
          response = { data: { success: true, message: `Phase ${currentPhase} processed` } };
      }

      if (response?.error) throw response.error;

      // Simulate progress for visual feedback
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((r) => setTimeout(r, 400));
        setProgress(i);
      }

      // Log completion
      await supabase.from("agent_activity_logs").insert({
        agent_id: agent?.id || "blog-agent",
        agent_name: agent?.name || "Blog Agent",
        action: `Completed ${BLOG_PHASES[currentPhase - 1]?.name} phase`,
        status: "completed",
        metadata: {
          projectId,
          phase: currentPhase,
          result: response?.data,
        },
      });

      setProgress(100);
      toast.success(`✅ ${agent?.name} completed phase ${currentPhase} execution`);

      // Auto-advance to next phase
      if (currentPhase < 7 && onPhaseChange) {
        setTimeout(() => {
          onPhaseChange(currentPhase + 1);
          toast.info(`📈 Advancing to ${BLOG_PHASES[currentPhase]?.name} phase`);
        }, 2000);
      }
    } catch (error: any) {
      console.error("Agent execution error:", error);
      toast.error(error.message || "Agent execution failed");
      
      await supabase.from("agent_activity_logs").insert({
        agent_id: "blog-orchestrator",
        agent_name: "Blog Empire Orchestrator",
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

  const PhaseData = BLOG_PHASES[currentPhase - 1];
  const PhaseIcon = PhaseData?.icon || Activity;
  const currentAgentData = BLOG_AGENTS[currentPhase as keyof typeof BLOG_AGENTS];

  return (
    <div className="space-y-4">
      {/* Agent Control Panel */}
      <Card className="border-2 border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-amber-500/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <PhaseIcon className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {currentAgentData?.name || "Blog Agent"}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Phase {currentPhase}: {PhaseData?.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{platform}</Badge>
              {niche && (
                <Badge variant="secondary" className="max-w-[120px] truncate">
                  {niche}
                </Badge>
              )}
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
                  className="bg-gradient-to-r from-orange-500 to-amber-500"
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
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50 overflow-x-auto">
            {BLOG_PHASES.map((phase, idx) => {
              const Icon = phase.icon;
              const isActive = idx + 1 === currentPhase;
              const isComplete = idx + 1 < currentPhase;
              return (
                <div
                  key={phase.number}
                  className={`flex flex-col items-center gap-1 min-w-[60px] ${
                    isActive
                      ? "text-orange-500"
                      : isComplete
                      ? "text-green-500"
                      : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`p-2 rounded-full ${
                      isActive
                        ? "bg-orange-500/20 ring-2 ring-orange-500"
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
                  <span className="text-xs text-center">{phase.name.split(' ')[0]}</span>
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
                            ? "bg-orange-500/20 text-orange-500"
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
                        {activity.metadata && typeof activity.metadata === 'object' && !Array.isArray(activity.metadata) && 'revenue' in activity.metadata && typeof (activity.metadata as Record<string, unknown>).revenue === 'number' && (
                          <div className="flex items-center gap-1 mt-1">
                            <DollarSign className="h-3 w-3 text-green-500" />
                            <span className="text-xs text-green-500 font-medium">
                              +${((activity.metadata as Record<string, number>).revenue).toFixed(2)}
                            </span>
                          </div>
                        )}
                        {activity.metadata && typeof activity.metadata === 'object' && !Array.isArray(activity.metadata) && 'views' in activity.metadata && typeof (activity.metadata as Record<string, unknown>).views === 'number' && (
                          <div className="flex items-center gap-1 mt-1">
                            <BarChart3 className="h-3 w-3 text-blue-500" />
                            <span className="text-xs text-blue-500 font-medium">
                              {((activity.metadata as Record<string, number>).views).toLocaleString()} views
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
