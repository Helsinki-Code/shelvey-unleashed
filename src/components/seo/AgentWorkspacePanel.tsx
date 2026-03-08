import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight, ChevronDown, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentState, AgentStatus } from '@/types/agent';

interface AgentWorkspacePanelProps {
  agent: AgentState;
  expanded: boolean;
  onToggle: () => void;
  onDeepDive: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  working: 'bg-primary animate-pulse',
  waiting_approval: 'bg-amber-500 animate-pulse',
  waiting_input: 'bg-amber-500 animate-pulse',
  completed: 'bg-emerald-500',
  error: 'bg-destructive',
  monitoring: 'bg-cyan-500 animate-pulse',
  paused: 'bg-muted-foreground',
  crashed: 'bg-destructive',
  idle: 'bg-muted-foreground/40',
};

const STATUS_LABELS: Record<string, string> = {
  working: 'Working',
  waiting_approval: 'Awaiting Approval',
  waiting_input: 'Awaiting Input',
  completed: 'Done',
  error: 'Error',
  monitoring: 'Monitoring',
  paused: 'Paused',
  crashed: 'Crashed',
  idle: 'Idle',
};

const LOG_COLORS: Record<string, string> = {
  info: 'text-muted-foreground',
  warn: 'text-amber-500',
  error: 'text-destructive',
  debug: 'text-muted-foreground/60',
  action: 'text-primary',
  decision: 'text-purple-500',
};

export function AgentWorkspacePanel({ agent, expanded, onToggle, onDeepDive }: AgentWorkspacePanelProps) {
  const isActive = agent.status === 'working' || agent.status === 'monitoring';
  const heartbeatAge = Date.now() - agent.lastHeartbeat;
  const heartbeatFresh = heartbeatAge < agent.heartbeatInterval * 3;

  return (
    <Card className={cn(
      "transition-all duration-200",
      agent.status === 'working' && "border-primary/30 shadow-md shadow-primary/5",
      agent.status === 'waiting_approval' && "border-amber-500/30",
      agent.status === 'completed' && "border-emerald-500/20",
      agent.status === 'error' && "border-destructive/30",
      agent.status === 'crashed' && "border-destructive/50",
    )}>
      <CardHeader className="py-3 px-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative">
              <span className="text-lg">{agent.icon}</span>
              {isActive && heartbeatFresh && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{agent.name}</span>
                <div className={cn("w-2 h-2 rounded-full flex-shrink-0", STATUS_COLORS[agent.status] || STATUS_COLORS.idle)} />
              </div>
              <p className="text-xs text-muted-foreground truncate">{agent.currentTask || agent.codename}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Badge variant="secondary" className="text-[10px]">{STATUS_LABELS[agent.status] || 'Idle'}</Badge>
            {agent.tasksCompleted > 0 && <Badge variant="outline" className="text-[10px]">{agent.tasksCompleted}✓</Badge>}
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
              {agent.logs.slice(-50).map((log, i) => (
                <div key={i} className={cn("text-xs font-mono py-0.5", LOG_COLORS[log.level] || LOG_COLORS.info)}>
                  <span className="text-muted-foreground/50">[{new Date(log.timestamp).toLocaleTimeString()}]</span> {log.message}
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
