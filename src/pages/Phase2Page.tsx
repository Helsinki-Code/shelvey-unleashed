import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Palette, Image, Type, Sparkles, Loader2, Bot, CheckCircle2, Clock, Eye, Play, MessageSquare, Camera, Layers, PaintBucket, Crown } from 'lucide-react';
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

const PHASE_AGENT = getPhaseAgent(2)!;

const Phase2Page = () => {
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
  const [showAgentChat, setShowAgentChat] = useState(false);

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

    // Fetch phase
    const phaseNum = parseInt(phaseNumber || '2');
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
      .channel('phase2-updates')
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

  // Phase 2: show either live screenshots or generated brand asset images as previews
  const getAgentPreviewImage = (agentId: string) => {
    const agentDeliverables = getAgentDeliverables(agentId);
    for (const d of agentDeliverables) {
      // Prefer explicit screenshots if present
      if (d.screenshots && Array.isArray(d.screenshots) && d.screenshots.length > 0) {
        return d.screenshots[d.screenshots.length - 1];
      }
      // Fallback to generated brand assets from generated_content
      const gc = d.generated_content || {};
      if (gc.primaryLogo?.imageUrl) return gc.primaryLogo.imageUrl;
      if (Array.isArray(gc.assets)) {
        const logoAsset = gc.assets.find((a: any) => a.type === 'logo' && a.imageUrl);
        if (logoAsset) return logoAsset.imageUrl;
        const anyAsset = gc.assets.find((a: any) => a.imageUrl);
        if (anyAsset) return anyAsset.imageUrl;
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
        <title>Phase 2: Brand & Identity | {project?.name} | ShelVey</title>
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
                  <Palette className="w-6 h-6 text-primary" />
                  Phase 2: Brand & Identity
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

          {/* Start Phase Button */}
          <StartPhaseButton
            projectId={projectId!}
            phaseNumber={2}
            phaseStatus={phase?.status || 'pending'}
            onStart={fetchData}
          />

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="agent" className="gap-2">
                <Bot className="w-4 h-4" />
                Brand Agent
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

            {/* Single Agent Tab */}
            <TabsContent value="agent">
              <div className="max-w-2xl">
                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-primary/10 text-primary">
                          <Palette className="w-6 h-6" />
                        </div>
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {PHASE_AGENT.name}
                            <Badge variant="secondary" className="text-xs">Phase 2</Badge>
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
                        Agents are being assigned to create brand assets
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
                    Live updates from the brand agent working on Phase 2
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {activities.length > 0 ? (
                        activities.map((activity) => (
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
                              <p className="font-medium text-sm">{activity.agent_name}</p>
                              <p className="text-sm text-muted-foreground">{activity.action}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(activity.created_at).toLocaleTimeString()}
                              </p>
                            </div>
                          </motion.div>
                        ))
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No activity yet - click "Start Phase" to activate agents</p>
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

          {/* Proceed to Next Phase Button */}
          <ProceedToNextPhaseButton
            projectId={projectId || ''}
            currentPhaseNumber={2}
            isPhaseApproved={isPhaseFullyApproved()}
          />
        </div>
      </main>

      <CEOChatSheet />

      {/* Agent Chat Sheet */}
      {/* Agent Chat Sheet */}
      <AgentChatSheet
        isOpen={showAgentChat}
        onClose={() => setShowAgentChat(false)}
        agentId={PHASE_AGENT.id}
        agentName={PHASE_AGENT.name}
        agentRole={PHASE_AGENT.role}
        projectId={projectId}
        phaseId={phase?.id}
      />
    </div>
  );
};

export default Phase2Page;
