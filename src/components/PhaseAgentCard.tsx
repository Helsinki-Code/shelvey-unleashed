import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Zap } from 'lucide-react';
import { PhaseAgent, getPhaseAgent } from '@/lib/phase-agents';

interface PhaseAgentCardProps {
  phaseNumber: number;
  status?: 'idle' | 'working' | 'completed';
  currentTask?: string;
  onChat?: () => void;
}

export function PhaseAgentCard({ phaseNumber, status = 'idle', currentTask, onChat }: PhaseAgentCardProps) {
  const agent = getPhaseAgent(phaseNumber);
  
  if (!agent) return null;
  
  const Icon = agent.icon;
  
  const statusColors = {
    idle: 'bg-muted-foreground',
    working: 'bg-green-500 animate-pulse',
    completed: 'bg-blue-500',
  };
  
  const statusText = {
    idle: 'Standby',
    working: 'Working',
    completed: 'Completed',
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {agent.name}
                <Badge variant="secondary" className="text-xs">
                  Phase {phaseNumber}
                </Badge>
              </CardTitle>
              <CardDescription>{agent.role}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${statusColors[status]}`} />
            <span className="text-xs font-medium">{statusText[status]}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{agent.description}</p>

        {currentTask && status === 'working' && (
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-xs font-medium text-primary mb-1 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Currently Working On
            </p>
            <p className="text-sm">{currentTask}</p>
          </div>
        )}

        {/* Capabilities Preview */}
        <div className="flex flex-wrap gap-1">
          {agent.capabilities.slice(0, 4).map((cap) => (
            <Badge key={cap} variant="outline" className="text-xs">
              {cap}
            </Badge>
          ))}
          {agent.capabilities.length > 4 && (
            <Badge variant="outline" className="text-xs">
              +{agent.capabilities.length - 4} more
            </Badge>
          )}
        </div>

        {onChat && (
          <Button onClick={onChat} className="w-full gap-2">
            <MessageSquare className="w-4 h-4" />
            Chat with {agent.name}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
