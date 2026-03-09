import { useState } from 'react';
import { useWarRoom } from '@/hooks/useWarRoom';
import { MissionControlBar } from './MissionControlBar';
import { AgentStatusGrid } from './AgentStatusGrid';
import { PhaseDAGView } from './PhaseDAGView';
import { ApprovalQueuePanel } from './ApprovalQueuePanel';
import { CommunicationLog } from './CommunicationLog';
import { MissionStartDialog } from './MissionStartDialog';
import { AgentDeepDive } from './AgentDeepDive';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Target, MessageSquare, CheckCircle, Activity } from 'lucide-react';
import type { AgentId } from '@/types/agent';

export function SEOWarRoom() {
  const { state, startMission, pauseMission, resumeMission, approveRequest, intervene, sessionId } = useWarRoom();
  const [showStartDialog, setShowStartDialog] = useState(!state.mission);
  const [selectedAgentId, setSelectedAgentId] = useState<AgentId | null>(null);

  const handleStartMission = (url: string, goals: string) => {
    startMission(url, goals);
    setShowStartDialog(false);
  };

  const selectedAgent = selectedAgentId ? state.agents.find(a => a.id === selectedAgentId) : null;

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Mission Control Bar */}
      <MissionControlBar
        mission={state.mission}
        health={state.health}
        connected={state.connected}
        onStart={() => setShowStartDialog(true)}
        onPause={pauseMission}
        onResume={resumeMission}
      />

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* Left Panel: Agents */}
        <div className="col-span-8 flex flex-col gap-4 min-h-0">
          {/* Phase DAG */}
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Workflow Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <PhaseDAGView phases={state.phases} />
            </CardContent>
          </Card>

          {/* Agent Grid + Deep Dive */}
          <div className="flex-1 min-h-0 grid grid-cols-3 gap-4">
            <div className="col-span-2 overflow-hidden">
              <Card className="h-full bg-card/50 backdrop-blur border-border/50">
                <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Agent Fleet
                    <Badge variant="outline" className="ml-2">
                      {state.agents.filter(a => a.status === 'working' || a.status === 'monitoring').length} Active
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 overflow-auto max-h-[400px]">
                  <AgentStatusGrid
                    agents={state.agents}
                    selectedAgentId={selectedAgentId}
                    onSelectAgent={setSelectedAgentId}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="col-span-1 overflow-hidden">
              <Card className="h-full bg-card/50 backdrop-blur border-border/50">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4 text-accent" />
                    Agent Deep Dive
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 overflow-auto max-h-[400px]">
                  {selectedAgent ? (
                    <AgentDeepDive 
                      agent={selectedAgent} 
                      onClose={() => setSelectedAgentId(null)}
                      onIntervene={(command) => intervene(command)} 
                      className="relative inset-auto z-auto bg-transparent backdrop-blur-none"
                    />
                  ) : (
                    <p className="text-muted-foreground text-sm">Select an agent to view details</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Right Panel: Approvals & Comms */}
        <div className="col-span-4 flex flex-col gap-4 min-h-0">
          {/* Approval Queue */}
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-cyber-green" />
                Approval Queue
                {state.approvals.length > 0 && (
                  <Badge variant="destructive" className="ml-2 animate-pulse">
                    {state.approvals.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 max-h-[200px] overflow-auto">
              <ApprovalQueuePanel
                approvals={state.approvals}
                onApprove={(id) => approveRequest(id, 'approve')}
                onReject={(id) => approveRequest(id, 'reject')}
                onModify={(id, input) => approveRequest(id, 'modify', input)}
              />
            </CardContent>
          </Card>

          {/* Communication Log */}
          <Card className="flex-1 min-h-0 bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-cyber-cyan" />
                Inter-Agent Communications
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 h-[calc(100%-60px)] overflow-hidden">
              <CommunicationLog messages={state.communications} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mission Start Dialog */}
      <MissionStartDialog
        open={showStartDialog}
        onOpenChange={setShowStartDialog}
        onStart={handleStartMission}
      />
    </div>
  );
}
