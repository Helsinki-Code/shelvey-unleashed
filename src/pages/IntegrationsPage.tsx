import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Server, Link2, Plug, Sparkles } from 'lucide-react';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { HelpTooltip, HELP_CONTENT } from '@/components/HelpTooltip';
import { FullMCPDashboard } from '@/components/FullMCPDashboard';
import ConnectorAuth from '@/components/ConnectorAuth';
import { useAuth } from '@/hooks/useAuth';

const IntegrationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, [user, authLoading, navigate]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Helmet>
        <title>Integrations | ShelVey</title>
        <meta name="description" content="Connect MCP servers and productivity tools to supercharge your AI agents" />
      </Helmet>

      <SidebarProvider>
        <div className="min-h-screen bg-background flex w-full">
          <DashboardSidebar />
          
          <main className="flex-1 p-6 overflow-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-7xl mx-auto space-y-8"
            >
              {/* Header */}
              <div className="space-y-2">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <Plug className="h-8 w-8 text-primary" />
                  Integrations
                  <HelpTooltip
                    title={HELP_CONTENT.mcp.title}
                    description={HELP_CONTENT.mcp.description}
                  />
                </h1>
                <p className="text-muted-foreground">
                  Connect external services to supercharge your AI agents with real-world capabilities
                </p>
              </div>

              {/* Main Content */}
              <Tabs defaultValue="mcp" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                  <TabsTrigger value="mcp" className="flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    MCP Network (52 Servers)
                  </TabsTrigger>
                  <TabsTrigger value="connectors" className="flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Productivity
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="mcp" className="space-y-6">
                  <FullMCPDashboard />
                </TabsContent>

                <TabsContent value="connectors" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Productivity Connectors</CardTitle>
                      <CardDescription>
                        Connect your Google Workspace and Microsoft 365 accounts to let AI agents access your emails, files, and calendar
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ConnectorAuth />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </motion.div>
          </main>
        </div>
      </SidebarProvider>
    </>
  );
};

export default IntegrationsPage;
