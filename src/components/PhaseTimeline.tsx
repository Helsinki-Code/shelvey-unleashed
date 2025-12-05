import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { BUSINESS_PHASES, PHASE_STATUS_COLORS } from '@/lib/organization';
import { Check, Clock, Play, Lock, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BusinessPhase {
  id: string;
  project_id: string;
  phase_number: number;
  phase_name: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  phase_deliverables?: PhaseDeliverable[];
}

interface PhaseDeliverable {
  id: string;
  status: string;
}

interface PhaseTimelineProps {
  projectId: string;
}

export function PhaseTimeline({ projectId }: PhaseTimelineProps) {
  const [phases, setPhases] = useState<BusinessPhase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [advancingPhase, setAdvancingPhase] = useState(false);
  const [startingWork, setStartingWork] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchPhases();

      const channel = supabase
        .channel('phase-updates')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'business_phases',
          filter: `project_id=eq.${projectId}`
        }, () => {
          fetchPhases();
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'phase_deliverables'
        }, () => {
          fetchPhases();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [projectId]);

  const fetchPhases = async () => {
    const { data, error } = await supabase
      .from('business_phases')
      .select('*, phase_deliverables(*)')
      .eq('project_id', projectId)
      .order('phase_number');

    if (data) setPhases(data);
    setIsLoading(false);
  };

  const getPhaseProgress = (phase: BusinessPhase) => {
    const deliverables = phase.phase_deliverables || [];
    if (deliverables.length === 0) return 0;
    const approved = deliverables.filter(d => d.status === 'approved').length;
    return Math.round((approved / deliverables.length) * 100);
  };

  const getPhaseIcon = (status: string) => {
    switch (status) {
      case 'completed': return <Check className="w-4 h-4" />;
      case 'active': return <Play className="w-4 h-4" />;
      case 'blocked': return <Lock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const handleAdvancePhase = async () => {
    setAdvancingPhase(true);
    try {
      const response = await supabase.functions.invoke('phase-manager', {
        body: { action: 'advance_phase', projectId }
      });

      if (response.error) throw response.error;
      
      if (response.data.projectComplete) {
        toast.success('🎉 All phases completed! Your business is ready to launch!');
      } else {
        toast.success(`Advanced to ${response.data.newPhase}`);
      }
      
      fetchPhases();
    } catch (error: any) {
      toast.error(error.message || 'Failed to advance phase');
    } finally {
      setAdvancingPhase(false);
    }
  };

  const handleStartWork = async () => {
    if (!activePhase) return;
    setStartingWork(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('phase-auto-worker', {
        body: { 
          action: 'start_phase_work', 
          userId: user.id,
          projectId,
          phaseId: activePhase.id 
        }
      });

      if (response.error) throw response.error;
      
      toast.success(`Work started! ${response.data?.data?.successfullyStarted || 0} agents now working.`);
      fetchPhases();
    } catch (error: any) {
      toast.error(error.message || 'Failed to start work');
    } finally {
      setStartingWork(false);
    }
  };

  const activePhase = phases.find(p => p.status === 'active');
  const canAdvance = activePhase && getPhaseProgress(activePhase) === 100;
  const hasNoProgress = activePhase && getPhaseProgress(activePhase) === 0 && 
    activePhase.phase_deliverables?.every(d => d.status === 'pending');

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (phases.length === 0) {
    return (
      <Card className="bg-card/50 backdrop-blur border-primary/20">
        <CardContent className="p-6 text-center text-muted-foreground">
          No phases initialized yet. Start a business project to begin.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Business Phase Timeline
        </CardTitle>
        <div className="flex gap-2">
          {hasNoProgress && (
            <Button 
              onClick={handleStartWork} 
              disabled={startingWork}
              variant="default"
              className="gap-2"
            >
              {startingWork ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Start Agents
            </Button>
          )}
          {canAdvance && (
            <Button 
              onClick={handleAdvancePhase} 
              disabled={advancingPhase}
              className="gap-2"
            >
              {advancingPhase ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              Advance to Next Phase
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Timeline */}
        <div className="relative">
          {/* Progress Line */}
          <div className="absolute top-6 left-0 right-0 h-1 bg-muted rounded-full">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-primary/50 rounded-full"
              initial={{ width: 0 }}
              animate={{ 
                width: `${(phases.filter(p => p.status === 'completed').length / 6) * 100}%` 
              }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {/* Phase Nodes */}
          <div className="relative flex justify-between">
            {phases.map((phase, index) => {
              const progress = getPhaseProgress(phase);
              const phaseInfo = BUSINESS_PHASES.find(p => p.number === phase.phase_number);
              const statusClass = PHASE_STATUS_COLORS[phase.status as keyof typeof PHASE_STATUS_COLORS];

              return (
                <motion.div
                  key={phase.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex flex-col items-center w-[16%]"
                >
                  {/* Node */}
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${statusClass} z-10 transition-all ${
                      phase.status === 'active' ? 'ring-4 ring-primary/30 animate-pulse' : ''
                    }`}
                  >
                    {getPhaseIcon(phase.status)}
                  </div>

                  {/* Phase Info */}
                  <div className="mt-3 text-center">
                    <div className="font-medium text-sm">{phase.phase_name}</div>
                    
                    {phase.status === 'active' && (
                      <div className="mt-2 w-full">
                        <Progress value={progress} className="h-1" />
                        <div className="text-xs text-muted-foreground mt-1">
                          {progress}% complete
                        </div>
                      </div>
                    )}

                    {phase.status === 'completed' && (
                      <Badge variant="outline" className="mt-2 text-xs bg-green-500/20 text-green-500 border-green-500/30">
                        Completed
                      </Badge>
                    )}

                    {phase.status === 'pending' && (
                      <div className="text-xs text-muted-foreground mt-2">
                        Waiting
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Active Phase Details */}
        {activePhase && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-4 bg-primary/5 border border-primary/20 rounded-lg"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Current Phase: {activePhase.phase_name}</h4>
              <Badge className="bg-primary">{getPhaseProgress(activePhase)}%</Badge>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {activePhase.phase_deliverables?.map(deliverable => {
                const statusColors: Record<string, string> = {
                  pending: 'bg-muted text-muted-foreground',
                  in_progress: 'bg-yellow-500/20 text-yellow-500',
                  review: 'bg-blue-500/20 text-blue-500',
                  approved: 'bg-green-500/20 text-green-500',
                  rejected: 'bg-red-500/20 text-red-500'
                };

                return (
                  <div
                    key={deliverable.id}
                    className={`px-3 py-2 rounded text-xs ${statusColors[deliverable.status]}`}
                  >
                    {deliverable.status === 'approved' && <Check className="w-3 h-3 inline mr-1" />}
                    {deliverable.status.replace('_', ' ')}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
