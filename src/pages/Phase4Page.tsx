import { useState, useEffect, useCallback, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Bot,
  CheckCircle2,
  Clock,
  Eye,
  RefreshCw,
  Play,
  Sparkles,
  Search,
  Share2,
  TrendingUp,
  Layers,
  Activity,
  PenTool,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SimpleDashboardSidebar } from "@/components/SimpleDashboardSidebar";
import { AgentChatSheet } from "@/components/AgentChatSheet";
import { DeliverableCard } from "@/components/DeliverableCard";
import { LiveAgentWorkPreview } from "@/components/LiveAgentWorkPreview";
import { PhaseAgentCard } from "@/components/PhaseAgentCard";
import { PageHeader } from "@/components/PageHeader";
import { ProceedToNextPhaseButton } from "@/components/ProceedToNextPhaseButton";
import { StartPhaseButton } from "@/components/StartPhaseButton";
import { ContentGenerationStudio } from "@/components/ContentGenerationStudio";
import SEODashboard from "@/components/SEODashboard";
import { SocialCommandCenter } from "@/components/SocialCommandCenter";
import { SEOWarRoom } from "@/components/seo/SEOWarRoom";
import SocialContentFactory from "@/components/SocialContentFactory";
import RadialOrbitalTimeline, { type RadialTimelineItem } from "@/components/ui/radial-orbital-timeline";
import { Phase4AutopilotPanel } from "@/components/Phase4AutopilotPanel";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getPhaseAgent } from "@/lib/phase-agents";

interface Deliverable {
  id: string;
  name: string;
  description: string | null;
  deliverable_type: string;
  status: string | null;
  ceo_approved: boolean | null;
  user_approved: boolean | null;
  feedback: string | null;
  generated_content: unknown;
  screenshots: unknown;
  agent_work_steps: unknown;
  citations: unknown;
  assigned_agent_id: string | null;
  version: number | null;
}

interface AgentActivity {
  id: string;
  agent_id: string;
  agent_name: string;
  action: string;
  status: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

const PHASE_AGENT = getPhaseAgent(4)!;

export default function Phase4Page() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState<Record<string, unknown> | null>(null);
  const [phase, setPhase] = useState<Record<string, unknown> | null>(null);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("command-center");
  const [showAgentChat, setShowAgentChat] = useState(false);

