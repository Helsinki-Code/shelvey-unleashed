import { useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowRight, MessageSquare } from 'lucide-react';
import type { BusMessage } from '@/types/agent';
import { AGENT_DEFINITIONS, MessageType } from '@/types/agent';
import { cn } from '@/lib/utils';

interface CommunicationLogProps {
  messages: BusMessage[];
}

const typeColors: Record<string, string> = {
  [MessageType.TASK_ASSIGN]: 'bg-primary/20 text-primary',
  [MessageType.TASK_COMPLETE]: 'bg-cyber-green/20 text-cyber-green',
  [MessageType.DATA_HANDOFF]: 'bg-cyber-cyan/20 text-cyber-cyan',
  [MessageType.STATUS_UPDATE]: 'bg-muted text-muted-foreground',
  [MessageType.HEARTBEAT]: 'bg-muted/50 text-muted-foreground',
  [MessageType.APPROVAL_REQUEST]: 'bg-orange-500/20 text-orange-500',
  [MessageType.APPROVAL_RESPONSE]: 'bg-cyber-green/20 text-cyber-green',
  [MessageType.LOG_ENTRY]: 'bg-muted text-foreground',
  [MessageType.ERROR]: 'bg-destructive/20 text-destructive',
  [MessageType.INTERVENTION]: 'bg-cyber-purple/20 text-cyber-purple',
};

export function CommunicationLog({ messages }: CommunicationLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getAgentName = (id: string) => {
    if (id === 'system' || id === 'user') return id.toUpperCase();
    const agent = AGENT_DEFINITIONS.find(a => a.id === id);
    return agent?.codename || id;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">No communications yet</p>
        <p className="text-xs">Agent messages will appear here</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full pr-2" ref={scrollRef}>
      <div className="space-y-1.5 font-mono text-xs">
        {messages.slice(-100).map((msg, i) => (
          <div
            key={msg.id || i}
            className={cn(
              'flex items-start gap-2 p-1.5 rounded transition-colors',
              msg.type === MessageType.ERROR && 'bg-destructive/5',
              msg.type === MessageType.APPROVAL_REQUEST && 'bg-orange-500/5',
            )}
          >
            {/* Timestamp */}
            <span className="text-muted-foreground whitespace-nowrap">
              [{formatTime(msg.timestamp)}]
            </span>

            {/* Type Badge */}
            <Badge variant="outline" className={cn('text-[9px] px-1', typeColors[msg.type])}>
              {msg.type.replace('_', ' ').substring(0, 8)}
            </Badge>

            {/* From → To */}
            <span className="text-primary whitespace-nowrap">{getAgentName(msg.from)}</span>
            <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
            <span className="text-accent whitespace-nowrap">{getAgentName(msg.to)}</span>

            {/* Payload Summary */}
            <span className="text-foreground/70 truncate flex-1">
              {typeof msg.payload === 'string' 
                ? msg.payload 
                : msg.payload?.message || msg.payload?.action || JSON.stringify(msg.payload).substring(0, 60)}
            </span>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
