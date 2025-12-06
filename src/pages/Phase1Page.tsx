import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, TrendingUp, Users, Target, Loader2, Bot, CheckCircle2, Clock, Eye, Download, ExternalLink, MessageSquare, Camera, Link2, Sparkles, Play, Image } from 'lucide-react';
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
import { PageHeader } from '@/components/PageHeader';
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

const PHASE_1_AGENTS = [
  { id: 'head-of-research', name: 'Head of Research', icon: Bot, color: 'text-primary', bgColor: 'bg-primary/10', role: 'Research Division Manager', isManager: true, description: 'Oversees all research activities and coordinates team efforts' },
  { id: 'market-research', name: 'Market Research Agent', icon: Search, color: 'text-blue-500', bgColor: 'bg-blue-500/10', role: 'Market Analyst', description: 'Analyzes market size, growth, and opportunities' },
  { id: 'trend-prediction', name: 'Trend Prediction Agent', icon: TrendingUp, color: 'text-purple-500', bgColor: 'bg-purple-500/10', role: 'Trend Analyst', description: 'Identifies emerging trends and future market directions' },
  { id: 'customer-profiler', name: 'Customer Profiler Agent', icon: Users, color: 'text-green-500', bgColor: 'bg-green-500/10', role: 'Customer Insights Specialist', description: 'Creates detailed customer personas and segments' },
  { id: 'competitor-analyst', name: 'Competitor Analyst Agent', icon: Target, color: 'text-orange-500', bgColor: 'bg-orange-500/10', role: 'Competitive Intelligence Analyst', description: 'Maps competitive landscape and identifies gaps' },
];

