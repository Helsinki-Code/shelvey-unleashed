import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft,
  Megaphone,
  MessageSquare,
  RefreshCw,
  Loader2,
  Sparkles,
  Activity,
  CheckCircle,
  Clock,
  Bot
} from "lucide-react";
import { SimpleDashboardSidebar } from "@/components/SimpleDashboardSidebar";
import { PageHeader } from "@/components/PageHeader";
import { ProceedToNextPhaseButton } from "@/components/ProceedToNextPhaseButton";
import { StartPhaseButton } from "@/components/StartPhaseButton";
import { AgentChatSheet } from "@/components/AgentChatSheet";
import { PhaseAgentCard } from "@/components/PhaseAgentCard";
import { LiveAgentWorkPreview } from "@/components/LiveAgentWorkPreview";
import { DeliverableCard } from "@/components/DeliverableCard";
import { MarketingLaunchStudio } from "@/components/MarketingLaunchStudio";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getPhaseAgent } from '@/lib/phase-agents';

const PHASE_AGENT = getPhaseAgent(5)!;

interface Deliverable {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  deliverable_type: string;
  ceo_approved: boolean | null;
  user_approved: boolean | null;
  feedback: string | null;
  generated_content: any;
  screenshots: any;
  citations: any;
  assigned_agent_id: string | null;
}

interface AgentActivity {
  id: string;
  agent_name: string;
  action: string;
  status: string;
  created_at: string;
  metadata?: any;
}

