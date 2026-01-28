import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  LineChart,
  Brain,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { ExchangeWebMonitor } from "@/components/trading/ExchangeWebMonitor";
import { TradingJournalViewer } from "@/components/trading/TradingJournalViewer";
import { MarketDataScraper } from "@/components/trading/MarketDataScraper";
import { AutoRebalanceConfig } from "@/components/trading/AutoRebalanceConfig";
import { BrowserAutomationPanel } from "@/components/trading/BrowserAutomationPanel";

const TradingDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMetrics();
      const interval = setInterval(fetchMetrics, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchMetrics = async () => {
    try {
      setRefreshing(true);
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) return;

      const response = await supabase.functions.invoke("browser-monitoring", {
        body: { action: "get_metrics" },
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (response.data) {
        setMetrics(response.data);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching metrics:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const statsData = [
    {
      label: "System Health",
      value: `${metrics?.successRate || 0}%`,
      icon: Activity,
      color: metrics?.successRate > 90 ? "text-green-500" : "text-yellow-500",
      bgColor:
        metrics?.successRate > 90
          ? "bg-green-500/10"
          : "bg-yellow-500/10",
    },
    {
      label: "Avg Latency",
      value: `${metrics?.avgLatency || 0}ms`,
      icon: Zap,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Active Sessions",
      value: `${metrics?.activeSessions || 0}`,
      icon: Brain,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Monthly Cost",
      value: `$${metrics?.monthlyCost || 0}`,
      icon: TrendingUp,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
  ];

  return (
    <div className="min-h-screen bg-background dark:bg-slate-950 flex">
      <SimpleDashboardSidebar />

      <main className="flex-1 ml-[260px]">
        {/* Header Section */}
        <div className="border-b border-border/50 bg-gradient-to-r from-blue-500/5 to-purple-500/5 dark:from-blue-500/10 dark:to-purple-500/10">
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                  📊 Trading AI Dashboard
                </h1>
                <p className="text-muted-foreground mt-2">
                  Multi-exchange automation with AI-powered strategies
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
            <div className="flex items-center justify-between">
              <TabsList className="bg-background border border-border">
                <TabsTrigger value="overview" className="gap-2">
                  <LineChart className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="portfolio" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Portfolio
                </TabsTrigger>
                <TabsTrigger value="market" className="gap-2">
                  <Activity className="h-4 w-4" />
                  Market Data
                </TabsTrigger>
                <TabsTrigger value="journal" className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Journal
                </TabsTrigger>
                <TabsTrigger value="automation" className="gap-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                  <Zap className="h-4 w-4" />
                  Automation
                </TabsTrigger>
              </TabsList>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchMetrics}
                disabled={refreshing}
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
                  <ExchangeWebMonitor />
                </div>
                <div>
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="text-base">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600">
                        Buy
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                      >
                        Sell
                      </Button>
                      <Button variant="outline" className="w-full">
                        Rebalance
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Portfolio Tab */}
            <TabsContent value="portfolio" className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <ExchangeWebMonitor />
                <AutoRebalanceConfig />
              </div>
            </TabsContent>

            {/* Market Data Tab */}
            <TabsContent value="market" className="space-y-6">
              <MarketDataScraper />
            </TabsContent>

            {/* Journal Tab */}
            <TabsContent value="journal" className="space-y-6">
              <TradingJournalViewer />
            </TabsContent>

            {/* Automation Tab */}
            <TabsContent value="automation" className="space-y-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <BrowserAutomationPanel />
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default TradingDashboardPage;
