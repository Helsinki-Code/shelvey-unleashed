import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Play, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { TRADING_AGENTS } from '@/lib/trading-agents';
import { toast } from 'sonner';
import { Navbar } from '@/components/Navbar';
import TradingActivityFeed from './TradingActivityFeed';

interface TradingPhaseLayoutProps {
  phaseNumber: number;
  children?: ReactNode;
}

interface TradingPhase {
  id: string;
  phase_number: number;
  phase_name: string;
  agent_id: string;
  status: string;
  deliverables: unknown;
  agent_work_steps: unknown;
  ceo_approved: boolean;
  user_approved: boolean;
  ceo_feedback: string | null;
  started_at: string | null;
}

interface TradingProject {
  id: string;
  name: string;
  exchange: string;
  mode: string;
  status: string;
  current_phase: number;
}

const TradingPhaseLayout = ({ phaseNumber, children }: TradingPhaseLayoutProps) => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<TradingProject | null>(null);
  const [phase, setPhase] = useState<TradingPhase | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [approving, setApproving] = useState(false);

  const agent = TRADING_AGENTS[phaseNumber];

  useEffect(() => {
    if (projectId && user) {
      fetchData();
      subscribeToUpdates();
    }
  }, [projectId, user, phaseNumber]);

  const fetchData = async () => {
    try {
      const [projectRes, phaseRes] = await Promise.all([
        supabase.from('trading_projects').select('*').eq('id', projectId).single(),
        supabase.from('trading_project_phases').select('*').eq('project_id', projectId).eq('phase_number', phaseNumber).single()
      ]);

      if (projectRes.error) throw projectRes.error;
      setProject(projectRes.data);
      setPhase(phaseRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel(`trading-phase-${projectId}-${phaseNumber}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'trading_project_phases', filter: `project_id=eq.${projectId}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleStartPhase = async () => {
    if (!user || !projectId) return;
    
    setExecuting(true);
    try {
      // First start the phase
      await supabase.functions.invoke('trading-project-worker', {
        body: { action: 'start_phase', userId: user.id, projectId, params: { phaseNumber } }
      });

      // Then execute agent work
      await supabase.functions.invoke('trading-agent-executor', {
        body: { projectId, phaseNumber, userId: user.id }
      });

      toast.success('Phase started successfully');
    } catch (error) {
      console.error('Error starting phase:', error);
      toast.error('Failed to start phase');
    } finally {
      setExecuting(false);
    }
  };

  const handleApprove = async (approverType: 'ceo' | 'user') => {
    if (!user || !projectId) return;
    
    setApproving(true);
    try {
      const { data } = await supabase.functions.invoke('trading-project-worker', {
        body: {
          action: 'approve_phase',
          userId: user.id,
          projectId,
          params: { phaseNumber, approverType, approved: true }
        }
      });

      toast.success(`${approverType === 'ceo' ? 'CEO' : 'User'} approval granted`);
      
      if (data.bothApproved && phaseNumber < 6) {
        toast.success('Phase completed! Next phase unlocked.');
      }
    } catch (error) {
      console.error('Error approving:', error);
      toast.error('Failed to approve');
    } finally {
      setApproving(false);
    }
  };

  const getStatusBadge = () => {
    if (!phase) return null;
    
    switch (phase.status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'active':
      case 'in_progress':
        return <Badge className="bg-amber-500"><Play className="h-3 w-3 mr-1" /> In Progress</Badge>;
      case 'review':
        return <Badge className="bg-primary"><AlertTriangle className="h-3 w-3 mr-1" /> Awaiting Approval</Badge>;
      case 'completed':
        return <Badge className="bg-emerald-500"><CheckCircle className="h-3 w-3 mr-1" /> Completed</Badge>;
      default:
        return <Badge variant="outline">{phase.status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8 mt-16">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  if (!project || !phase) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8 mt-16 text-center">
          <p>Phase not found</p>
          <Button onClick={() => navigate(`/trading/${projectId}`)} className="mt-4">Back to Project</Button>
        </main>
      </div>
    );
  }

  const canStart = phase.status === 'pending' && phaseNumber <= project.current_phase;
  const isWorking = phase.status === 'active' || phase.status === 'in_progress';
  const needsApproval = phase.status === 'review';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 mt-16">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/trading/${projectId}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">Phase {phaseNumber}: {phase.phase_name}</h1>
                {getStatusBadge()}
              </div>
              <p className="text-muted-foreground">{agent?.description}</p>
            </div>
          </div>
          
          {canStart && (
            <Button onClick={handleStartPhase} disabled={executing} className="gap-2">
              <Play className="h-4 w-4" />
              {executing ? 'Starting...' : 'Start Phase'}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Deliverables */}
            {phase.deliverables && Object.keys(phase.deliverables).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Deliverables</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto max-h-96">
                    {JSON.stringify(phase.deliverables, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* Work Steps */}
            {phase.agent_work_steps && phase.agent_work_steps.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Agent Work Log</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {phase.agent_work_steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                          {step.step}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{step.action}</p>
                          <p className="text-xs text-muted-foreground">{step.result}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Custom Phase Content */}
            {children}

            {/* Empty State */}
            {phase.status === 'pending' && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Play className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium mb-1">Phase Not Started</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-sm">
                    Click "Start Phase" to begin the {phase.phase_name.toLowerCase()} process.
                  </p>
                </CardContent>
              </Card>
            )}

            {isWorking && (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <Play className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-medium mb-1">{agent?.name} Working...</h3>
                    <p className="text-sm text-muted-foreground">Please wait while the agent completes the analysis.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Approval Panel */}
            {needsApproval && (
              <Card className="border-primary/50">
                <CardHeader>
                  <CardTitle className="text-base">Approval Required</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">CEO Approval</span>
                    {phase.ceo_approved ? (
                      <Badge className="bg-emerald-500">Approved</Badge>
                    ) : (
                      <Button size="sm" onClick={() => handleApprove('ceo')} disabled={approving}>
                        Approve as CEO
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">User Approval</span>
                    {phase.user_approved ? (
                      <Badge className="bg-emerald-500">Approved</Badge>
                    ) : (
                      <Button size="sm" onClick={() => handleApprove('user')} disabled={approving || !phase.ceo_approved}>
                        Approve
                      </Button>
                    )}
                  </div>
                  
                  {phase.ceo_feedback && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">CEO Feedback</p>
                      <p className="text-sm">{phase.ceo_feedback}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Activity Feed */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <TradingActivityFeed projectId={projectId!} maxItems={10} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TradingPhaseLayout;
