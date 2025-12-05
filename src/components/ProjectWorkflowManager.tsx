import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, Pause, CheckCircle, Clock, AlertCircle, 
  ArrowRight, Users, FileText, Loader2, RefreshCw,
  ChevronRight, Lock, Unlock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { HelpTooltip, HELP_CONTENT } from './HelpTooltip';

interface BusinessPhase {
  id: string;
  phase_name: string;
  phase_number: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  project_id: string;
}

interface PhaseDeliverable {
  id: string;
  name: string;
  deliverable_type: string;
  status: string;
  phase_id: string;
  assigned_agent_id: string | null;
  ceo_approved: boolean | null;
  user_approved: boolean | null;
}

interface BusinessProject {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  stage: string | null;
}

const PHASE_CONFIG = [
  { number: 1, name: 'Research', icon: '🔍', color: 'from-blue-500 to-cyan-500' },
  { number: 2, name: 'Branding', icon: '🎨', color: 'from-purple-500 to-pink-500' },
  { number: 3, name: 'Development', icon: '💻', color: 'from-green-500 to-emerald-500' },
  { number: 4, name: 'Content', icon: '📝', color: 'from-yellow-500 to-orange-500' },
  { number: 5, name: 'Marketing', icon: '📣', color: 'from-red-500 to-rose-500' },
  { number: 6, name: 'Sales', icon: '💰', color: 'from-indigo-500 to-violet-500' },
];