  const fetchData = useCallback(async () => {
    if (!projectId || !user) return;

    try {
      const { data: projectData } = await supabase
        .from("business_projects")
        .select("*")
        .eq("id", projectId)
        .single();
      if (projectData) setProject(projectData);

      const { data: phaseData } = await supabase
        .from("business_phases")
        .select("*")
        .eq("project_id", projectId)
        .eq("phase_number", 4)
        .single();
      if (phaseData) setPhase(phaseData);

      if (phaseData) {
        const { data: deliverablesData } = await supabase
          .from("phase_deliverables")
          .select("*")
          .eq("phase_id", phaseData.id)
          .order("created_at");
        if (deliverablesData) setDeliverables(deliverablesData);
      }

      const { data: activityData } = await supabase
        .from("agent_activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      const projectActivities = (activityData || []).filter((activity) => {
        const metadata = activity.metadata as Record<string, unknown> | null;
        return metadata?.projectId === projectId || activity.agent_id === PHASE_AGENT.id;
      });
      setActivities(projectActivities.slice(0, 50) as unknown as AgentActivity[]);
    } catch (error) {
      console.error("Error fetching phase data:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [projectId, user]);

  useEffect(() => {
    if (projectId && user) fetchData();
  }, [projectId, user, fetchData]);

  useEffect(() => {
    if (!projectId || !user || !phase?.id) return;

    const channel = supabase
      .channel(`phase4-updates-${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_activity_logs" }, (payload) => {
        if (!payload.new) return;
        const newActivity = payload.new as AgentActivity;
        const metadata = newActivity.metadata as Record<string, unknown> | null;
        if (metadata?.projectId === projectId || newActivity.agent_id === PHASE_AGENT.id) {
          setActivities((prev) => [newActivity, ...prev.slice(0, 49)]);
        }
      })
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "phase_deliverables", filter: `phase_id=eq.${phase.id}` },
        (payload) => {
          if (!payload.new) return;
          const updated = payload.new as Deliverable;
          setDeliverables((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
          if (updated.status === "review") toast.success(`${updated.name} is ready for review!`);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, user, phase?.id]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    toast.success("Data refreshed");
  };

  const approvedCount = deliverables.filter((d) => d.ceo_approved && d.user_approved).length;
  const progress = deliverables.length ? Math.round((approvedCount / deliverables.length) * 100) : 0;

  const isPhaseFullyApproved = () => deliverables.length > 0 && deliverables.every((d) => d.ceo_approved && d.user_approved);

  const getAgentStatus = () => {
    const recent = activities.find((a) => a.agent_id === PHASE_AGENT.id);
    if (recent?.status === "in_progress" || recent?.status === "working") return "working";
    if (recent?.status === "completed") return "completed";
    return "idle";
  };

  const getAgentCurrentTask = () => {
    const recent = activities.find((a) => a.agent_id === PHASE_AGENT.id && (a.status === "in_progress" || a.status === "working"));
    return recent?.action || undefined;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    return date.toLocaleTimeString();
  };

  const seoDeliverables = deliverables.filter((d) => d.deliverable_type?.toLowerCase().includes("seo")).length;
  const socialDeliverables = deliverables.filter((d) => d.deliverable_type?.toLowerCase().includes("social")).length;
  const inProgressActivities = activities.filter((a) => a.status === "in_progress" || a.status === "working").length;
  const projectName = typeof project?.name === "string" ? project.name : "Project";
  const projectIndustry = typeof project?.industry === "string" ? project.industry : undefined;
  const projectBrandVoice = typeof project?.brand_voice === "string" ? project.brand_voice : undefined;
  const projectDomain =
    typeof project?.domain_name === "string"
      ? project.domain_name
      : typeof project?.domain === "string"
        ? project.domain
        : undefined;
  const phaseStatus = typeof phase?.status === "string" ? phase.status : "pending";

  const timelineData: RadialTimelineItem[] = useMemo(
    () => [
      {
        id: 1,
        title: "SEO Audit",
        date: "Step 1",
        content: "Technical and content SEO audit across project assets.",
        category: "SEO",
        icon: Search,
        relatedIds: [2, 3],
        status: progress > 15 ? "completed" : "in-progress",
        energy: Math.min(100, progress + 30),
      },
      {
        id: 2,
        title: "Keyword Clusters",
        date: "Step 2",
        content: "Topic clusters, intent mapping, and ranking opportunities.",
        category: "SEO",
        icon: Target,
        relatedIds: [1, 4],
        status: progress > 35 ? "completed" : progress > 15 ? "in-progress" : "pending",
        energy: Math.min(95, progress + 18),
      },
      {
        id: 3,
        title: "Content Factory",
        date: "Step 3",
        content: "Generate blog, social captions, and campaign copy at scale.",
        category: "Content",
        icon: PenTool,
        relatedIds: [1, 4, 5],
        status: progress > 55 ? "completed" : progress > 30 ? "in-progress" : "pending",
        energy: Math.max(35, progress),
      },
      {
        id: 4,
        title: "Social Scheduler",
        date: "Step 4",
        content: "Distribute content via social command center and posting queues.",
        category: "Social",
        icon: Share2,
        relatedIds: [2, 3, 5],
        status: progress > 75 ? "completed" : progress > 45 ? "in-progress" : "pending",
        energy: Math.max(25, progress - 8),
      },
      {
        id: 5,
        title: "Performance Loop",
        date: "Step 5",
        content: "Engagement + ranking feedback loops for continuous optimization.",
        category: "Analytics",
        icon: TrendingUp,
        relatedIds: [3, 4],
        status: progress > 90 ? "completed" : progress > 65 ? "in-progress" : "pending",
        energy: Math.max(20, progress - 20),
      },
    ],
    [progress],
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading Phase 4...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Helmet>
        <title>Phase 4: SEO & Social Automation | {projectName} | ShelVey</title>
        <meta
          name="description"
          content="SEO and social media content automation hub with AI-powered optimization, publishing, and analytics."
        />
      </Helmet>

      <SimpleDashboardSidebar />

      <main className="flex-1 p-6 ml-64">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate(`/projects/${projectId}`)} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Project
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Activity className="w-6 h-6 text-primary" />
                  Phase 4: SEO & Social Automation
                </h1>
                <p className="text-muted-foreground">{projectName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Badge className={phaseStatus === "active" ? "bg-green-500" : phaseStatus === "completed" ? "bg-blue-500" : "bg-muted"}>
                {phaseStatus}
              </Badge>
              <PageHeader showNotifications={true} showLogout={true} />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-cyan-500/5 to-emerald-500/10 p-6"
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <Badge variant="secondary" className="mb-3">
                  Autopilot Marketing Layer
                </Badge>
                <h2 className="text-2xl font-bold mb-2">Turn one campaign into SEO traffic + social growth</h2>
                <p className="text-muted-foreground max-w-2xl">
                  This phase runs keyword intelligence, content generation, social scheduling, and feedback optimization in one loop.
                </p>
              </div>
              <div className="min-w-[260px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Phase Progress</span>
                  <span className="text-lg font-bold">{progress}%</span>
                </div>
                <Progress value={progress} className="h-3" />
                <p className="text-xs text-muted-foreground mt-2">{approvedCount} of {deliverables.length} deliverables approved</p>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-primary/20">
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground mb-1">SEO Deliverables</p>
                <p className="text-2xl font-bold">{seoDeliverables}</p>
              </CardContent>
            </Card>
            <Card className="border-primary/20">
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground mb-1">Social Deliverables</p>
                <p className="text-2xl font-bold">{socialDeliverables}</p>
              </CardContent>
            </Card>
            <Card className="border-primary/20">
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground mb-1">Agent Activity</p>
                <p className="text-2xl font-bold">{inProgressActivities}</p>
              </CardContent>
            </Card>
            <Card className="border-primary/20">
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground mb-1">Approval Health</p>
                <p className="text-2xl font-bold">{progress >= 70 ? "Strong" : progress >= 40 ? "Building" : "Early"}</p>
              </CardContent>
            </Card>
          </div>

          <StartPhaseButton projectId={projectId!} phaseNumber={4} phaseStatus={phaseStatus} onStart={fetchData} />

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 flex-wrap h-auto">
              <TabsTrigger value="command-center" className="gap-2"><Layers className="w-4 h-4" /> Command Center</TabsTrigger>
              <TabsTrigger value="seo" className="gap-2"><Search className="w-4 h-4" /> SEO Ops</TabsTrigger>
              <TabsTrigger value="social" className="gap-2"><Share2 className="w-4 h-4" /> Social Ops</TabsTrigger>
              <TabsTrigger value="content-lab" className="gap-2"><Sparkles className="w-4 h-4" /> Content Lab</TabsTrigger>
              <TabsTrigger value="seo-warroom" className="gap-2"><Bot className="w-4 h-4" /> SEO War Room</TabsTrigger>
              <TabsTrigger value="autopilot" className="gap-2"><Bot className="w-4 h-4" /> Autopilot</TabsTrigger>
              <TabsTrigger value="agent" className="gap-2"><Bot className="w-4 h-4" /> Agent</TabsTrigger>
              <TabsTrigger value="deliverables" className="gap-2"><Eye className="w-4 h-4" /> Deliverables ({deliverables.length})</TabsTrigger>
              <TabsTrigger value="activity" className="gap-2"><Play className="w-4 h-4" /> Activity ({activities.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="command-center" className="space-y-6">
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle>SEO + Social Automation Timeline</CardTitle>
                  <CardDescription>Interactive orbital map of this phase workflow.</CardDescription>
                </CardHeader>
                <CardContent>
                  <RadialOrbitalTimeline timelineData={timelineData} />
                </CardContent>
              </Card>

              <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Launch Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button className="w-full justify-start" variant="outline" onClick={() => setActiveTab("seo")}>
                      <Search className="w-4 h-4 mr-2" /> Run SEO analysis and keyword tracking
                    </Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => setActiveTab("social")}>
                      <Share2 className="w-4 h-4 mr-2" /> Schedule social campaign posts
                    </Button>
                    <Button className="w-full justify-start" variant="outline" onClick={() => setActiveTab("content-lab")}>
                      <PenTool className="w-4 h-4 mr-2" /> Generate content batches
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Current Agent Pulse</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 rounded-lg bg-muted/40 border">
                      <p className="text-sm text-muted-foreground mb-1">Status</p>
                      <p className="font-semibold capitalize">{getAgentStatus()}</p>
                      <p className="text-sm text-muted-foreground mt-3 mb-1">Current Task</p>
                      <p className="text-sm">{getAgentCurrentTask() || "Waiting for next instruction"}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="seo">
              <SEODashboard projectId={projectId!} domain={projectDomain} />
            </TabsContent>

            <TabsContent value="social">
              <SocialCommandCenter projectId={projectId!} />
            </TabsContent>

            <TabsContent value="content-lab">
              <div className="space-y-6">
                <SocialContentFactory
                  projectId={projectId!}
                  businessName={projectName}
                  industry={projectIndustry}
                  brandVoice={projectBrandVoice}
                />
                <ContentGenerationStudio projectId={projectId!} project={project} />
              </div>
            </TabsContent>

            <TabsContent value="seo-warroom">
              <div className="h-[700px] border border-border rounded-lg overflow-hidden">
                <SEOWarRoom />
              </div>
            </TabsContent>

            <TabsContent value="autopilot">
              <Phase4AutopilotPanel projectId={projectId!} />
            </TabsContent>

            <TabsContent value="agent">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PhaseAgentCard phaseNumber={4} status={getAgentStatus()} currentTask={getAgentCurrentTask()} onChat={() => setShowAgentChat(true)} />
                <LiveAgentWorkPreview agentId={PHASE_AGENT.id} agentName={PHASE_AGENT.name} projectId={projectId!} />
              </div>
            </TabsContent>

            <TabsContent value="deliverables">
              <div className="space-y-6">
                {deliverables.length > 0 ? (
                  <div className="grid gap-4">
                    {deliverables.map((deliverable) => (
                      <DeliverableCard key={deliverable.id} deliverable={deliverable} onViewWork={() => {}} onRefresh={fetchData} />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Eye className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="text-muted-foreground">No deliverables yet. Start the phase to begin SEO/social automation.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="w-5 h-5 text-primary" />
                    Live Activity Feed
                  </CardTitle>
                  <CardDescription>Real-time updates from your SEO & Social Content Agent</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[520px]">
                    {activities.length > 0 ? (
                      <div className="space-y-3">
                        {activities.map((activity, index) => (
                          <motion.div
                            key={activity.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.02 }}
                            className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                          >
                            <div
                              className={`p-2 rounded-full ${
                                activity.status === "completed"
                                  ? "bg-green-500/20 text-green-500"
                                  : activity.status === "in_progress"
                                    ? "bg-primary/20 text-primary"
                                    : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {activity.status === "completed" ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : activity.status === "in_progress" ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Clock className="w-4 h-4" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{activity.agent_name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {activity.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground truncate">{activity.action}</p>
                              <span className="text-xs text-muted-foreground">{formatTime(activity.created_at)}</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No activity yet. Start the phase to see agent work.</p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <ProceedToNextPhaseButton projectId={projectId || ""} currentPhaseNumber={4} isPhaseApproved={isPhaseFullyApproved()} />
        </div>
      </main>

      <AgentChatSheet
        isOpen={showAgentChat}
        onClose={() => setShowAgentChat(false)}
        agentId={PHASE_AGENT.id}
        agentName={PHASE_AGENT.name}
        agentRole={PHASE_AGENT.role}
        projectId={projectId || ""}
      />
    </div>
  );
}
