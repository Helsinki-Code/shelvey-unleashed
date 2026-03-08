import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AGENT_DEFINITIONS } from '@/types/agent';
import type { InterAgentMessage, AgentType } from '@/types/agent';

interface CommunicationStreamProps {
  messages: InterAgentMessage[];
  className?: string;
}

const getAgentIcon = (type: AgentType): string => {
  return AGENT_DEFINITIONS.find(d => d.type === type)?.icon || '🤖';
};

const getAgentName = (type: AgentType): string => {
  return AGENT_DEFINITIONS.find(d => d.type === type)?.name || type;
};

const TYPE_COLORS: Record<string, string> = {
  task_assignment: 'text-primary',
  completion_report: 'text-emerald-500',
  data_handoff: 'text-cyan-500',
  question: 'text-amber-500',
  status_update: 'text-muted-foreground',
  decision: 'text-purple-500',
  error_report: 'text-destructive',
};

export function CommunicationStream({ messages, className }: CommunicationStreamProps) {
  if (messages.length === 0) {
    return (
      <div className={cn("flex items-center justify-center py-12 text-muted-foreground text-sm", className)}>
        No agent communications yet. Start a session to see messages.
      </div>
    );
  }

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="space-y-1.5 p-2">
        {messages.map((msg) => (
          <div key={msg.id} className="flex items-start gap-2 text-sm p-2 rounded-lg hover:bg-secondary/50 transition-colors">
            <span className="text-base flex-shrink-0">{getAgentIcon(msg.fromAgent)}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-medium text-xs">{getAgentName(msg.fromAgent)}</span>
                <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                <span className="font-medium text-xs">{getAgentName(msg.toAgent)}</span>
                <Badge variant="outline" className={cn("text-[10px] ml-auto", TYPE_COLORS[msg.type])}>
                  {msg.type.replace(/_/g, ' ')}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{msg.content}</p>
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
