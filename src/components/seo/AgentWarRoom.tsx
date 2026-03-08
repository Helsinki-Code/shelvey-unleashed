import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Users, MessageSquare, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlobalProgress } from './GlobalProgress';
import { AgentWorkspacePanel } from './AgentWorkspacePanel';
import { ApprovalQueue } from './ApprovalQueue';
import { CommunicationStream } from './CommunicationStream';
import { OrchestratorPanel } from './OrchestratorPanel';
import { AgentDeepDive } from './AgentDeepDive';
import { ExportPanel } from './ExportPanel';
import type { WarRoomState, AgentState, InterventionCommand } from '@/types/agent';

interface AgentWarRoomProps {
  state: WarRoomState;
  onApprove: (id: string, optionId: string, userInput?: string) => void;
  onIntervene?: (command: InterventionCommand) => void;
  onExport?: (format: string) => Promise<any>;
  className?: string;
}

export function AgentWarRoom({ state, onApprove, onIntervene, onExport, className }: AgentWarRoomProps) {
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set(['orchestrator', 'crawler']));
  const [deepDiveAgent, setDeepDiveAgent] = useState<AgentState | null>(null);
  const [activeTab, setActiveTab] = useState('agents');

  const decisions = useMemo(() =>
    state.agents.flatMap(a => a.logs.filter(l => l.level === 'decision' || l.level === 'action')).sort((a, b) => b.timestamp - a.timestamp),
    [state.agents]
  );

  const toggleAgent = (id: string) => {
    setExpandedAgents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const activeAgents = state.agents.filter(a => a.status !== 'idle');
  const idleAgents = state.agents.filter(a => a.status === 'idle');

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <GlobalProgress state={state} />

      {deepDiveAgent && (
        <AgentDeepDive
          agent={deepDiveAgent}
          onClose={() => setDeepDiveAgent(null)}
          onIntervene={onIntervene}
        />
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border bg-card/30">
            <OrchestratorPanel phases={state.phases} decisions={decisions} />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 pt-3">
              <TabsList className="bg-background border border-border">
                <TabsTrigger value="agents" className="gap-1.5"><Users className="w-3.5 h-3.5" />Agents ({activeAgents.length})</TabsTrigger>
                <TabsTrigger value="comms" className="gap-1.5"><MessageSquare className="w-3.5 h-3.5" />Comms ({state.communications.length})</TabsTrigger>
                <TabsTrigger value="export" className="gap-1.5"><Download className="w-3.5 h-3.5" />Export</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="agents" className="flex-1 overflow-auto p-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                {activeAgents.map(agent => (
                  <AgentWorkspacePanel key={agent.id} agent={agent} expanded={expandedAgents.has(agent.id)} onToggle={() => toggleAgent(agent.id)} onDeepDive={() => setDeepDiveAgent(agent)} />
                ))}
                {idleAgents.map(agent => (
                  <AgentWorkspacePanel key={agent.id} agent={agent} expanded={expandedAgents.has(agent.id)} onToggle={() => toggleAgent(agent.id)} onDeepDive={() => setDeepDiveAgent(agent)} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="comms" className="flex-1 overflow-hidden p-4">
              <CommunicationStream messages={state.communications} className="h-full" />
            </TabsContent>

            <TabsContent value="export" className="flex-1 overflow-auto p-4">
              <div className="max-w-lg">
                <ExportPanel state={state} onExport={onExport} />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="w-72 border-l border-border flex flex-col bg-card/30">
          <div className="p-3 border-b border-border">
            <h3 className="text-sm font-medium flex items-center gap-2">
              Approvals
              {state.approvals.length > 0 && (
                <Badge variant="destructive" className="text-xs">{state.approvals.length}</Badge>
              )}
            </h3>
          </div>
          <ScrollArea className="flex-1 p-3">
            <ApprovalQueue approvals={state.approvals} onApprove={onApprove} />
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
