import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ChevronRight, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAgentDef, MessageType } from '@/types/agent';
import type { BusMessage, AgentId } from '@/types/agent';

interface CommunicationStreamProps {
  messages: BusMessage[];
  className?: string;
}

const TYPE_COLORS: Record<string, string> = {
  [MessageType.TASK_ASSIGN]: 'text-primary',
  [MessageType.TASK_COMPLETE]: 'text-emerald-500',
  [MessageType.DATA_HANDOFF]: 'text-cyan-500',
  [MessageType.STATUS_UPDATE]: 'text-muted-foreground',
  [MessageType.APPROVAL_REQUEST]: 'text-amber-500',
  [MessageType.APPROVAL_RESPONSE]: 'text-emerald-500',
  [MessageType.LOG_ENTRY]: 'text-muted-foreground',
  [MessageType.ERROR]: 'text-destructive',
  [MessageType.INTERVENTION]: 'text-purple-500',
  [MessageType.AGENT_CRASH]: 'text-destructive',
};

function getIcon(id: string): string {
  try { return getAgentDef(id as AgentId).icon; } catch { return '🤖'; }
}

function getName(id: string): string {
  if (id === 'system') return 'System';
  if (id === 'user') return 'Operator';
  if (id === 'broadcast') return 'All';
  try { return getAgentDef(id as AgentId).name; } catch { return id; }
}

export function CommunicationStream({ messages, className }: CommunicationStreamProps) {
  const [filter, setFilter] = useState('');

  const filtered = filter
    ? messages.filter(m => getName(m.from as string).toLowerCase().includes(filter.toLowerCase()) || getName(m.to as string).toLowerCase().includes(filter.toLowerCase()) || m.type.includes(filter.toLowerCase()))
    : messages;

  if (messages.length === 0) {
    return (
      <div className={cn("flex items-center justify-center py-12 text-muted-foreground text-sm", className)}>
        No agent communications yet.
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="px-2 pb-2">
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by agent or type..."
          className="h-8 text-xs"
        />
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-1.5 p-2">
          {filtered.slice(-100).map((msg) => (
            <div key={msg.id} className="flex items-start gap-2 text-sm p-2 rounded-lg hover:bg-secondary/50 transition-colors">
              <span className="text-base flex-shrink-0">{getIcon(msg.from as string)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-medium text-xs">{getName(msg.from as string)}</span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium text-xs">{getName(msg.to as string)}</span>
                  <Badge variant="outline" className={cn("text-[10px] ml-auto", TYPE_COLORS[msg.type] || 'text-muted-foreground')}>
                    {msg.type.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {typeof msg.payload === 'string' ? msg.payload : msg.payload?.description || msg.payload?.message || JSON.stringify(msg.payload).slice(0, 100)}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
