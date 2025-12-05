import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AgentTaskBoard } from '@/components/AgentTaskBoard';
import { TeamDashboard } from '@/components/TeamDashboard';
import { TeamCollaborationHub } from '@/components/TeamCollaborationHub';
import { FullMCPDashboard } from '@/components/FullMCPDashboard';
import { ProjectWorkflowManager } from '@/components/ProjectWorkflowManager';
import { EscalationTracker } from '@/components/EscalationTracker';
import { ProgressReportsPanel } from '@/components/ProgressReportsPanel';
import { FeatureGuide } from '@/components/FeatureGuide';
import { Button } from '@/components/ui/button';
import { 
  Zap, Users, Server, FolderKanban, HelpCircle, 
  MessageSquare, AlertTriangle, FileText 
} from 'lucide-react';

export default function WorkspacePage() {
  const [activeTab, setActiveTab] = useState('tasks');
  const [showGuide, setShowGuide] = useState(false);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Command Center</h1>
                <p className="text-muted-foreground">
                  Monitor your AI workforce in real-time
                </p>
              </div>
              <Button variant="outline" onClick={() => setShowGuide(true)}>
                <HelpCircle className="w-4 h-4 mr-2" />
                Feature Guide
              </Button>
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="bg-muted/50 p-1 h-auto flex-wrap gap-1">
                <TabsTrigger value="tasks" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Zap className="w-4 h-4" />
                  Live Tasks
                </TabsTrigger>
                <TabsTrigger value="teams" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Users className="w-4 h-4" />
                  Team Activity
                </TabsTrigger>
                <TabsTrigger value="collaboration" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <MessageSquare className="w-4 h-4" />
                  Collaboration
                </TabsTrigger>
                <TabsTrigger value="mcp" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Server className="w-4 h-4" />
                  MCP Network
                </TabsTrigger>
                <TabsTrigger value="workflow" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <FolderKanban className="w-4 h-4" />
                  Workflow
                </TabsTrigger>
              </TabsList>

              {/* Live Tasks Tab */}
              <TabsContent value="tasks" className="space-y-6">
                <div className="grid lg:grid-cols-2 gap-6">
                  <AgentTaskBoard />
                  <TeamDashboard />
                </div>
              </TabsContent>

              {/* Team Activity Tab */}
              <TabsContent value="teams" className="space-y-6">
                <TeamDashboard />
              </TabsContent>

              {/* Collaboration Tab */}
              <TabsContent value="collaboration">
                <TeamCollaborationHub />
              </TabsContent>

              {/* MCP Network Tab */}
              <TabsContent value="mcp">
                <FullMCPDashboard />
              </TabsContent>

              {/* Workflow Tab */}
              <TabsContent value="workflow">
                <ProjectWorkflowManager />
              </TabsContent>
            </Tabs>
          </div>
        </main>

        <FeatureGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
      </div>
    </SidebarProvider>
  );
}