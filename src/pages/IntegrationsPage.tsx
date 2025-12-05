import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Server, Link2, Plug, Sparkles, HelpCircle } from 'lucide-react';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { HelpTooltip, HELP_CONTENT } from '@/components/HelpTooltip';
import MCPBrowser from '@/components/MCPBrowser';
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

      <div className="min-h-screen bg-background flex">
        <DashboardSidebar />
        
        <main className="flex-1 ml-[260px] p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto space-y-8"
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

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Server className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">MCP Servers</p>
                      <p className="text-xs text-muted-foreground">
                        100+ integrations via OpenAI Native MCP
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <Link2 className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Built-in Connectors</p>
                      <p className="text-xs text-muted-foreground">
                        Gmail, Drive, Calendar, Teams & more
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 border-purple-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">AI-Powered</p>
                      <p className="text-xs text-muted-foreground">
                        Agents auto-select optimal integrations
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="connectors" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                <TabsTrigger value="connectors" className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Productivity Connectors
                </TabsTrigger>
                <TabsTrigger value="mcp" className="flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  MCP Browser
                </TabsTrigger>
              </TabsList>

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

              <TabsContent value="mcp" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>MCP Server Browser</CardTitle>
                    <CardDescription>
                      Browse and test available MCP servers. Your agents can dynamically connect to any of these integrations.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MCPBrowser />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </main>
      </div>
    </>
  );
};

export default IntegrationsPage;
