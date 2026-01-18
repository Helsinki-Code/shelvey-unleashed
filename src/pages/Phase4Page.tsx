import { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, FileText, Loader2, Bot, CheckCircle2, Clock, 
  Eye, MessageSquare, RefreshCw, Play, Sparkles, PenTool
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SimpleDashboardSidebar } from '@/components/SimpleDashboardSidebar';
import { AgentChatSheet } from '@/components/AgentChatSheet';
import { DeliverableCard } from '@/components/DeliverableCard';
import { LiveAgentWorkPreview } from '@/components/LiveAgentWorkPreview';
import { PhaseAgentCard } from '@/components/PhaseAgentCard';
import { PageHeader } from '@/components/PageHeader';
import { ProceedToNextPhaseButton } from '@/components/ProceedToNextPhaseButton';
import { StartPhaseButton } from '@/components/StartPhaseButton';
import { ContentGenerationStudio } from '@/components/ContentGenerationStudio';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getPhaseAgent } from '@/lib/phase-agents';

// Interfaces
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

// Get the single Content Agent for Phase 4
const PHASE_AGENT = getPhaseAgent(4)!;

export default function Phase4Page() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State
  const [project, setProject] = useState<any>(null);
  const [phase, setPhase] = useState<any>(null);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('content-studio');
  const [showAgentChat, setShowAgentChat] = useState(false);

  // Fetch data function
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

      // Fetch Phase 4
      const { data: phaseData } = await supabase
        .from('business_phases')
        .select('*')
        .eq('project_id', projectId)
        .eq('phase_number', 4)
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

      // Fetch recent activity for this project/phase
      const { data: activityData } = await supabase
        .from('agent_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      // Filter activities for this project or the phase agent
      const projectActivities = (activityData || []).filter((activity: AgentActivity) => {
        const metadata = activity.metadata as any;
        return metadata?.projectId === projectId || activity.agent_id === PHASE_AGENT.id;
      });

      setActivities(projectActivities.slice(0, 50));
    } catch (error) {
      console.error('Error fetching phase data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [projectId, user]);

  // Initial data fetch
  useEffect(() => {
    if (projectId && user) {
      fetchData();
    }
  }, [projectId, user, fetchData]);

  // Real-time subscriptions
  useEffect(() => {
    if (!projectId || !user || !phase?.id) return;

    const channel = supabase
      .channel(`phase4-updates-${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agent_activity_logs' },
        (payload) => {
          if (payload.new) {
            const newActivity = payload.new as AgentActivity;
            const metadata = newActivity.metadata as any;
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

  // Handlers
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    toast.success('Data refreshed');
  };

  // Calculations
  const calculateProgress = () => {
    if (deliverables.length === 0) return 0;
    const approved = deliverables.filter(d => d.ceo_approved && d.user_approved).length;
    return Math.round((approved / deliverables.length) * 100);
  };

  const isPhaseFullyApproved = () => {
    if (deliverables.length === 0) return false;
    return deliverables.every(d => d.ceo_approved && d.user_approved);
  };

  const getAgentStatus = () => {
    const recentActivity = activities.find(a => a.agent_id === PHASE_AGENT.id);
    if (recentActivity?.status === 'in_progress' || recentActivity?.status === 'working') {
      return 'working';
    }
    if (recentActivity?.status === 'completed') {
      return 'completed';
    }
    return 'idle';
  };

  const getAgentCurrentTask = () => {
    const recentActivity = activities.find(
      a => a.agent_id === PHASE_AGENT.id && (a.status === 'in_progress' || a.status === 'working')
    );
    return recentActivity?.action || undefined;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return date.toLocaleTimeString();
  };

  // Loading state
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
        <title>Phase 4: Content Creation | {project?.name} | ShelVey</title>
        <meta name="description" content="Create compelling content for your business with AI-powered tools" />
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
                  <PenTool className="w-6 h-6 text-primary" />
                  Phase 4: Content Creation
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

          {/* Progress Card */}
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
            phaseNumber={4}
            phaseStatus={phase?.status || 'pending'}
            onStart={fetchData}
          />

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="content-studio" className="gap-2">
                <Sparkles className="w-4 h-4" />
                Content Studio
              </TabsTrigger>
              <TabsTrigger value="agent" className="gap-2">
                <Bot className="w-4 h-4" />
                Content Agent
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

            {/* Content Studio Tab - Primary Interface */}
            <TabsContent value="content-studio">
              <ContentGenerationStudio 
                projectId={projectId!} 
                project={project}
              />
            </TabsContent>

            {/* Single Agent Tab with Live Work Preview */}
            <TabsContent value="agent">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Agent Card */}
                <PhaseAgentCard
                  phaseNumber={4}
                  status={getAgentStatus()}
                  currentTask={getAgentCurrentTask()}
                  onChat={() => setShowAgentChat(true)}
                />

                {/* Live Work Preview */}
                <LiveAgentWorkPreview
                  agentId={PHASE_AGENT.id}
                  agentName={PHASE_AGENT.name}
                  projectId={projectId!}
                />
              </div>

              {/* Agent Capabilities */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Content Agent Capabilities</CardTitle>
                    <CardDescription>Tools and skills available for content creation</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {PHASE_AGENT.capabilities.map((cap, idx) => (
                        <div 
                          key={idx}
                          className="p-3 bg-muted/50 rounded-lg text-sm text-center hover:bg-muted transition-colors"
                        >
                          {cap}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Deliverables Tab */}
            <TabsContent value="deliverables">
              <div className="space-y-6">
                {deliverables.length > 0 ? (
                  <div className="grid gap-4">
                    {deliverables.map((deliverable) => (
                      <DeliverableCard
                        key={deliverable.id}
                        deliverable={deliverable}
                        onViewWork={() => {}}
                        onRefresh={fetchData}
                      />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="text-muted-foreground">No deliverables yet. Start the phase to begin content creation.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Live Activity Tab */}
            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="w-5 h-5 text-primary" />
                    Live Activity Feed
                  </CardTitle>
                  <CardDescription>
                    Real-time updates from the Content Agent
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
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
                            <div className={`p-2 rounded-full ${
                              activity.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                              activity.status === 'in_progress' ? 'bg-primary/20 text-primary' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {activity.status === 'completed' ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : activity.status === 'in_progress' ? (
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
                              <p className="text-sm text-muted-foreground truncate">
                                {activity.action}
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {formatTime(activity.created_at)}
                              </span>
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

          {/* Proceed to Next Phase Button */}
          <ProceedToNextPhaseButton
            projectId={projectId || ''}
            currentPhaseNumber={4}
            isPhaseApproved={isPhaseFullyApproved()}
          />
        </div>
      </main>

      {/* Agent Chat Sheet */}
      <AgentChatSheet
        isOpen={showAgentChat}
        onClose={() => setShowAgentChat(false)}
        agentId={PHASE_AGENT.id}
        agentName={PHASE_AGENT.name}
        agentRole={PHASE_AGENT.role}
        projectId={projectId || ''}
      />
    </div>
  );
}