export function ProjectWorkflowManager() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<BusinessProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [phases, setPhases] = useState<BusinessPhase[]>([]);
  const [deliverables, setDeliverables] = useState<PhaseDeliverable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startingPhase, setStartingPhase] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  useEffect(() => {
    if (selectedProject) {
      fetchProjectData();
      
      const channel = supabase
        .channel('project-workflow-updates')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'business_phases',
          filter: `project_id=eq.${selectedProject}`
        }, () => fetchProjectData())
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'phase_deliverables' 
        }, () => fetchProjectData())
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('business_projects')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    
    setProjects(data || []);
    if (data && data.length > 0 && !selectedProject) {
      setSelectedProject(data[0].id);
    }
    setIsLoading(false);
  };

  const fetchProjectData = async () => {
    if (!selectedProject) return;

    const [phasesRes, deliverablesRes] = await Promise.all([
      supabase
        .from('business_phases')
        .select('*')
        .eq('project_id', selectedProject)
        .order('phase_number'),
      supabase
        .from('phase_deliverables')
        .select('*')
        .in('phase_id', phases.map(p => p.id))
    ]);

    setPhases(phasesRes.data || []);
    
    // Fetch deliverables for all phases
    if (phasesRes.data && phasesRes.data.length > 0) {
      const phaseIds = phasesRes.data.map(p => p.id);
      const { data: delivData } = await supabase
        .from('phase_deliverables')
        .select('*')
        .in('phase_id', phaseIds);
      setDeliverables(delivData || []);
    }
  };

  const startPhase = async (phaseId: string) => {
    setStartingPhase(phaseId);
    try {
      const { error } = await supabase.functions.invoke('phase-auto-worker', {
        body: { 
          action: 'start_phase',
          phaseId 
        }
      });

      if (error) throw error;
      toast.success('Phase started! AI team is now working.');
      fetchProjectData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to start phase');
    } finally {
      setStartingPhase(null);
    }
  };

  const approveDeliverable = async (deliverableId: string) => {
    try {
      const { error } = await supabase
        .from('phase_deliverables')
        .update({ 
          user_approved: true,
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', deliverableId);

      if (error) throw error;
      toast.success('Deliverable approved!');
      fetchProjectData();
    } catch (err) {
      toast.error('Failed to approve');
    }
  };

  const getPhaseStatus = (phaseNumber: number) => {
    const phase = phases.find(p => p.phase_number === phaseNumber);
    if (!phase) return 'locked';
    return phase.status || 'pending';
  };

  const getPhaseDeliverables = (phaseId: string) => {
    return deliverables.filter(d => d.phase_id === phaseId);
  };

  const getPhaseProgress = (phaseId: string) => {
    const phaseDeliverables = getPhaseDeliverables(phaseId);
    if (phaseDeliverables.length === 0) return 0;
    const approved = phaseDeliverables.filter(d => d.status === 'approved').length;
    return Math.round((approved / phaseDeliverables.length) * 100);
  };

  const currentPhase = phases.find(p => p.status === 'active' || p.status === 'in_progress');
  const activePhaseNumber = currentPhase?.phase_number || 1;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardContent className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Projects Yet</h3>
          <p className="text-muted-foreground mb-4">
            Create a project with the CEO Agent to start your business journey
          </p>
          <Button>Create Your First Project</Button>
        </CardContent>
      </Card>
    );
  }

  const selectedProjectData = projects.find(p => p.id === selectedProject);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Project Workflow</h2>
          <HelpTooltip {...HELP_CONTENT.phase} />
        </div>
        <Button variant="outline" size="sm" onClick={fetchProjectData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Project Selector */}
      {projects.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {projects.map(project => (
            <Button
              key={project.id}
              variant={selectedProject === project.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedProject(project.id)}
            >
              {project.name}
            </Button>
          ))}
        </div>
      )}

      {/* Project Info */}
      {selectedProjectData && (
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">{selectedProjectData.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedProjectData.description}</p>
              </div>
              <Badge variant="outline">{selectedProjectData.stage || 'Starting'}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase Timeline */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Business Journey</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Visual Timeline */}
          <div className="relative">
            <div className="flex items-center justify-between mb-8">
              {PHASE_CONFIG.map((config, index) => {
                const phase = phases.find(p => p.phase_number === config.number);
                const status = getPhaseStatus(config.number);
                const isActive = status === 'active' || status === 'in_progress';
                const isCompleted = status === 'completed';
                const isLocked = status === 'locked' || status === 'pending';
                const progress = phase ? getPhaseProgress(phase.id) : 0;

                return (
                  <div key={config.number} className="flex flex-col items-center relative z-10">
                    <motion.div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                        isCompleted ? 'bg-emerald-500' :
                        isActive ? `bg-gradient-to-br ${config.color}` :
                        'bg-muted'
                      }`}
                      animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6 text-white" />
                      ) : isLocked ? (
                        <Lock className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <span>{config.icon}</span>
                      )}
                    </motion.div>
                    <span className={`text-xs mt-2 font-medium ${
                      isActive ? 'text-primary' : 
                      isCompleted ? 'text-emerald-500' : 
                      'text-muted-foreground'
                    }`}>
                      {config.name}
                    </span>
                    {isActive && (
                      <span className="text-[10px] text-primary mt-1">{progress}%</span>
                    )}
                    
                    {/* Connector Line */}
                    {index < PHASE_CONFIG.length - 1 && (
                      <div className={`absolute top-6 left-12 w-[calc(100%-48px)] h-0.5 ${
                        isCompleted ? 'bg-emerald-500' : 'bg-muted'
                      }`} style={{ left: '100%', width: '100%', transform: 'translateX(-50%)' }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Progress Bar */}
            <div className="h-1 bg-muted rounded-full overflow-hidden mb-4">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${(activePhaseNumber / 6) * 100}%` }}
                transition={{ duration: 1 }}
              />
            </div>
          </div>

          {/* Current Phase Details */}
          {currentPhase && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium">
                  Phase {currentPhase.phase_number}: {currentPhase.phase_name}
                </h4>
                <Badge className="bg-primary/20 text-primary border-primary/30">
                  Active
                </Badge>
              </div>

              {/* Deliverables */}
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {getPhaseDeliverables(currentPhase.id).map(deliverable => (
                    <div
                      key={deliverable.id}
                      className={`p-3 rounded-lg border ${
                        deliverable.status === 'approved' ? 'bg-emerald-500/5 border-emerald-500/20' :
                        deliverable.status === 'review' ? 'bg-blue-500/5 border-blue-500/20' :
                        deliverable.status === 'in_progress' ? 'bg-yellow-500/5 border-yellow-500/20' :
                        'bg-background/50 border-border/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {deliverable.status === 'approved' ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          ) : deliverable.status === 'in_progress' ? (
                            <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
                          ) : deliverable.status === 'review' ? (
                            <Clock className="w-4 h-4 text-blue-500" />
                          ) : (
                            <Clock className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="font-medium text-sm">{deliverable.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {deliverable.deliverable_type}
                          </Badge>
                          {deliverable.status === 'review' && !deliverable.user_approved && (
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => approveDeliverable(deliverable.id)}
                            >
                              Approve
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* Approval Status */}
                      <div className="flex items-center gap-4 mt-2 text-xs">
                        <span className="flex items-center gap-1">
                          CEO: {deliverable.ceo_approved ? (
                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Clock className="w-3 h-3 text-muted-foreground" />
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          You: {deliverable.user_approved ? (
                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Clock className="w-3 h-3 text-muted-foreground" />
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {getPhaseDeliverables(currentPhase.id).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No deliverables yet</p>
                      <Button 
                        size="sm" 
                        className="mt-2"
                        onClick={() => startPhase(currentPhase.id)}
                        disabled={startingPhase === currentPhase.id}
                      >
                        {startingPhase === currentPhase.id ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4 mr-1" />
                        )}
                        Start Phase Work
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* No Active Phase */}
          {!currentPhase && phases.length > 0 && (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
              <p className="text-lg font-medium">All Phases Complete!</p>
              <p className="text-muted-foreground">Your business is ready to launch</p>
            </div>
          )}

          {/* No Phases Created */}
          {phases.length === 0 && (
            <div className="text-center py-8">
              <Play className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-3" />
              <p className="text-muted-foreground">Chat with the CEO Agent to initialize project phases</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}