import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { SimpleDashboardSidebar } from "@/components/SimpleDashboardSidebar";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  Plus,
  Play,
  Settings,
  Trash2,
  DollarSign,
  Shield,
  Target,
} from "lucide-react";
import { ExchangeWebMonitor } from "@/components/trading/ExchangeWebMonitor";
import { TradingJournalViewer } from "@/components/trading/TradingJournalViewer";
import { MarketDataScraper } from "@/components/trading/MarketDataScraper";
import { AutoRebalanceConfig } from "@/components/trading/AutoRebalanceConfig";
import { BrowserAutomationPanel } from "@/components/trading/BrowserAutomationPanel";
import { RealTimeAgentExecutor } from "@/components/trading/RealTimeAgentExecutor";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TradingProject {
  id: string;
  name: string;
  exchange: string;
  mode: string;
  status: string;
  capital: number;
  total_pnl: number;
  risk_level: string;
  current_phase: number;
  created_at: string;
  autonomous_mode?: boolean;
  last_sync_at?: string;
}

const TradingDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("projects");
  const [tradingProjects, setTradingProjects] = useState<TradingProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<TradingProject | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    exchange: "alpaca",
    mode: "paper",
    capital: "10000",
    risk_level: "moderate",
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTradingProjects();
      fetchMetrics();
      
      // Real-time subscription for trading projects
      const channel = supabase
        .channel('trading-projects-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'trading_projects',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchTradingProjects();
          }
        )
        .subscribe();

      const interval = setInterval(fetchMetrics, 10000);
      return () => {
        clearInterval(interval);
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchTradingProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('trading_projects')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTradingProjects(data || []);
      if (data && data.length > 0 && !selectedProject) {
        setSelectedProject(data[0]);
      }
    } catch (error) {
      console.error("Error fetching trading projects:", error);
    } finally {
      setLoading(false);
    }
  };

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
    } catch (error) {
      console.error("Error fetching metrics:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const createTradingProject = async () => {
    if (!newProject.name.trim()) {
      toast.error("Please enter a project name");
      return;
    }

    try {
      setCreating(true);
      const { data, error } = await supabase
        .from('trading_projects')
        .insert({
          user_id: user?.id,
          name: newProject.name,
          exchange: newProject.exchange,
          mode: newProject.mode,
          status: 'active',
          capital: parseFloat(newProject.capital) || 10000,
          total_pnl: 0,
          risk_level: newProject.risk_level,
          current_phase: 1,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Trading project "${newProject.name}" created!`);
      setNewProject({ name: "", exchange: "alpaca", mode: "paper", capital: "10000", risk_level: "moderate" });
      setShowCreateDialog(false);
      setSelectedProject(data);

      // Log agent activity
      await supabase.from('agent_activity_logs').insert({
        agent_id: 'trading-ceo',
        agent_name: 'Trading CEO',
        action: `Created new trading project: ${newProject.name}`,
        status: 'completed',
        metadata: { projectId: data.id, exchange: newProject.exchange, mode: newProject.mode },
      });
    } catch (error: any) {
      console.error("Error creating trading project:", error);
      toast.error(error.message || "Failed to create trading project");
    } finally {
      setCreating(false);
    }
  };

  const deleteTradingProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this trading project?")) return;

    try {
      const { error } = await supabase
        .from('trading_projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      toast.success("Trading project deleted");
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
      }
    } catch (error: any) {
      console.error("Error deleting trading project:", error);
      toast.error(error.message || "Failed to delete trading project");
    }
  };

  const totalCapital = tradingProjects.reduce((sum, p) => sum + (p.capital || 0), 0);
  const totalPnL = tradingProjects.reduce((sum, p) => sum + (p.total_pnl || 0), 0);
  const autonomousCount = tradingProjects.filter(p => p.autonomous_mode).length;

  const toggleAutonomousMode = async (projectId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('trading_projects')
        .update({ autonomous_mode: enabled })
        .eq('id', projectId);

      if (error) throw error;
      toast.success(enabled ? '🤖 Autonomous mode ACTIVATED — agents are now trading!' : '⏸️ Autonomous mode paused');
      
      if (selectedProject?.id === projectId) {
        setSelectedProject({ ...selectedProject, autonomous_mode: enabled });
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to toggle autonomous mode');
    }
  };

  const statsData = [
    {
      label: "Active Projects",
      value: tradingProjects.filter(p => p.status === 'active').length.toString(),
      icon: Activity,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Total Capital",
      value: `$${totalCapital.toLocaleString()}`,
      icon: DollarSign,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Total P&L",
      value: `${totalPnL >= 0 ? '+' : ''}$${totalPnL.toLocaleString()}`,
      icon: totalPnL >= 0 ? TrendingUp : TrendingDown,
      color: totalPnL >= 0 ? "text-green-500" : "text-red-500",
      bgColor: totalPnL >= 0 ? "bg-green-500/10" : "bg-red-500/10",
    },
    {
      label: "Autonomous",
      value: `${autonomousCount} active`,
      icon: Zap,
      color: autonomousCount > 0 ? "text-yellow-500" : "text-muted-foreground",
      bgColor: autonomousCount > 0 ? "bg-yellow-500/10" : "bg-muted/10",
    },
  ];

  const phaseNames = [
    "Research",
    "Strategy",
    "Setup",
    "Execution",
    "Monitor",
    "Optimize",
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
                  Multi-exchange automation with AI-powered strategies & real-time monitoring
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
                      <Plus className="h-4 w-4 mr-2" />
                      New Project
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Trading Project</DialogTitle>
                      <DialogDescription>
                        Start a new trading project with AI-powered strategy execution.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Project Name *</Label>
                        <Input
                          id="name"
                          placeholder="e.g., Crypto Momentum Strategy"
                          value={newProject.name}
                          onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="exchange">Exchange</Label>
                        <Select
                          value={newProject.exchange}
                          onValueChange={(value) => setNewProject({ ...newProject, exchange: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select exchange" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="alpaca">Alpaca (Stocks)</SelectItem>
                            <SelectItem value="binance">Binance (Crypto)</SelectItem>
                            <SelectItem value="coinbase">Coinbase (Crypto)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mode">Trading Mode</Label>
                        <Select
                          value={newProject.mode}
                          onValueChange={(value) => setNewProject({ ...newProject, mode: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select mode" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="paper">Paper Trading</SelectItem>
                            <SelectItem value="live">Live Trading (Real Money)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="capital">Starting Capital ($)</Label>
                        <Input
                          id="capital"
                          type="number"
                          placeholder="10000"
                          value={newProject.capital}
                          onChange={(e) => setNewProject({ ...newProject, capital: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="risk">Risk Level</Label>
                        <Select
                          value={newProject.risk_level}
                          onValueChange={(value) => setNewProject({ ...newProject, risk_level: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select risk level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="conservative">Conservative</SelectItem>
                            <SelectItem value="moderate">Moderate</SelectItem>
                            <SelectItem value="aggressive">Aggressive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {newProject.mode === "live" && (
                        <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5" />
                            <div className="text-sm">
                              <p className="font-medium text-orange-500">Live Trading Warning</p>
                              <p className="text-muted-foreground text-xs mt-1">
                                Live trading involves real money. All trades require dual approval.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={createTradingProject} disabled={creating}>
                        {creating ? "Creating..." : "Create Project"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <PageHeader />
              </div>
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
                <TabsTrigger value="projects" className="gap-2">
                  <Target className="h-4 w-4" />
                  Projects ({tradingProjects.length})
                </TabsTrigger>
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
                onClick={() => { fetchTradingProjects(); fetchMetrics(); }}
                disabled={refreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>

            {/* Projects Tab */}
            <TabsContent value="projects" className="space-y-6">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-20 bg-muted rounded" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : tradingProjects.length === 0 ? (
                <Card className="border-dashed border-2">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <LineChart className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Trading Projects</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Create your first trading project and let AI handle research, strategy, and execution.
                    </p>
                    <Button
                      onClick={() => setShowCreateDialog(true)}
                      className="bg-gradient-to-r from-blue-500 to-purple-500"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Project
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tradingProjects.map((project) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card
                        className={`cursor-pointer transition-all ${
                          selectedProject?.id === project.id
                            ? "border-blue-500 bg-blue-500/5"
                            : "hover:border-border"
                        }`}
                        onClick={() => setSelectedProject(project)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base flex items-center gap-2">
                                <LineChart className="h-4 w-4 text-blue-500" />
                                {project.name}
                              </CardTitle>
                              <CardDescription className="text-xs mt-1">
                                {project.exchange.toUpperCase()} • {project.mode === 'paper' ? '📄 Paper' : '💰 Live'}
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge
                                className={
                                  project.status === "active"
                                    ? "bg-green-500"
                                    : "bg-gray-500"
                                }
                              >
                                {project.status}
                              </Badge>
                              {project.autonomous_mode && (
                                <Badge className="bg-yellow-500 text-xs animate-pulse">
                                  🤖 AUTO
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-2">
                          <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                            <div className="p-2 bg-muted rounded">
                              <p className="text-muted-foreground">Capital</p>
                              <p className="font-bold">${(project.capital || 0).toLocaleString()}</p>
                            </div>
                            <div className="p-2 bg-muted rounded">
                              <p className="text-muted-foreground">P&L</p>
                              <p className={`font-bold ${(project.total_pnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {(project.total_pnl || 0) >= 0 ? '+' : ''}${(project.total_pnl || 0).toLocaleString()}
                              </p>
                            </div>
                            <div className="p-2 bg-muted rounded">
                              <p className="text-muted-foreground">Risk</p>
                              <p className="font-bold capitalize">{project.risk_level || 'moderate'}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                            <span>Phase {project.current_phase}/6</span>
                            <span>{phaseNames[project.current_phase - 1]}</span>
                          </div>

                          {project.last_sync_at && (
                            <p className="text-xs text-muted-foreground mb-2">
                              Last sync: {new Date(project.last_sync_at).toLocaleTimeString()}
                            </p>
                          )}

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-blue-500 hover:bg-blue-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProject(project);
                                setActiveTab("automation");
                              }}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Open
                            </Button>
                            <Button
                              size="sm"
                              variant={project.autonomous_mode ? "destructive" : "outline"}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleAutonomousMode(project.id, !project.autonomous_mode);
                              }}
                              title={project.autonomous_mode ? "Disable Autonomous" : "Enable Autonomous"}
                            >
                              <Zap className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTradingProject(project.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}

                  {/* Add New Project Card */}
                  <Card
                    className="border-dashed border-2 cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all"
                    onClick={() => setShowCreateDialog(true)}
                  >
                    <CardContent className="flex flex-col items-center justify-center h-full py-12">
                      <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Add New Project</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <ExchangeWebMonitor exchangeId={selectedProject?.exchange || "alpaca"} />
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
                      <Button variant="outline" className="w-full">
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
                <ExchangeWebMonitor exchangeId={selectedProject?.exchange || "alpaca"} />
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
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              >
                {selectedProject ? (
                  <RealTimeAgentExecutor
                    projectId={selectedProject.id}
                    projectName={selectedProject.name}
                    currentPhase={selectedProject.current_phase}
                    exchange={selectedProject.exchange}
                    mode={selectedProject.mode as "paper" | "live"}
                    capital={selectedProject.capital}
                    onPhaseChange={async (newPhase) => {
                      await supabase
                        .from("trading_projects")
                        .update({ current_phase: newPhase })
                        .eq("id", selectedProject.id);
                      setSelectedProject({ ...selectedProject, current_phase: newPhase });
                    }}
                  />
                ) : (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-muted-foreground">
                        Select a project to run agents
                      </p>
                    </CardContent>
                  </Card>
                )}
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
