import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft,
  DollarSign,
  Users,
  TrendingUp,
  Phone,
  Mail,
  BarChart3,
  MessageSquare,
  CheckCircle,
  Clock,
  Loader2,
  Target,
  Handshake,
  Bot
} from "lucide-react";
import { SimpleDashboardSidebar } from "@/components/SimpleDashboardSidebar";
import { PageHeader } from "@/components/PageHeader";
import { ProceedToNextPhaseButton } from "@/components/ProceedToNextPhaseButton";
import { StartPhaseButton } from "@/components/StartPhaseButton";
import { AgentChatSheet } from "@/components/AgentChatSheet";
import { DeliverableCard } from "@/components/DeliverableCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

import { getPhaseAgent } from '@/lib/phase-agents';
import { PhaseAgentCard } from '@/components/PhaseAgentCard';

const PHASE_AGENT = getPhaseAgent(6)!;

interface Deliverable {
  id: string;
  name: string;
  description: string;
  deliverable_type: string;
  status: string;
  ceo_approved: boolean;
  user_approved: boolean;
  feedback: string;
  generated_content: any;
  screenshots: any;
  citations: any;
  assigned_agent_id: string;
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

export default function Phase6Page() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [phase, setPhase] = useState<any>(null);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAgentChat, setShowAgentChat] = useState(false);
  const [selectedDeliverable, setSelectedDeliverable] = useState<Deliverable | null>(null);

  useEffect(() => {
    if (projectId && user) {
      loadData();
      setupRealtimeSubscription();
    }
  }, [projectId, user]);

  const loadData = async () => {
    try {
      // Get project
      const { data: projectData } = await supabase
        .from('business_projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      setProject(projectData);

      // Get phase 6
      const { data: phaseData } = await supabase
        .from('business_phases')
        .select('*')
        .eq('project_id', projectId)
        .eq('phase_number', 6)
        .single();

      setPhase(phaseData);

      if (phaseData) {
        // Get deliverables
        const { data: deliverablesData } = await supabase
          .from('phase_deliverables')
          .select('*')
          .eq('phase_id', phaseData.id)
          .order('created_at');

        setDeliverables(deliverablesData || []);
      }

      // Get recent activities
      const { data: activitiesData } = await supabase
        .from('agent_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      setActivities(activitiesData || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('phase6-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'phase_deliverables',
      }, () => loadData())
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'agent_activity_logs',
      }, (payload) => {
        setActivities(prev => [payload.new as AgentActivity, ...prev.slice(0, 19)]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const isPhaseFullyApproved = () => {
    if (deliverables.length === 0) return false;
    return deliverables.every(d => d.ceo_approved && d.user_approved);
  };

  const getProgressPercent = () => {
    if (deliverables.length === 0) return 0;
    const approved = deliverables.filter(d => d.ceo_approved && d.user_approved).length;
    return (approved / deliverables.length) * 100;
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
    <div className="flex h-screen bg-background">
      <SimpleDashboardSidebar />
      
      <main className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
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
                    <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500">
                      <DollarSign className="h-5 w-5 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold">Phase 6: Sales & Growth</h1>
                    <Badge variant={phase?.status === 'active' ? 'default' : 'secondary'}>
                      {phase?.status || 'pending'}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-1">
                    {project?.name} - Generate revenue and scale your business
                  </p>
                </div>
              </div>
              <PageHeader showNotifications={true} showLogout={true} />
            </div>

            {/* Progress */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">Phase Progress</h3>
                    <p className="text-sm text-muted-foreground">
                      {deliverables.filter(d => d.ceo_approved && d.user_approved).length} of {deliverables.length} deliverables approved
                    </p>
                  </div>
                  <Badge variant="outline" className="text-lg px-4 py-1">
                    {getProgressPercent().toFixed(0)}%
                  </Badge>
                </div>
                <Progress value={getProgressPercent()} className="h-3" />
              </CardContent>
            </Card>

            {/* Start Phase Button */}
            <StartPhaseButton
              projectId={projectId!}
              phaseNumber={6}
              phaseStatus={phase?.status || 'pending'}
              onStart={loadData}
            />

            {/* Main Tabs */}
            <Tabs defaultValue="team" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="team" className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  AI Team
                </TabsTrigger>
                <TabsTrigger value="pipeline" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Pipeline
                </TabsTrigger>
                <TabsTrigger value="deliverables" className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Deliverables
                </TabsTrigger>
                <TabsTrigger value="activity" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Activity
                </TabsTrigger>
              </TabsList>

              <TabsContent value="team">
                <div className="max-w-2xl">
                  <PhaseAgentCard 
                    phaseNumber={6} 
                    status="idle"
                    onChat={() => setShowAgentChat(true)}
                  />
                </div>
              </TabsContent>

              <TabsContent value="pipeline">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Sales Pipeline
                    </CardTitle>
                    <CardDescription>
                      Track leads and deals through your sales funnel
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      {['Lead', 'Qualified', 'Proposal', 'Closed'].map((stage, idx) => (
                        <Card key={stage} className="bg-muted/50">
                          <CardContent className="p-4 text-center">
                            <h4 className="font-semibold text-lg">{stage}</h4>
                            <p className="text-3xl font-bold mt-2">0</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              ${(idx * 5000).toLocaleString()} value
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <div className="mt-6 text-center text-muted-foreground">
                      <p>Sales pipeline data will appear as agents generate leads and close deals.</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="deliverables">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {deliverables.map((deliverable) => (
                    <DeliverableCard
                      key={deliverable.id}
                      deliverable={deliverable}
                      onViewWork={() => setSelectedDeliverable(deliverable)}
                      onRefresh={loadData}
                    />
                  ))}
                  {deliverables.length === 0 && (
                    <div className="col-span-2 text-center py-12 text-muted-foreground">
                      <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No deliverables yet</p>
                      <p className="text-sm">Start the phase to generate sales deliverables</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="activity">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {activities.slice(0, 10).map((activity) => (
                        <div key={activity.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <div className={`w-2 h-2 rounded-full ${
                            activity.status === 'completed' ? 'bg-green-500' :
                            activity.status === 'in_progress' ? 'bg-yellow-500' : 'bg-gray-500'
                          }`} />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{activity.agent_name}</p>
                            <p className="text-xs text-muted-foreground">{activity.action}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(activity.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                      {activities.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                          No activity yet. Start the phase to see agent work.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Proceed Button */}
            <div className="pb-6">
              <ProceedToNextPhaseButton
                projectId={projectId || ''}
                currentPhaseNumber={6}
                isPhaseApproved={isPhaseFullyApproved()}
              />
            </div>
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
  );
}
