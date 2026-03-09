import { cn } from '@/lib/utils';
import { Check, Clock, Loader2, AlertCircle, Lock, ArrowRight } from 'lucide-react';
import type { PhaseState } from '@/types/agent';
import { PhaseStatus } from '@/types/agent';

interface PhaseDAGViewProps {
  phases: PhaseState[];
}

const statusConfig: Record<PhaseStatus, { icon: typeof Check; color: string; bg: string }> = {
  [PhaseStatus.QUEUED]: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted/50' },
  [PhaseStatus.READY]: { icon: Clock, color: 'text-primary', bg: 'bg-primary/10' },
  [PhaseStatus.RUNNING]: { icon: Loader2, color: 'text-cyber-green', bg: 'bg-cyber-green/10' },
  [PhaseStatus.AWAITING_APPROVAL]: { icon: Lock, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  [PhaseStatus.APPROVED]: { icon: Check, color: 'text-primary', bg: 'bg-primary/10' },
  [PhaseStatus.COMPLETED]: { icon: Check, color: 'text-cyber-green', bg: 'bg-cyber-green/10' },
  [PhaseStatus.FAILED]: { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
  [PhaseStatus.SKIPPED]: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted/50' },
};

export function PhaseDAGView({ phases }: PhaseDAGViewProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto py-2">
      {phases.map((phase, index) => {
        const config = statusConfig[phase.status] || statusConfig[PhaseStatus.QUEUED];
        const Icon = config.icon;
        const isRunning = phase.status === PhaseStatus.RUNNING;
        const isAwaitingApproval = phase.status === PhaseStatus.AWAITING_APPROVAL;

        return (
          <div key={phase.id} className="flex items-center gap-2">
            {/* Phase Node */}
            <div
              className={cn(
                'relative flex flex-col items-center p-3 rounded-lg border transition-all min-w-[120px]',
                config.bg,
                isRunning && 'border-cyber-green ring-2 ring-cyber-green/30 shadow-lg shadow-cyber-green/20',
                isAwaitingApproval && 'border-orange-500 ring-2 ring-orange-500/30 animate-pulse',
                !isRunning && !isAwaitingApproval && 'border-border/50'
              )}
            >
              {/* Status Icon */}
              <div className={cn('p-1.5 rounded-full mb-1', config.bg)}>
                <Icon className={cn('h-4 w-4', config.color, isRunning && 'animate-spin')} />
              </div>

              {/* Phase Name */}
              <p className="text-xs font-medium text-center whitespace-nowrap">{phase.name}</p>

              {/* Progress */}
              {isRunning && (
                <div className="w-full h-1 bg-muted rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-cyber-green transition-all duration-300"
                    style={{ width: `${phase.progress}%` }}
                  />
                </div>
              )}

              {/* Duration */}
              <p className="text-[10px] text-muted-foreground mt-1">{phase.estimatedDuration}</p>
            </div>

            {/* Arrow Connector */}
            {index < phases.length - 1 && (
              <ArrowRight className={cn(
                'h-4 w-4 flex-shrink-0',
                phase.status === PhaseStatus.COMPLETED ? 'text-cyber-green' : 'text-muted-foreground/50'
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