export default function Phase5Page() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [phase, setPhase] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAgentChat, setShowAgentChat] = useState(false);

  useEffect(() => {
    if (projectId && user) {
      loadPhaseData();
      loadCampaigns();
      loadActivities();
    }
  }, [projectId, user]);

  // Real-time subscriptions
  useEffect(() => {
    if (!projectId || !phase?.id) return;

    const channel = supabase
      .channel(`phase5-updates-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_activity_logs',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newActivity = payload.new as AgentActivity;
            setActivities(prev => [newActivity, ...prev].slice(0, 50));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'phase_deliverables',
          filter: `phase_id=eq.${phase.id}`
        },
        (payload) => {
          const updated = payload.new as Deliverable;
          setDeliverables(prev => 
            prev.map(d => d.id === updated.id ? updated : d)
          );
          if (updated.status === 'approved') {
            toast.success(`${updated.name} has been approved!`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, phase?.id]);

  const loadPhaseData = async () => {
    try {
      // Get project data
      const { data: projectData } = await supabase
        .from('business_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectData) {
        setProject(projectData);
      }

      // Get phase 5 data
      const { data: phaseData } = await supabase
        .from('business_phases')
        .select('*')
        .eq('project_id', projectId)
        .eq('phase_number', 5)
        .single();

      if (phaseData) {
        setPhase(phaseData);

        // Get deliverables
        const { data: deliverablesData } = await supabase
          .from('phase_deliverables')
          .select('*')
          .eq('phase_id', phaseData.id)
          .order('created_at');

        setDeliverables(deliverablesData || []);
      }
    } catch (error) {
      console.error('Failed to load phase data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadActivities = async () => {
    try {
      const { data } = await supabase
        .from('agent_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      setActivities(data || []);
    } catch (error) {
      console.error('Failed to load activities:', error);
    }
  };

  const loadCampaigns = async () => {
    try {
      const { data } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      setCampaigns(data || []);
      if (data && data.length > 0) {
        setSelectedCampaign(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadPhaseData(), loadActivities(), loadCampaigns()]);
    setIsRefreshing(false);
    toast.success("Data refreshed");
  };

  const createCampaign = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('marketing-campaign-manager', {
        body: {
          action: 'create_campaign',
          userId: user?.id,
          projectId,
          campaignData: {
            name: `Marketing Campaign ${campaigns.length + 1}`,
            type: 'social',
            budget: 1000,
            platforms: ['instagram', 'facebook']
          }
        }
      });

      if (error) throw error;
      toast.success("Campaign created!");
      loadCampaigns();
    } catch (error) {
      console.error('Failed to create campaign:', error);
      toast.error("Failed to create campaign");
    }
  };

  const isPhaseFullyApproved = () => {
    if (deliverables.length === 0) return false;
    return deliverables.every((d) => d.ceo_approved && d.user_approved);
  };

  const completedDeliverables = deliverables.filter(d => d.status === 'approved').length;
  const progressPercent = deliverables.length > 0 
    ? (completedDeliverables / deliverables.length) * 100 
    : 0;

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <SimpleDashboardSidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Phase 5: Marketing Launch | ShelVey</title>
        <meta name="description" content="Launch your marketing campaigns across all channels with AI-powered automation" />
      </Helmet>

      <div className="flex h-screen bg-background">
        <SimpleDashboardSidebar />
        
        <main className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {/* Header */}
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => navigate(`/projects/${projectId}`)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500">
                        <Megaphone className="h-5 w-5 text-white" />
                      </div>
                      <h1 className="text-2xl font-bold">Phase 5: Marketing Launch</h1>
                      <Badge variant={phase?.status === 'active' ? 'default' : 'secondary'}>
                        {phase?.status || 'pending'}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1">
                      Launch your marketing campaigns across all channels
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button variant="outline" onClick={createCampaign}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    New Campaign
                  </Button>
                  <PageHeader showNotifications={true} showLogout={true} />
                </div>
              </motion.div>

              {/* Progress Card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="border-pink-500/20 bg-gradient-to-r from-pink-500/5 to-rose-500/5">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">Phase Progress</h3>
                        <p className="text-sm text-muted-foreground">
                          {completedDeliverables} of {deliverables.length} deliverables completed
                        </p>
                      </div>
                      <Badge variant="outline" className="text-lg px-4 py-1 border-pink-500/50">
                        {progressPercent.toFixed(0)}%
                      </Badge>
                    </div>
                    <Progress value={progressPercent} className="h-3" />
                  </CardContent>
                </Card>
              </motion.div>

              {/* Start Phase Button */}
              <StartPhaseButton
                projectId={projectId!}
                phaseNumber={5}
                phaseStatus={phase?.status || 'pending'}
                onStart={loadPhaseData}
              />

              {/* Agent + Live Preview Section */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              >
                {/* Marketing Agent Card */}
                <PhaseAgentCard
                  phaseNumber={5}
                  status={phase?.status === 'active' ? 'working' : 'idle'}
                  onChat={() => setShowAgentChat(true)}
                />

                {/* Live Agent Work Preview */}
                <LiveAgentWorkPreview
                  projectId={projectId!}
                  agentId={PHASE_AGENT.id}
                  agentName={PHASE_AGENT.name}
                />
              </motion.div>

              {/* Main Content Tabs */}
              <Tabs defaultValue="marketing-studio" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="marketing-studio" className="flex items-center gap-2">
                    <Megaphone className="h-4 w-4" />
                    Marketing Studio
                  </TabsTrigger>
                  <TabsTrigger value="agent" className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    Agent
                  </TabsTrigger>
                  <TabsTrigger value="deliverables" className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Deliverables
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Live Activity
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="marketing-studio">
                  <MarketingLaunchStudio
                    projectId={projectId!}
                    campaignId={selectedCampaign}
                    project={project}
                  />
                </TabsContent>

                <TabsContent value="agent">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <PhaseAgentCard
                      phaseNumber={5}
                      status={phase?.status === 'active' ? 'working' : 'idle'}
                      onChat={() => setShowAgentChat(true)}
                    />
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MessageSquare className="h-5 w-5" />
                          Chat with Marketing Agent
                        </CardTitle>
                        <CardDescription>
                          Get help with campaigns, strategies, and marketing tasks
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button 
                          className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
                          onClick={() => setShowAgentChat(true)}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Open Chat
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="deliverables">
                  <Card>
                    <CardHeader>
                      <CardTitle>Phase 5 Deliverables</CardTitle>
                      <CardDescription>
                        Required outputs for Marketing Launch phase
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {deliverables.map((deliverable) => (
                          <DeliverableCard
                            key={deliverable.id}
                            deliverable={deliverable}
                            onViewWork={() => {}}
                            onRefresh={loadPhaseData}
                          />
                        ))}

                        {deliverables.length === 0 && (
                          <div className="col-span-2 text-center py-8 text-muted-foreground">
                            <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No deliverables created yet</p>
                            <p className="text-sm">Deliverables will appear when the phase is activated</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="activity">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Live Activity Feed
                      </CardTitle>
                      <CardDescription>
                        Real-time updates from the Marketing Agent
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-3">
                          {activities.length > 0 ? (
                            activities.map((activity) => (
                              <motion.div
                                key={activity.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                              >
                                <div className={`p-2 rounded-full ${
                                  activity.status === 'completed' ? 'bg-green-500/10' :
                                  activity.status === 'in_progress' ? 'bg-blue-500/10' :
                                  'bg-muted'
                                }`}>
                                  {activity.status === 'completed' ? (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  ) : activity.status === 'in_progress' ? (
                                    <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                                  ) : (
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">{activity.agent_name}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {activity.status}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground truncate">
                                    {activity.action}
                                  </p>
                                </div>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {formatTimeAgo(activity.created_at)}
                                </span>
                              </motion.div>
                            ))
                          ) : (
                            <div className="text-center py-12 text-muted-foreground">
                              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>No activity yet</p>
                              <p className="text-sm">Agent activities will appear here in real-time</p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Proceed to Next Phase Button */}
            <div className="p-6 pt-0">
              <ProceedToNextPhaseButton
                projectId={projectId || ''}
                currentPhaseNumber={5}
                isPhaseApproved={isPhaseFullyApproved()}
              />
            </div>
          </ScrollArea>
        </main>

        {/* Agent Chat Sheet */}
        <AgentChatSheet
          isOpen={showAgentChat}
          onClose={() => setShowAgentChat(false)}
          agentId={PHASE_AGENT.id}
          agentName={PHASE_AGENT.name}
          agentRole={PHASE_AGENT.role}
        />
      </div>
    </>
  );
}