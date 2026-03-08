import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getAgentDef, PhaseStatus } from '@/types/agent';
import type { PhaseState, LogEntry } from '@/types/agent';

interface OrchestratorPanelProps {
  phases: PhaseState[];
  decisions: LogEntry[];
  className?: string;
}

const getPhaseStyle = (status: PhaseStatus | string) => {
  switch (status) {
    case PhaseStatus.RUNNING: return 'border-primary bg-primary/10 text-primary';
    case PhaseStatus.COMPLETED: return 'border-emerald-500 bg-emerald-500/10 text-emerald-600';
    case PhaseStatus.AWAITING_APPROVAL: return 'border-amber-500 bg-amber-500/10 text-amber-600';
    case PhaseStatus.FAILED: return 'border-destructive bg-destructive/10 text-destructive';
    default: return 'border-border bg-secondary/50 text-muted-foreground';
  }
};

export function OrchestratorPanel({ phases, decisions, className }: OrchestratorPanelProps) {
  return (
    <div className={cn("flex gap-4 h-full", className)}>
      <div className="flex-1">
        <h3 className="text-sm font-medium mb-3">DAG Pipeline</h3>
        <div className="flex flex-wrap gap-2 items-center">
          {phases.map((phase, i) => {
            const agentDef = getAgentDef(phase.assignedAgent);
            return (
              <div key={phase.id} className="flex items-center gap-1">
                <div className={cn("px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 relative", getPhaseStyle(phase.status))}>
                  <span>{agentDef.icon}</span>
                  <span className="truncate max-w-[120px]">{phase.name}</span>
                  {phase.approvalRequired && phase.status !== 'completed' && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500" title="Approval gate" />
                  )}
                </div>
                {i < phases.length - 1 && (
                  <span className={cn("text-xs", phases[i + 1]?.dependencies.includes(phase.id) ? "text-primary" : "text-muted-foreground")}>→</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="w-72 border-l border-border pl-4">
        <h3 className="text-sm font-medium mb-3">Decisions</h3>
        <ScrollArea className="h-32">
          {decisions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No decisions yet.</p>
          ) : (
            <div className="space-y-2">
              {decisions.slice(-10).reverse().map((d, i) => (
                <div key={i} className="text-xs space-y-0.5">
                  <p className="font-medium">{d.message}</p>
                  <span className="text-muted-foreground/50">{new Date(d.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
