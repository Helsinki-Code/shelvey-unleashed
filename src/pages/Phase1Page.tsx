import { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, TrendingUp, Users, Target, Loader2, Bot, CheckCircle2, Clock, Eye, Download, ExternalLink, MessageSquare, Camera, Link2, Sparkles, Play, Image, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SimpleDashboardSidebar } from '@/components/SimpleDashboardSidebar';
import { CEOChatSheet } from '@/components/CEOChatSheet';
import { AgentChatSheet } from '@/components/AgentChatSheet';
import { AgentWorkViewer } from '@/components/AgentWorkViewer';
import { DeliverableCard } from '@/components/DeliverableCard';
import { LiveAgentWorkPreview } from '@/components/LiveAgentWorkPreview';
import { PageHeader } from '@/components/PageHeader';
import { ProceedToNextPhaseButton } from '@/components/ProceedToNextPhaseButton';
import { StartPhaseButton } from '@/components/StartPhaseButton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Deliverable {
  id: string;
  name: string;
  description: string | null;
  deliverable_type: string;
  status: string | null;
  ceo_approved: boolean | null;
  user_approved: boolean | null;
  feedback: string | null;
  generated_content: any;
  screenshots: any;
  agent_work_steps: any;
  citations: any;
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
  metadata: any;
}

import { getPhaseAgent } from '@/lib/phase-agents';

const PHASE_AGENT = getPhaseAgent(1)!;

