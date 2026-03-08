import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Send, Pause, Play, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AGENT_DEFINITIONS } from '@/types/agent';
import type { AgentTask } from '@/types/agent';

interface AgentDeepDiveProps {
  agent: AgentTask;
  onClose: () => void;
  className?: string;
}

export function AgentDeepDive({ agent, onClose, className }: AgentDeepDiveProps) {
  const def = AGENT_DEFINITIONS.find(d => d.type === agent.type);

  return (
    <div className={cn("fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{def?.icon || '🤖'}</span>
          <div>
            <h2 className="text-lg font-bold">{agent.name}</h2>
            <p className="text-sm text-muted-foreground">{def?.subtitle} — {def?.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={agent.status === 'working' ? 'default' : agent.status === 'completed' ? 'secondary' : 'outline'}>
            {agent.status}
          </Badge>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main logs */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-medium">Activity Log</h3>
            <p className="text-xs text-muted-foreground">Complete history of this agent's work during this session</p>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-1 font-mono text-xs">
              {agent.logs.map((log, i) => (
                <div key={i} className={cn(
                  "py-0.5",
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
                <div className="text-primary animate-pulse">▌</div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Sidebar info */}
        <div className="w-72 border-l border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-medium mb-2">Responsibilities</h3>
            <div className="space-y-1">
              {def?.responsibilities.map((r, i) => (
                <p key={i} className="text-xs text-muted-foreground">• {r}</p>
              ))}
            </div>
          </div>

          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-medium mb-2">Approval Gates</h3>
            {def?.approvalGates.length ? (
              <div className="space-y-1">
                {def.approvalGates.map((g, i) => (
                  <Badge key={i} variant="outline" className="text-xs mr-1">{g}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No manual approvals required</p>
            )}
          </div>

          <div className="p-4 space-y-2">
            <h3 className="text-sm font-medium mb-2">Intervention</h3>
            <Button variant="outline" size="sm" className="w-full gap-2" disabled={agent.status !== 'working'}>
              <Pause className="w-3 h-3" /> Pause Agent
            </Button>
            <Button variant="outline" size="sm" className="w-full gap-2" disabled={agent.status === 'working'}>
              <Play className="w-3 h-3" /> Resume Agent
            </Button>
            <Button variant="outline" size="sm" className="w-full gap-2">
              <RotateCcw className="w-3 h-3" /> Redo Work
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
