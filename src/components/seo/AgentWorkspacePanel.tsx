import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight, ChevronDown, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AGENT_DEFINITIONS } from '@/types/agent';
import type { AgentTask, AgentStatus } from '@/types/agent';

interface AgentWorkspacePanelProps {
  agent: AgentTask;
  expanded: boolean;
  onToggle: () => void;
  onDeepDive: () => void;
}

const getStatusColor = (status: AgentStatus): string => {
  switch (status) {
    case 'working': return 'bg-primary animate-pulse';
    case 'waiting': return 'bg-amber-500 animate-pulse';
    case 'completed': return 'bg-emerald-500';
    case 'error': return 'bg-destructive';
    default: return 'bg-muted-foreground/40';
  }
};

const getStatusLabel = (status: AgentStatus): string => {
  switch (status) {
    case 'working': return 'Working';
    case 'waiting': return 'Awaiting Approval';
    case 'completed': return 'Done';
    case 'error': return 'Error';
    default: return 'Idle';
  }
};

export function AgentWorkspacePanel({ agent, expanded, onToggle, onDeepDive }: AgentWorkspacePanelProps) {
  const def = AGENT_DEFINITIONS.find(d => d.type === agent.type);

  return (
    <Card className={cn(
      "transition-all duration-200",
      agent.status === 'working' && "border-primary/30 shadow-md shadow-primary/5",
      agent.status === 'waiting' && "border-amber-500/30",
      agent.status === 'completed' && "border-emerald-500/20",
      agent.status === 'error' && "border-destructive/30",
    )}>
      <CardHeader className="py-3 px-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-lg">{def?.icon || '🤖'}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{agent.name}</span>
                <div className={cn("w-2 h-2 rounded-full flex-shrink-0", getStatusColor(agent.status))} />
              </div>
              <p className="text-xs text-muted-foreground truncate">{agent.message}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Badge variant="secondary" className="text-[10px]">{getStatusLabel(agent.status)}</Badge>
            {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>
        {(agent.status === 'working' || agent.progress > 0) && (
          <Progress value={agent.progress} className="h-1 mt-2" />
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 px-4 pb-3 border-t border-border/50">
          <ScrollArea className="h-40">
            <div className="space-y-0.5">
              {agent.logs.map((log, i) => (
                <div key={i} className={cn(
                  "text-xs font-mono py-0.5",
                  log.level === 'success' && 'text-emerald-500',
                  log.level === 'error' && 'text-destructive',
                  log.level === 'warning' && 'text-amber-500',
                  log.level === 'data' && 'text-primary',
                  log.level === 'info' && 'text-muted-foreground',
                )}>
                  <span className="text-muted-foreground/50">[{new Date(log.timestamp).toLocaleTimeString()}]</span> {log.text}
                </div>
              ))}
              {agent.status === 'working' && (
                <div className="text-xs text-primary font-mono animate-pulse py-0.5">▌</div>
              )}
            </div>
          </ScrollArea>
          <div className="flex justify-end mt-2">
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDeepDive(); }} className="text-xs gap-1">
              <Eye className="w-3 h-3" /> Deep Dive
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
