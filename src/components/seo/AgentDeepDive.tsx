import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Pause, Play, RotateCcw, Send, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentState, AgentId, InterventionCommand } from '@/types/agent';

interface AgentDeepDiveProps {
  agent: AgentState;
  onClose: () => void;
  onIntervene?: (command: InterventionCommand) => void;
  className?: string;
}

const LOG_COLORS: Record<string, string> = {
  info: 'text-muted-foreground',
  warn: 'text-amber-500',
  error: 'text-destructive',
  debug: 'text-muted-foreground/60',
  action: 'text-primary',
  decision: 'text-purple-500',
};

export function AgentDeepDive({ agent, onClose, onIntervene, className }: AgentDeepDiveProps) {
  const [instruction, setInstruction] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filteredLogs = agent.logs.filter(log => {
    if (levelFilter !== 'all' && log.level !== levelFilter) return false;
    if (search && !log.message.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const sendIntervention = (type: InterventionCommand['type'], message?: string) => {
    onIntervene?.({
      type,
      targetAgent: agent.id,
      message,
      timestamp: Date.now(),
    });
  };

  return (
    <div className={cn("fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col", className)}>
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{agent.icon}</span>
          <div>
            <h2 className="text-lg font-bold">{agent.name}</h2>
            <p className="text-sm text-muted-foreground">{agent.codename} — Tasks: {agent.tasksCompleted}✓ {agent.tasksErrored}✗</p>
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
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-border flex items-center gap-3">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search logs..." className="h-8 text-xs max-w-xs" />
            <div className="flex gap-1">
              {['all', 'info', 'warn', 'error', 'action', 'decision'].map(level => (
                <Button key={level} size="sm" variant={levelFilter === level ? 'default' : 'ghost'} onClick={() => setLevelFilter(level)} className="text-xs h-7 px-2">
                  {level}
                </Button>
              ))}
            </div>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-1 font-mono text-xs">
              {filteredLogs.map((log, i) => (
                <div key={i} className={cn("py-0.5", LOG_COLORS[log.level] || LOG_COLORS.info)}>
                  <span className="text-muted-foreground/50">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  {' '}
                  <span className="text-muted-foreground/60">[{log.level}]</span>
                  {' '}{log.message}
                </div>
              ))}
              {agent.status === 'working' && (
                <div className="text-primary animate-pulse">▌</div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="w-72 border-l border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-medium mb-2">Agent Report</h3>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Tasks Completed: {agent.tasksCompleted}</p>
              <p>Tasks Errored: {agent.tasksErrored}</p>
              <p>Log Entries: {agent.logs.length}</p>
              <p>Data Produced: {Object.entries(agent.dataProduced).map(([k, v]) => `${k}: ${v}`).join(', ') || 'None'}</p>
            </div>
          </div>

          <div className="p-4 border-b border-border space-y-2">
            <h3 className="text-sm font-medium mb-2">Intervention</h3>
            <Button variant="outline" size="sm" className="w-full gap-2" disabled={agent.status !== 'working'} onClick={() => sendIntervention('pause')}>
              <Pause className="w-3 h-3" /> Pause
            </Button>
            <Button variant="outline" size="sm" className="w-full gap-2" disabled={agent.status === 'working'} onClick={() => sendIntervention('resume')}>
              <Play className="w-3 h-3" /> Resume
            </Button>
            <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => sendIntervention('redo')}>
              <RotateCcw className="w-3 h-3" /> Redo
            </Button>
          </div>

          <div className="p-4 space-y-2">
            <h3 className="text-sm font-medium">Instruct Agent</h3>
            <Textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Enter instruction..."
              className="min-h-[60px] text-xs"
            />
            <Button size="sm" className="w-full gap-2" disabled={!instruction.trim()} onClick={() => { sendIntervention('instruct', instruction); setInstruction(''); }}>
              <Send className="w-3 h-3" /> Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
