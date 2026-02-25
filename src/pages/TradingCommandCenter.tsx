import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, Activity, ShieldCheck, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { TRADING_PHASES } from '@/lib/trading-agents';
import { toast } from 'sonner';
import { Navbar } from '@/components/Navbar';
import TradingKillSwitch from '@/components/trading/TradingKillSwitch';
import TradingActivityFeed from '@/components/trading/TradingActivityFeed';
import TradingCEOControlTower from '@/components/trading/TradingCEOControlTower';

interface TradingProject {
  id: string;
  name: string;
  exchange: string;
  mode: string;
  status: string;
  capital: number;
  total_pnl: number;
  risk_level: string;
  current_phase: number;
}

interface TradingPhase {
  id: string;
  phase_number: number;
  phase_name: string;
  agent_id: string;
  status: string;
  deliverables: unknown;
  ceo_approved: boolean;
  user_approved: boolean;
  started_at: string | null;
  completed_at: string | null;
}

interface RiskControls {
  max_position_pct: number;
  daily_loss_limit: number;
  stop_loss_pct: number;
  kill_switch_active: boolean;
}

const TradingCommandCenter = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<TradingProject | null>(null);
  const [phases, setPhases] = useState<TradingPhase[]>([]);
  const [riskControls, setRiskControls] = useState<RiskControls | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId && user) {
      fetchProjectData();
      const interval = setInterval(fetchProjectData, 15000);
      return () => clearInterval(interval);
    }
  }, [projectId, user]);

  const fetchProjectData = async () => {
    if (!user || !projectId) return;
    try {
      const { data, error } = await supabase.functions.invoke('trading-project-worker', {
        body: {
          action: 'get_project_state',
          userId: user.id,
          projectId,
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to fetch project state');
      setProject(data.project || null);
      setPhases(data.phases || []);
      setRiskControls(data.riskControls || null);
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const handleKillSwitch = async (activate: boolean) => {
    if (!user || !projectId) return;
    
    try {
      await supabase.functions.invoke('trading-project-worker', {
        body: {
          action: activate ? 'activate_kill_switch' : 'deactivate_kill_switch',
          userId: user.id,
          projectId
        }
      });
      
      toast.success(activate ? 'Kill switch activated - all trading halted' : 'Kill switch deactivated');
    } catch (error) {
      console.error('Kill switch error:', error);
      toast.error('Failed to toggle kill switch');
    }
  };

  const getPhaseRoute = (phaseNumber: number) => {
    const routes: Record<number, string> = {
      1: 'research',
      2: 'strategy',
      3: 'setup',
      4: 'execution',
      5: 'monitor',
      6: 'optimize'
    };
    return routes[phaseNumber] || 'research';
  };

  const getPhaseStatus = (phase: TradingPhase) => {
    if (phase.status === 'completed') return { color: 'bg-emerald-500', label: 'Complete' };
    if (phase.status === 'in_progress') return { color: 'bg-amber-500 animate-pulse', label: 'In Progress' };
    if (phase.status === 'review') return { color: 'bg-primary', label: 'Review' };
    if (phase.status === 'active') return { color: 'bg-primary', label: 'Active' };
    return { color: 'bg-muted', label: 'Pending' };
  };

  const completedPhases = phases.filter(p => p.status === 'completed').length;
  const progressPercent = (completedPhases / 6) * 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8 mt-16">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8 mt-16 text-center">
          <p>Project not found</p>
          <Button onClick={() => navigate('/trading')} className="mt-4">Back to Projects</Button>
        </main>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{project.name} | Trading Terminal</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="container mx-auto px-4 py-8 mt-16">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/trading')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">{project.name}</h1>
                  <Badge variant={project.mode === 'live' ? 'destructive' : 'secondary'}>
                    {project.mode === 'live' ? 'LIVE' : 'PAPER'}
                  </Badge>
                  <Badge variant="outline" className={
                    project.status === 'active' ? 'border-emerald-500 text-emerald-500' :
                    project.status === 'stopped' ? 'border-destructive text-destructive' :
                    'border-muted-foreground'
                  }>
                    {project.status}
                  </Badge>
                </div>
                <p className="text-muted-foreground capitalize">{project.exchange} | {project.risk_level} risk profile</p>
              </div>
            </div>
            
            <TradingKillSwitch 
              active={riskControls?.kill_switch_active || false}
              onToggle={handleKillSwitch}
            />
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Capital</p>
                <p className="text-xl font-bold">${Number(project.capital).toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">P&L</p>
                <p className={`text-xl font-bold flex items-center gap-1 ${Number(project.total_pnl) >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                  {Number(project.total_pnl) >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {Number(project.total_pnl) >= 0 ? '+' : ''}${Number(project.total_pnl).toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Current Phase</p>
                <p className="text-xl font-bold">{project.current_phase}/6</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Progress</p>
                <div className="flex items-center gap-2">
                  <Progress value={progressPercent} className="flex-1" />
                  <span className="text-sm font-medium">{Math.round(progressPercent)}%</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk Alert */}
          {riskControls?.kill_switch_active && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Emergency Stop Active</p>
                <p className="text-sm text-muted-foreground">All trading has been halted. Deactivate kill switch to resume.</p>
              </div>
            </div>
          )}

          {/* CEO Control Tower */}
          <div className="mb-6">
            <div className="mb-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border bg-muted/20 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Workflow className="h-4 w-4 text-primary" />
                  <span className="font-medium">Strategy Promotion Pipeline</span>
                </div>
                <p className="text-xs text-muted-foreground">Research to Backtest to Paper to Staged Live to Full Live.</p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/20 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span className="font-medium">Approval-Gated Lifecycle</span>
                </div>
                <p className="text-xs text-muted-foreground">CEO and user approvals are required before each stage promotion.</p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/20 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-4 w-4 text-primary" />
                  <span className="font-medium">Autonomous Worker Ops</span>
                </div>
                <p className="text-xs text-muted-foreground">Task generation, reconciliation, snapshots, and stage progression from control tower.</p>
              </div>
            </div>
            <TradingCEOControlTower projectId={projectId!} />
          </div>

          {/* Phases Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {phases.map((phase) => {
              const phaseInfo = TRADING_PHASES.find(p => p.number === phase.phase_number);
              const status = getPhaseStatus(phase);
              const isAccessible = phase.phase_number <= project.current_phase;
              const isActive = phase.status === 'active' || phase.status === 'in_progress' || phase.status === 'review';

              return (
                <Card 
                  key={phase.id}
                  className={`transition-all ${isAccessible ? 'cursor-pointer hover:border-primary/50' : 'opacity-50'}`}
                  onClick={() => isAccessible && navigate(`/trading/${projectId}/${getPhaseRoute(phase.phase_number)}`)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${status.color}`} />
                        <CardTitle className="text-base">Phase {phase.phase_number}</CardTitle>
                      </div>
                      <Badge variant="outline" className="text-xs">{status.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium mb-1">{phase.phase_name}</p>
                    <p className="text-sm text-muted-foreground mb-3">{phaseInfo?.agent.description}</p>
                    
                    {phase.status === 'review' && (
                      <div className="flex gap-2 text-xs">
                        <Badge variant={phase.ceo_approved ? 'default' : 'outline'}>
                          CEO {phase.ceo_approved ? 'Approved' : 'Pending'}
                        </Badge>
                        <Badge variant={phase.user_approved ? 'default' : 'outline'}>
                          User {phase.user_approved ? 'Approved' : 'Pending'}
                        </Badge>
                      </div>
                    )}
                    
                    {isActive && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-primary">
                        <Activity className="h-4 w-4 animate-pulse" />
                        <span>Agent working...</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Activity Feed */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Activity Feed</CardTitle>
            </CardHeader>
            <CardContent>
              <TradingActivityFeed projectId={projectId!} />
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  );
};

export default TradingCommandCenter;
