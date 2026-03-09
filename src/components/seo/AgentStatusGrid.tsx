import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { AgentState, AgentId } from '@/types/agent';

interface AgentStatusGridProps {
  agents: AgentState[];
  selectedAgentId: AgentId | null;
  onSelectAgent: (id: AgentId) => void;
}

const statusColors: Record<string, string> = {
  idle: 'bg-muted-foreground/30',
  working: 'bg-cyber-green animate-pulse',
  waiting_input: 'bg-yellow-500',
  waiting_approval: 'bg-orange-500 animate-pulse',
  completed: 'bg-primary',
  error: 'bg-destructive',
  monitoring: 'bg-cyber-cyan animate-pulse',
  paused: 'bg-yellow-500',
  crashed: 'bg-destructive animate-pulse',
};

const statusLabels: Record<string, string> = {
  idle: 'IDLE',
  working: 'WORKING',
  waiting_input: 'WAITING',
  waiting_approval: 'APPROVAL',
  completed: 'DONE',
  error: 'ERROR',
  monitoring: 'MONITOR',
  paused: 'PAUSED',
  crashed: 'CRASHED',
};

export function AgentStatusGrid({ agents, selectedAgentId, onSelectAgent }: AgentStatusGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {agents.map((agent) => (
        <button
          key={agent.id}
          onClick={() => onSelectAgent(agent.id)}
          className={cn(
            'relative p-3 rounded-lg border text-left transition-all duration-200',
            'hover:border-primary/50 hover:bg-accent/10',
            selectedAgentId === agent.id
              ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
              : 'border-border/50 bg-card/30'
          )}
        >
          {/* Status Indicator */}
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <div className={cn('w-2 h-2 rounded-full', statusColors[agent.status])} />
          </div>

          {/* Agent Info */}
          <div className="flex items-start gap-2 mb-2">
            <span className="text-xl">{agent.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{agent.name}</p>
              <p className="text-[10px] text-muted-foreground font-mono">{agent.codename}</p>
            </div>
          </div>

          {/* Status Badge */}
          <Badge variant="outline" className="text-[10px] mb-2">
            {statusLabels[agent.status]}
          </Badge>

          {/* Progress */}
          {(agent.status === 'working' || agent.status === 'monitoring') && (
            <div className="space-y-1">
              <Progress value={agent.progress} className="h-1" />
              <p className="text-[10px] text-muted-foreground truncate">
                {agent.currentTask || 'Processing...'}
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
            <span>♥ {Math.round((Date.now() - agent.lastHeartbeat) / 1000)}s</span>
            <span>✓ {agent.tasksCompleted}</span>
            {agent.tasksErrored > 0 && <span className="text-destructive">✗ {agent.tasksErrored}</span>}
          </div>
        </button>
      ))}
    </div>
  );
}
