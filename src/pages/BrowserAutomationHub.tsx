import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SimpleDashboardSidebar } from "@/components/SimpleDashboardSidebar";
import { PageHeader } from "@/components/PageHeader";
import { BrowserMonitoringDashboard } from "@/components/browser/BrowserMonitoringDashboard";
import { SessionMonitor } from "@/components/browser/SessionMonitor";
import { PerformanceMonitor } from "@/components/browser/PerformanceMonitor";
import { ApprovalGatePanel } from "@/components/browser/ApprovalGatePanel";
import { CostDashboard } from "@/components/browser/CostDashboard";
import { AdaptiveRulesManager } from "@/components/browser/AdaptiveRulesManager";
import { ComplianceAuditViewer } from "@/components/browser/ComplianceAuditViewer";

const BrowserAutomationHub = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-background dark:bg-slate-950 flex">
      <SimpleDashboardSidebar />

      <main className="flex-1 ml-[260px] p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent dark:from-blue-400 dark:via-purple-400 dark:to-pink-400">
              🌐 Browser Automation Hub
            </h1>
            <p className="text-muted-foreground dark:text-slate-400">
              Multi-provider automation engine with real-time monitoring & compliance
            </p>
          </div>
          <PageHeader />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="costs">Costs</TabsTrigger>
            <TabsTrigger value="rules">Rules</TabsTrigger>
            <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <BrowserMonitoringDashboard />
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6">
            <SessionMonitor />
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <PerformanceMonitor />
          </TabsContent>

          <TabsContent value="approvals" className="space-y-6">
            <ApprovalGatePanel />
          </TabsContent>

          <TabsContent value="costs" className="space-y-6">
            <CostDashboard />
          </TabsContent>

          <TabsContent value="rules" className="space-y-6">
            <AdaptiveRulesManager />
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
            <ComplianceAuditViewer />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default BrowserAutomationHub;