const Phase1Page = () => {
  const { projectId, phaseNumber } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [phase, setPhase] = useState<any>(null);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDeliverable, setSelectedDeliverable] = useState<Deliverable | null>(null);
  const [activeTab, setActiveTab] = useState('agents');
  const [chatAgent, setChatAgent] = useState<typeof PHASE_1_AGENTS[0] | null>(null);

  useEffect(() => {
    if (projectId && user) {
      fetchData();
      const unsubscribe = subscribeToUpdates();
      return unsubscribe;
    }
  }, [projectId, user]);

  const fetchData = async () => {
    // Fetch project
    const { data: projectData } = await supabase
      .from('business_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectData) setProject(projectData);

    // Fetch phase (use phaseNumber from URL or default to 1)
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

    // Fetch recent activity
    const { data: activityData } = await supabase
      .from('agent_activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (activityData) setActivities(activityData);

    setIsLoading(false);
  };

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel('phase1-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agent_activity_logs' },
        (payload) => {
          if (payload.new) {
            setActivities(prev => [payload.new as AgentActivity, ...prev.slice(0, 49)]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'phase_deliverables' },
        (payload) => {
          if (payload.new) {
            setDeliverables(prev =>
              prev.map(d => d.id === (payload.new as Deliverable).id ? payload.new as Deliverable : d)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const calculateProgress = () => {
    if (deliverables.length === 0) return 0;
    const approved = deliverables.filter(d => d.ceo_approved && d.user_approved).length;
    return Math.round((approved / deliverables.length) * 100);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="agents" className="gap-2">
                <Bot className="w-4 h-4" />
                AI Team ({PHASE_1_AGENTS.length})
              </TabsTrigger>
              <TabsTrigger value="deliverables" className="gap-2">
                <Eye className="w-4 h-4" />
                Deliverables ({deliverables.length})
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2">
                <Play className="w-4 h-4" />
                Live Activity
              </TabsTrigger>
            </TabsList>

            {/* AI Team Tab - Agent Cards with Live Previews */}
            <TabsContent value="agents">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {PHASE_1_AGENTS.map((agent, index) => {
                  const status = getAgentStatus(agent.id);
                  const currentTask = getAgentCurrentTask(agent.id);
                  const agentDeliverables = getAgentDeliverables(agent.id);
                  const latestScreenshot = getAgentLatestScreenshot(agent.id);
                  const Icon = agent.icon;
                  const completedCount = agentDeliverables.filter(d => d.status === 'approved').length;

                  return (
                    <motion.div
                      key={agent.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className={`overflow-hidden ${agent.isManager ? 'border-primary/50 ring-1 ring-primary/20' : ''}`}>
                        {/* Agent Header */}
                        <CardHeader className={`pb-3 ${agent.bgColor}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-3 rounded-xl bg-background/80 ${agent.color}`}>
                                <Icon className="w-6 h-6" />
                              </div>
                              <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                  {agent.name}
                                  {agent.isManager && (
                                    <Badge variant="secondary" className="text-xs">Manager</Badge>
                                  )}
                                </CardTitle>
                                <CardDescription>{agent.role}</CardDescription>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`w-3 h-3 rounded-full ${
                                status === 'in_progress' ? 'bg-green-500 animate-pulse' :
                                status === 'completed' ? 'bg-blue-500' : 'bg-muted-foreground'
                              }`} />
                              <span className="text-xs font-medium capitalize">
                                {status === 'in_progress' ? 'Working' : status}
                              </span>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="p-4 space-y-4">
                          {/* Description */}
                          <p className="text-sm text-muted-foreground">{agent.description}</p>

                          {/* Current Task */}
                          {currentTask && (
                            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                              <p className="text-xs font-medium text-primary mb-1">Currently Working On:</p>
                              <p className="text-sm">{currentTask}</p>
                            </div>
                          )}

                          {/* Live Work Preview */}
                          <div className="rounded-lg border overflow-hidden">
                            <div className="bg-muted px-3 py-2 flex items-center justify-between border-b">
                              <span className="text-xs font-medium flex items-center gap-1">
                                <Image className="w-3 h-3" />
                                Live Work Preview
                              </span>
                              {status === 'in_progress' && (
                                <span className="text-xs text-green-500 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                  Live
                                </span>
                              )}
                            </div>
                            <div className="aspect-video bg-muted/50 flex items-center justify-center relative">
                              {latestScreenshot ? (
                                <img
                                  src={latestScreenshot}
                                  alt="Latest work screenshot"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="text-center text-muted-foreground p-4">
                                  <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                  <p className="text-xs">Screenshots will appear here as agent works</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Stats Row */}
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Eye className="w-4 h-4" />
                                {agentDeliverables.length} deliverables
                              </span>
                              <span className="flex items-center gap-1 text-green-500">
                                <CheckCircle2 className="w-4 h-4" />
                                {completedCount} approved
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="default"
                              onClick={() => setChatAgent(agent)}
                              className="flex-1 gap-2"
                            >
                              <MessageSquare className="w-4 h-4" />
                              Chat with {agent.isManager ? 'Manager' : 'Agent'}
                            </Button>
                            {agentDeliverables.length > 0 && (
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSelectedDeliverable(agentDeliverables[0]);
                                  setActiveTab('agent-work');
                                }}
                                className="gap-2"
                              >
                                <Eye className="w-4 h-4" />
                                View Work
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Deliverables Tab */}
            <TabsContent value="deliverables">
              <div className="grid gap-4">
                {deliverables.length > 0 ? (
                  deliverables.map((deliverable, index) => (
                    <motion.div
                      key={deliverable.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <DeliverableCard
                        deliverable={deliverable}
                        onViewWork={() => {
                          setSelectedDeliverable(deliverable);
                          setActiveTab('agent-work');
                        }}
                        onRefresh={fetchData}
                      />
                    </motion.div>
                  ))
                ) : (
                  <Card>
                    <CardContent className="py-16 text-center">
                      <Loader2 className="w-12 h-12 text-muted-foreground mx-auto mb-4 animate-spin" />
                      <h3 className="text-lg font-semibold mb-2">Generating Deliverables...</h3>
                      <p className="text-muted-foreground">
                        Agents are being assigned to create research deliverables
                      </p>
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
                    <Play className="w-5 h-5 text-green-500" />
                    Real-Time Activity Feed
                    <span className="ml-2 w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  </CardTitle>
                  <CardDescription>
                    Live updates from all agents working on Phase 1
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {activities.length > 0 ? (
                        activities.map((activity) => {
                          const agent = PHASE_1_AGENTS.find(a => a.id === activity.agent_id);
                          const Icon = agent?.icon || Bot;
                          
                          return (
                            <motion.div
                              key={activity.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                            >
                              <div className={`p-2 rounded-full ${
                                activity.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                                activity.status === 'in_progress' ? 'bg-blue-500/20 text-blue-500' :
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
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Icon className={`w-4 h-4 ${agent?.color || 'text-muted-foreground'}`} />
                                  <p className="font-medium text-sm">{activity.agent_name}</p>
                                </div>
                                <p className="text-sm text-muted-foreground">{activity.action}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(activity.created_at).toLocaleTimeString()}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const matchingAgent = PHASE_1_AGENTS.find(a => a.id === activity.agent_id);
                                  if (matchingAgent) setChatAgent(matchingAgent);
                                }}
                              >
                                <MessageSquare className="w-4 h-4" />
                              </Button>
                            </motion.div>
                          );
                        })
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No activity yet - agents will start working soon</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Agent Work Viewer (hidden tab for viewing deliverable details) */}
            {activeTab === 'agent-work' && selectedDeliverable && (
              <AgentWorkViewer
                deliverable={selectedDeliverable}
                onBack={() => {
                  setSelectedDeliverable(null);
                  setActiveTab('deliverables');
                }}
              />
            )}
          </Tabs>
        </div>
      </main>

      <CEOChatSheet />

      {/* Agent Chat Sheet */}
      {chatAgent && (
        <AgentChatSheet
          isOpen={!!chatAgent}
          onClose={() => setChatAgent(null)}
          agentId={chatAgent.id}
          agentName={chatAgent.name}
          agentRole={chatAgent.role}
          isManager={chatAgent.isManager}
          projectId={projectId}
          phaseId={phase?.id}
        />
      )}
    </div>
  );
};

export default Phase1Page;