const Phase1Page = () => {
  const { projectId, phaseNumber } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [phase, setPhase] = useState<any>(null);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDeliverable, setSelectedDeliverable] = useState<Deliverable | null>(null);
  const [activeTab, setActiveTab] = useState('agents');
  const [showAgentChat, setShowAgentChat] = useState(false);

  const fetchData = useCallback(async () => {
    if (!projectId || !user) return;
    
    try {
      // Fetch project
      const { data: projectData } = await supabase
        .from('business_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectData) setProject(projectData);

      // Fetch phase
      const phaseNum = parseInt(phaseNumber || '1');
      const { data: phaseData } = await supabase
        .from('business_phases')
        .select('*')
        .eq('project_id', projectId)
        .eq('phase_number', phaseNum)
        .single();

      if (phaseData) setPhase(phaseData);

      // Fetch deliverables
      if (phaseData) {
        const { data: deliverablesData } = await supabase
          .from('phase_deliverables')
          .select('*')
          .eq('phase_id', phaseData.id)
          .order('created_at');

        if (deliverablesData) setDeliverables(deliverablesData);
      }

      // Fetch recent activity - FIXED: Filter by project
      const { data: activityData } = await supabase
        .from('agent_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      // Filter activities that belong to this project
      const projectActivities = (activityData || []).filter((activity: AgentActivity) => {
        const metadata = activity.metadata as any;
        return metadata?.projectId === projectId || activity.agent_id === PHASE_AGENT.id;
      });

      setActivities(projectActivities.slice(0, 50));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [projectId, phaseNumber, user]);

  useEffect(() => {
    if (projectId && user) {
      fetchData();
    }
  }, [projectId, user, fetchData]);

  useEffect(() => {
    if (!projectId || !user || !phase?.id) return;

    const channel = supabase
      .channel(`phase1-updates-${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agent_activity_logs' },
        (payload) => {
          if (payload.new) {
            const newActivity = payload.new as AgentActivity;
            const metadata = newActivity.metadata as any;
            // Only add if it's for our project or one of our agents
            if (metadata?.projectId === projectId || newActivity.agent_id === PHASE_AGENT.id) {
              setActivities(prev => [newActivity, ...prev.slice(0, 49)]);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'phase_deliverables', filter: `phase_id=eq.${phase.id}` },
        (payload) => {
          if (payload.new) {
            const updated = payload.new as Deliverable;
            setDeliverables(prev =>
              prev.map(d => d.id === updated.id ? updated : d)
            );
            // Show toast for status changes
            if (updated.status === 'review') {
              toast.success(`${updated.name} is ready for review!`);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, user, phase?.id]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    toast.success('Data refreshed');
  };

  const calculateProgress = () => {
    if (deliverables.length === 0) return 0;
    const approved = deliverables.filter(d => d.ceo_approved && d.user_approved).length;
    return Math.round((approved / deliverables.length) * 100);
  };

  const isPhaseFullyApproved = () => {
    if (deliverables.length === 0) return false;
    return deliverables.every(d => d.ceo_approved && d.user_approved);
  };

  const getAgentStatus = (agentId: string) => {
    const recentActivity = activities.find(a => a.agent_id === agentId);
    return recentActivity?.status || 'idle';
  };

  const getAgentCurrentTask = (agentId: string) => {
    const recentActivity = activities.find(a => a.agent_id === agentId && a.status === 'in_progress');
    return recentActivity?.action || null;
  };

  const getAgentDeliverables = (agentId: string) => {
    return deliverables.filter(d => d.assigned_agent_id === agentId);
  };

  const getAgentLatestScreenshot = (agentId: string) => {
    const agentDeliverables = getAgentDeliverables(agentId);
    for (const d of agentDeliverables) {
      if (d.screenshots && Array.isArray(d.screenshots) && d.screenshots.length > 0) {
        return d.screenshots[d.screenshots.length - 1];
      }
    }
    return null;
  };

  const getStatusBadgeVariant = (status: string | null) => {
    switch (status) {
      case 'in_progress': return 'default';
      case 'review': return 'secondary';
      case 'approved': return 'default';
      case 'completed': return 'default';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading Phase 1...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Helmet>
        <title>Phase 1: Research & Discovery | {project?.name} | ShelVey</title>
      </Helmet>

      <SimpleDashboardSidebar />

      <main className="flex-1 p-6 ml-64">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate(`/projects/${projectId}`)}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Project
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-primary" />
                  Phase 1: Research & Discovery
                </h1>
                <p className="text-muted-foreground">{project?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Badge className={phase?.status === 'active' ? 'bg-green-500' : phase?.status === 'completed' ? 'bg-blue-500' : 'bg-muted'}>
                {phase?.status || 'pending'}
              </Badge>
              <PageHeader showNotifications={true} showLogout={true} />
            </div>
          </div>

          {/* Progress Bar */}
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Phase Progress</span>
                <span className="font-bold text-lg">{calculateProgress()}%</span>
              </div>
              <Progress value={calculateProgress()} className="h-3" />
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>{deliverables.filter(d => d.ceo_approved && d.user_approved).length} of {deliverables.length} deliverables approved</span>
                <span>{phase?.status === 'completed' ? 'Phase Complete!' : 'In Progress'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Start Phase Button */}
          <StartPhaseButton
            projectId={projectId!}
            phaseNumber={1}
            phaseStatus={phase?.status || 'pending'}
            onStart={fetchData}
          />

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="agent" className="gap-2">
                <Bot className="w-4 h-4" />
                Research Agent
              </TabsTrigger>
              <TabsTrigger value="deliverables" className="gap-2">
                <Eye className="w-4 h-4" />
                Deliverables ({deliverables.length})
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2">
                <Play className="w-4 h-4" />
                Live Activity ({activities.length})
              </TabsTrigger>
            </TabsList>

            {/* Single Agent Tab with Live Work Preview */}
            <TabsContent value="agent">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Agent Info Card */}
                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-primary/10 text-primary">
                          <Search className="w-6 h-6" />
                        </div>
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {PHASE_AGENT.name}
                            <Badge variant="secondary" className="text-xs">Phase 1</Badge>
                          </CardTitle>
                          <CardDescription>{PHASE_AGENT.role}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${
                          getAgentStatus(PHASE_AGENT.id) === 'in_progress' ? 'bg-green-500 animate-pulse' :
                          getAgentStatus(PHASE_AGENT.id) === 'completed' ? 'bg-blue-500' : 'bg-muted-foreground'
                        }`} />
                        <span className="text-xs font-medium capitalize">
                          {getAgentStatus(PHASE_AGENT.id) === 'in_progress' ? 'Working' : getAgentStatus(PHASE_AGENT.id)}
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{PHASE_AGENT.description}</p>

                    {getAgentCurrentTask(PHASE_AGENT.id) && (
                      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                        <p className="text-xs font-medium text-primary mb-1 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Currently Working On
                        </p>
                        <p className="text-sm">{getAgentCurrentTask(PHASE_AGENT.id)}</p>
                      </div>
                    )}

                    {/* Capabilities */}
                    <div className="flex flex-wrap gap-1">
                      {PHASE_AGENT.capabilities.slice(0, 6).map((cap) => (
                        <Badge key={cap} variant="outline" className="text-xs">
                          {cap}
                        </Badge>
                      ))}
                    </div>

                    <Button onClick={() => setShowAgentChat(true)} className="w-full gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Chat with {PHASE_AGENT.name}
                    </Button>
                  </CardContent>
                </Card>

                {/* Live Work Preview Window */}
                <LiveAgentWorkPreview
                  agentId={PHASE_AGENT.id}
                  agentName={PHASE_AGENT.name}
                  projectId={projectId!}
                />
              </div>
            </TabsContent>

            {/* Deliverables Tab */}
            <TabsContent value="deliverables">
              <div className="space-y-4">
                {deliverables.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">No deliverables found. Start the phase to create deliverables.</p>
                    </CardContent>
                  </Card>
                ) : (
                  deliverables.map((deliverable) => (
                    <DeliverableCard
                      key={deliverable.id}
                      deliverable={deliverable}
                      onViewWork={() => setSelectedDeliverable(deliverable)}
                      onRefresh={fetchData}
                    />
                  ))
                )}
              </div>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="w-5 h-5" />
                    Live Activity Feed
                  </CardTitle>
                  <CardDescription>Real-time updates from your research agent</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    {activities.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No activity yet. Start the phase to see agent work.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activities.map((activity, index) => (
                          <motion.div
                            key={activity.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.02 }}
                            className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                          >
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Bot className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{activity.agent_name}</span>
                                <Badge variant={getStatusBadgeVariant(activity.status)} className="text-xs">
                                  {activity.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground truncate">{activity.action}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(activity.created_at).toLocaleTimeString()}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Proceed Button */}
          {isPhaseFullyApproved() && (
            <div className="mt-8">
              <ProceedToNextPhaseButton
                projectId={projectId!}
                currentPhaseNumber={1}
                isPhaseApproved={isPhaseFullyApproved()}
              />
            </div>
          )}
        </div>
      </main>

      {/* Agent Chat Sheet */}
      <AgentChatSheet
        isOpen={showAgentChat}
        onClose={() => setShowAgentChat(false)}
        agentId={PHASE_AGENT.id}
        agentName={PHASE_AGENT.name}
        agentRole={PHASE_AGENT.role}
      />

      {/* CEO Chat Sheet */}
      <CEOChatSheet />

      {/* Agent Work Viewer */}
      {selectedDeliverable && (
        <AgentWorkViewer
          deliverable={selectedDeliverable}
          onBack={() => setSelectedDeliverable(null)}
        />
      )}
    </div>
  );
};

export default Phase1Page;
