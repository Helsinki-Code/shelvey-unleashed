import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, CheckCircle2, Circle, PlayCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Phase {
  id: string;
  phase_number: number;
  phase_name: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  deliverables?: Deliverable[];
}

interface Deliverable {
  id: string;
  name: string;
  status: string;
  ceo_approved: boolean;
  user_approved: boolean;
}

interface ProjectProgressDashboardProps {
  projectId?: string;
}

const phaseConfig = [
  { number: 1, name: 'Research', icon: '🔬', color: 'from-blue-500/20 to-blue-600/20' },
  { number: 2, name: 'Branding', icon: '🎨', color: 'from-purple-500/20 to-purple-600/20' },
  { number: 3, name: 'Development', icon: '💻', color: 'from-green-500/20 to-green-600/20' },
  { number: 4, name: 'Content', icon: '📝', color: 'from-orange-500/20 to-orange-600/20' },
  { number: 5, name: 'Marketing', icon: '📢', color: 'from-pink-500/20 to-pink-600/20' },
  { number: 6, name: 'Sales', icon: '💰', color: 'from-yellow-500/20 to-yellow-600/20' },
];

export const ProjectProgressDashboard = ({ projectId }: ProjectProgressDashboardProps) => {
  const { user } = useAuth();
  const [phases, setPhases] = useState<Phase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPhases = async () => {
      if (!user || !projectId) {
        setIsLoading(false);
        return;
      }

      const { data: phasesData } = await supabase
        .from('business_phases')
        .select('*')
        .eq('project_id', projectId)
        .order('phase_number', { ascending: true });

      if (phasesData) {
        // Fetch deliverables for each phase
        const phasesWithDeliverables = await Promise.all(
          phasesData.map(async (phase) => {
            const { data: deliverables } = await supabase
              .from('phase_deliverables')
              .select('id, name, status, ceo_approved, user_approved')
              .eq('phase_id', phase.id);

            return { ...phase, deliverables: deliverables || [] };
          })
        );

        setPhases(phasesWithDeliverables);
      }

      setIsLoading(false);
    };

    fetchPhases();

    // Subscribe to real-time updates
    if (projectId) {
      const channel = supabase
        .channel('phases-progress')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'business_phases',
            filter: `project_id=eq.${projectId}`,
          },
          () => fetchPhases()
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'phase_deliverables',
          },
          () => fetchPhases()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, projectId]);

  const calculateProgress = (phase: Phase) => {
    if (!phase.deliverables || phase.deliverables.length === 0) return 0;

    const approved = phase.deliverables.filter(
      (d) => d.ceo_approved && d.user_approved
    ).length;

    return Math.round((approved / phase.deliverables.length) * 100);
  };

  const getPhaseStatus = (phase: Phase, index: number) => {
    if (phase.status === 'completed') return 'completed';
    if (phase.status === 'active') return 'active';

    // Check if previous phase is completed
    if (index > 0) {
      const prevPhase = phases[index - 1];
      if (prevPhase?.status !== 'completed') return 'locked';
    }

    return 'pending';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'active':
        return <PlayCircle className="h-5 w-5 text-primary animate-pulse" />;
      case 'locked':
        return <Lock className="h-5 w-5 text-muted-foreground" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!projectId) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Select a project to view progress</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate overall progress
  const overallProgress =
    phases.length > 0
      ? Math.round(
          phases.reduce((acc, phase) => acc + calculateProgress(phase), 0) /
            phases.length
        )
      : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            📊 Project Progress
          </CardTitle>
          <Badge variant="outline" className="text-lg px-4 py-1">
            {overallProgress}% Complete
          </Badge>
        </div>
        <Progress value={overallProgress} className="h-3 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {phaseConfig.map((config, index) => {
            const phase = phases.find((p) => p.phase_number === config.number);
            const status = phase ? getPhaseStatus(phase, index) : 'locked';
            const progress = phase ? calculateProgress(phase) : 0;

            return (
              <motion.div
                key={config.number}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative rounded-lg border p-4 transition-all ${
                  status === 'locked'
                    ? 'opacity-50 border-border'
                    : status === 'active'
                    ? 'border-primary shadow-lg shadow-primary/10'
                    : status === 'completed'
                    ? 'border-green-500/50'
                    : 'border-border'
                }`}
              >
                <div className={`absolute inset-0 rounded-lg bg-gradient-to-r ${config.color} opacity-50`} />
                
                <div className="relative flex items-center gap-4">
                  {/* Phase number and icon */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center text-lg font-bold ${
                        status === 'completed'
                          ? 'bg-green-500/20 text-green-500'
                          : status === 'active'
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {config.number}
                    </div>
                    <span className="text-2xl">{config.icon}</span>
                  </div>

                  {/* Phase info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">Phase {config.number}: {config.name}</h4>
                      {getStatusIcon(status)}
                      {status === 'active' && (
                        <Badge variant="default" className="ml-2">
                          In Progress
                        </Badge>
                      )}
                      {status === 'completed' && (
                        <Badge variant="outline" className="ml-2 border-green-500 text-green-500">
                          Completed
                        </Badge>
                      )}
                    </div>
                    
                    {phase && (
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          {phase.deliverables?.filter((d) => d.ceo_approved && d.user_approved).length || 0}/
                          {phase.deliverables?.length || 0} deliverables approved
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="w-24 text-right">
                    <span className="text-2xl font-bold">
                      {progress}%
                    </span>
                    <Progress value={progress} className="h-2 mt-1" />
                  </div>
                </div>

                {/* Locked overlay */}
                {status === 'locked' && (
                  <div className="absolute inset-0 rounded-lg bg-background/50 flex items-center justify-center">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Lock className="h-4 w-4" />
                      <span className="text-sm">Complete Phase {config.number - 1} first</span>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
