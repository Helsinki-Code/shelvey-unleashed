import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { WarRoomState } from '@/types/agent';

interface GlobalProgressProps {
  state: WarRoomState;
  className?: string;
}

export function GlobalProgress({ state, className }: GlobalProgressProps) {
  const mission = state.mission;
  const progress = mission?.totalProgress ?? 0;
  const activeCount = state.agents.filter(a => a.status === 'working').length;
  const completedPhases = state.phases.filter(p => p.status === 'completed').length;
  const pendingApprovals = state.approvals.filter(a => a.status === 'pending').length;
  const currentPhase = state.phases.find(p => p.status === 'running' || p.status === 'awaiting_approval');
  const elapsed = mission ? Math.round((Date.now() - mission.startTime) / 1000) : 0;
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  const healthColor = state.health.overallStatus === 'healthy'
    ? 'bg-emerald-500'
    : state.health.overallStatus === 'degraded'
    ? 'bg-amber-500'
    : 'bg-destructive';

  return (
    <div className={cn("flex items-center gap-4 p-3 border-b border-border bg-card/50", className)}>
      <div className="flex items-center gap-2 min-w-0">
        <div className={cn("w-2 h-2 rounded-full", mission?.status === 'running' ? "bg-emerald-500 animate-pulse" : mission?.status === 'completed' ? "bg-emerald-500" : "bg-muted-foreground/40")} />
        <span className="text-sm font-medium truncate">
          {currentPhase?.name || (mission?.status === 'completed' ? 'Completed' : 'Initializing')}
        </span>
      </div>

      <div className="flex-1 max-w-xs">
        <Progress value={progress} className="h-2" />
      </div>
      <span className="text-xs font-mono text-muted-foreground">{Math.round(progress)}%</span>

      <span className="text-xs font-mono text-muted-foreground">{mins}:{secs.toString().padStart(2, '0')}</span>

      <div className={cn("w-2 h-2 rounded-full", healthColor)} title={`Health: ${state.health.overallStatus}`} />

      <div className="flex items-center gap-3 text-xs">
        <Badge variant="secondary" className="gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          {activeCount} Active
        </Badge>
        <Badge variant="outline">{completedPhases}/{state.phases.length} Phases</Badge>
        {pendingApprovals > 0 && (
          <Badge variant="destructive" className="animate-pulse">
            {pendingApprovals} Approval{pendingApprovals > 1 ? 's' : ''}
          </Badge>
        )}
      </div>
    </div>
  );
}
