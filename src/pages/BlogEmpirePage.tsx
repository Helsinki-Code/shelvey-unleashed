import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { SimpleDashboardSidebar } from "@/components/SimpleDashboardSidebar";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText,
  TrendingUp,
  Share2,
  Search,
  DollarSign,
  BarChart3,
  RefreshCw,
  Plus,
  Zap,
  Eye,
  MessageSquare,
  Link2,
  AlertCircle,
  Activity,
} from "lucide-react";
import { BrowserPublishingPanel } from "@/components/blog/BrowserPublishingPanel";
import { AnalyticsDashboard } from "@/components/blog/AnalyticsDashboard";
import { BacklinkMonitor } from "@/components/blog/BacklinkMonitor";
import { SocialDistributionManager } from "@/components/blog/SocialDistributionManager";
import { SEOMonitorDashboard } from "@/components/blog/SEOMonitorDashboard";
import { CommentModerationPanel } from "@/components/blog/CommentModerationPanel";
import { CompetitorAnalysisPanel } from "@/components/blog/CompetitorAnalysisPanel";

const BlogEmpirePage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [metrics, setMetrics] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMetrics();
      const interval = setInterval(fetchMetrics, 15000); // Refresh every 15 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchMetrics = async () => {
    try {
      setRefreshing(true);
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) return;

      const response = await supabase.functions.invoke("blog-publishing-executor", {
        body: { action: "get_analytics" },
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (response.data) {
        setMetrics(response.data.summary);
      }
    } catch (error) {
      console.error("Error fetching metrics:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const statsData = [
    {
      label: "Total Pageviews",
      value: (metrics?.totalPageviews || 0).toLocaleString(),
      icon: Eye,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Sessions",
      value: (metrics?.totalSessions || 0).toLocaleString(),
      icon: Activity,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Bounce Rate",
      value: `${metrics?.avgBounceRate || 0}%`,
      icon: TrendingUp,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Active Users",
      value: (metrics?.totalUsers || 0).toLocaleString(),
      icon: BarChart3,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  return (
    <div className="min-h-screen bg-background dark:bg-slate-950 flex">
      <SimpleDashboardSidebar />

      <main className="flex-1 ml-[260px]">
        {/* Header Section */}
        <div className="border-b border-border/50 bg-gradient-to-r from-orange-500/5 to-amber-500/5 dark:from-orange-500/10 dark:to-amber-500/10">
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 dark:from-orange-400 dark:to-amber-400 bg-clip-text text-transparent">
                  🌐 Blog Empire Dashboard
                </h1>
                <p className="text-muted-foreground mt-2">
                  AI-powered content publishing & monetization engine
                </p>
              </div>
              <PageHeader />
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {statsData.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card className="border-border/30 hover:border-border/80 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              {stat.label}
                            </p>
                            <p className="text-2xl font-bold">{stat.value}</p>
                          </div>
                          <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                            <Icon className={`h-5 w-5 ${stat.color}`} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex items-center justify-between overflow-x-auto">
              <TabsList className="bg-background border border-border">
                <TabsTrigger value="overview" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="publishing" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Publishing
                </TabsTrigger>
                <TabsTrigger value="analytics" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="seo" className="gap-2">
                  <Search className="h-4 w-4" />
                  SEO & Rankings
                </TabsTrigger>
                <TabsTrigger value="social" className="gap-2">
                  <Share2 className="h-4 w-4" />
                  Social
                </TabsTrigger>
                <TabsTrigger value="backlinks" className="gap-2">
                  <Link2 className="h-4 w-4" />
                  Backlinks
                </TabsTrigger>
                <TabsTrigger value="moderation" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comments
                </TabsTrigger>
                <TabsTrigger value="automation" className="gap-2 bg-gradient-to-r from-orange-500/10 to-amber-500/10">
                  <Zap className="h-4 w-4" />
                  Automation
                </TabsTrigger>
              </TabsList>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchMetrics}
                disabled={refreshing}
                className="ml-4 flex-shrink-0"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <AnalyticsDashboard />
                </div>
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
                        <Plus className="h-4 w-4 mr-2" />
                        New Blog Post
                      </Button>
                      <Button variant="outline" className="w-full">
                        Schedule Post
                      </Button>
                      <Button variant="outline" className="w-full">
                        View Analytics
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base text-sm">
                        Content Pipeline
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between items-center p-2 rounded bg-muted">
                        <span>Drafts</span>
                        <Badge>3</Badge>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded bg-muted">
                        <span>Scheduled</span>
                        <Badge className="bg-blue-500">5</Badge>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded bg-muted">
                        <span>Published</span>
                        <Badge className="bg-green-500">42</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Publishing Tab */}
            <TabsContent value="publishing" className="space-y-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <BrowserPublishingPanel />
              </motion.div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <AnalyticsDashboard />
            </TabsContent>

            {/* SEO Tab */}
            <TabsContent value="seo" className="space-y-6">
              <SEOMonitorDashboard />
            </TabsContent>

            {/* Social Tab */}
            <TabsContent value="social" className="space-y-6">
              <SocialDistributionManager />
            </TabsContent>

            {/* Backlinks Tab */}
            <TabsContent value="backlinks" className="space-y-6">
              <BacklinkMonitor />
            </TabsContent>

            {/* Moderation Tab */}
            <TabsContent value="moderation" className="space-y-6">
              <CommentModerationPanel />
            </TabsContent>

            {/* Automation Tab */}
            <TabsContent value="automation" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Browser Automation Suite</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    AI-powered automation for content management & distribution
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg hover:border-orange-500/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3 mb-2">
                        <Zap className="h-5 w-5 text-orange-500" />
                        <span className="font-medium">Auto-Publish</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Automatically publish to WordPress, Medium, LinkedIn
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg hover:border-orange-500/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3 mb-2">
                        <Share2 className="h-5 w-5 text-orange-500" />
                        <span className="font-medium">Auto-Share</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Distribute to Twitter, Facebook, Instagram
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg hover:border-orange-500/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3 mb-2">
                        <Search className="h-5 w-5 text-orange-500" />
                        <span className="font-medium">SEO Optimization</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Auto-optimize content for search engines
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg hover:border-orange-500/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3 mb-2">
                        <MessageSquare className="h-5 w-5 text-orange-500" />
                        <span className="font-medium">Comment Moderation</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        AI-powered comment filtering & responses
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-3">Active Automations</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 rounded bg-muted text-sm">
                        <span>Daily Publishing Schedule</span>
                        <Badge className="bg-green-500">Active</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-muted text-sm">
                        <span>Social Media Distribution</span>
                        <Badge className="bg-green-500">Active</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-muted text-sm">
                        <span>SEO Monitoring</span>
                        <Badge className="bg-green-500">Active</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default BlogEmpirePage;
