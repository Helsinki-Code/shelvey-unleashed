import { cn } from '@/lib/utils';
import type { OrchestratorDecision, WorkflowStep } from '@/types/agent';
import { AGENT_DEFINITIONS } from '@/types/agent';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface OrchestratorPanelProps {
  workflow: WorkflowStep[];
  decisions: OrchestratorDecision[];
  className?: string;
}

const getStepStatusStyle = (status: string) => {
  switch (status) {
    case 'working': return 'border-primary bg-primary/10 text-primary';
    case 'completed': return 'border-emerald-500 bg-emerald-500/10 text-emerald-600';
    case 'waiting': return 'border-amber-500 bg-amber-500/10 text-amber-600';
    case 'error': return 'border-destructive bg-destructive/10 text-destructive';
    default: return 'border-border bg-secondary/50 text-muted-foreground';
  }
};

export function OrchestratorPanel({ workflow, decisions, className }: OrchestratorPanelProps) {
  return (
    <div className={cn("flex gap-4 h-full", className)}>
      {/* Workflow Pipeline */}
      <div className="flex-1">
        <h3 className="text-sm font-medium mb-3">Workflow Pipeline</h3>
        <div className="flex flex-wrap gap-2">
          {workflow.map((step, i) => {
            const agentDef = AGENT_DEFINITIONS.find(d => d.type === step.assignedAgent);
            return (
              <div key={step.id} className="flex items-center gap-1">
                <div className={cn("px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5", getStepStatusStyle(step.status))}>
                  <span>{agentDef?.icon || '🤖'}</span>
                  <span className="truncate max-w-[120px]">{step.name}</span>
                </div>
                {i < workflow.length - 1 && <span className="text-muted-foreground text-xs">→</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Decisions Log */}
      <div className="w-72 border-l border-border pl-4">
        <h3 className="text-sm font-medium mb-3">Decisions</h3>
        <ScrollArea className="h-32">
          {decisions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No decisions yet.</p>
          ) : (
            <div className="space-y-2">
              {decisions.slice(-10).reverse().map((d) => (
                <div key={d.id} className="text-xs space-y-0.5">
                  <p className="font-medium">{d.description}</p>
                  <p className="text-muted-foreground">{d.reasoning}</p>
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
