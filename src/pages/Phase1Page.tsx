import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, TrendingUp, Users, Target, Loader2, Bot, CheckCircle2, Clock, Eye, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SimpleDashboardSidebar } from '@/components/SimpleDashboardSidebar';
import { CEOChatSheet } from '@/components/CEOChatSheet';
import { AgentWorkViewer } from '@/components/AgentWorkViewer';
import { DeliverableCard } from '@/components/DeliverableCard';
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
  { id: 'market-research', name: 'Market Research Agent', icon: Search, color: 'text-blue-500' },
  { id: 'trend-prediction', name: 'Trend Prediction Agent', icon: TrendingUp, color: 'text-purple-500' },
  { id: 'customer-profiler', name: 'Customer Profiler Agent', icon: Users, color: 'text-green-500' },
  { id: 'competitor-analyst', name: 'Competitor Analyst Agent', icon: Target, color: 'text-orange-500' },
];

const Phase1Page = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [phase, setPhase] = useState<any>(null);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDeliverable, setSelectedDeliverable] = useState<Deliverable | null>(null);
  const [activeTab, setActiveTab] = useState('deliverables');

  useEffect(() => {
    if (projectId && user) {
      fetchData();
      subscribeToUpdates();
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

    // Fetch phase
    const { data: phaseData } = await supabase
      .from('business_phases')
      .select('*')
      .eq('project_id', projectId)
      .eq('phase_number', 1)
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
      .limit(20);

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
            setActivities(prev => [payload.new as AgentActivity, ...prev.slice(0, 19)]);
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
                onClick={() => navigate(`/projects/${projectId}/overview`)}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Phase 1: Research & Discovery</h1>
                <p className="text-muted-foreground">{project?.name}</p>
              </div>
            </div>
            <Badge className={phase?.status === 'active' ? 'bg-green-500' : 'bg-muted'}>
              {phase?.status || 'pending'}
            </Badge>
          </div>

          {/* Progress Bar */}
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Phase Progress</span>
                <span className="font-semibold">{calculateProgress()}%</span>
              </div>
              <Progress value={calculateProgress()} className="h-3" />
            </CardContent>
          </Card>

          {/* Active Agents Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h2 className="text-lg font-semibold mb-4">Active Agents</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {PHASE_1_AGENTS.map((agent) => {
                const status = getAgentStatus(agent.id);
                const Icon = agent.icon;
                return (
                  <Card key={agent.id} className="relative overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-muted ${agent.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{agent.name}</p>
                          <div className="flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full ${
                              status === 'in_progress' ? 'bg-green-500 animate-pulse' :
                              status === 'completed' ? 'bg-blue-500' : 'bg-muted-foreground'
                            }`} />
                            <span className="text-xs text-muted-foreground capitalize">
                              {status === 'in_progress' ? 'Working' : status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </motion.div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="deliverables">Deliverables</TabsTrigger>
              <TabsTrigger value="activity">Live Activity</TabsTrigger>
              <TabsTrigger value="agent-work">Agent Work</TabsTrigger>
            </TabsList>

            <TabsContent value="deliverables">
              <div className="grid gap-4">
                {deliverables.map((deliverable, index) => (
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
                ))}
              </div>
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-primary" />
                    Real-Time Activity Feed
                  </CardTitle>
                  <CardDescription>
                    Live updates from all agents working on Phase 1
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {activities.map((activity) => (
                        <div
                          key={activity.id}
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
                            <p className="font-medium text-sm">{activity.agent_name}</p>
                            <p className="text-sm text-muted-foreground">{activity.action}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(activity.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="agent-work">
              {selectedDeliverable ? (
                <AgentWorkViewer
                  deliverable={selectedDeliverable}
                  onBack={() => setSelectedDeliverable(null)}
                />
              ) : (
                <Card>
                  <CardContent className="py-16 text-center">
                    <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Select a Deliverable</h3>
                    <p className="text-muted-foreground mb-4">
                      Go to the Deliverables tab and click "View Work" on any deliverable to see the agent's work with screenshots and citations.
                    </p>
                    <Button onClick={() => setActiveTab('deliverables')}>
                      View Deliverables
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <CEOChatSheet currentPage={`/projects/${projectId}/phase/1`} />
    </div>
  );
};

export default Phase1Page;