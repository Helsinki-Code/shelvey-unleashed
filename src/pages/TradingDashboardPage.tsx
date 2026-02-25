import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { SimpleDashboardSidebar } from "@/components/SimpleDashboardSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  LineChart,
  RefreshCw,
  AlertCircle,
  Plus,
  Play,
  Trash2,
  DollarSign,
  Shield,
  Target,
  Users,
  Brain,
  Eye,
  BarChart3,
  Globe,
  Lock,
  Pause,
  Power,
} from "lucide-react";
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

// New trading components
import { AgentTeamGrid } from "@/components/trading/AgentTeamGrid";
import { ConsensusPanel } from "@/components/trading/ConsensusPanel";
import { MarketSessionClock } from "@/components/trading/MarketSessionClock";
import { RiskProfileSelector } from "@/components/trading/RiskProfileSelector";
import { WorkflowEngine } from "@/components/trading/WorkflowEngine";
import { TrustFramework } from "@/components/trading/TrustFramework";
import { LivePortfolioDashboard } from "@/components/trading/LivePortfolioDashboard";
import { RealTimeAgentExecutor } from "@/components/trading/RealTimeAgentExecutor";
import { TradingJournalViewer } from "@/components/trading/TradingJournalViewer";
import { MarketDataScraper } from "@/components/trading/MarketDataScraper";
import { TRADING_AGENTS, SUPPORTED_MARKETS, RISK_PROFILES } from "@/lib/trading-agents";

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
  const [activeTab, setActiveTab] = useState("dashboard");
  const [tradingProjects, setTradingProjects] = useState<TradingProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<TradingProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [riskProfile, setRiskProfile] = useState("moderate");
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
      const channel = supabase
        .channel('trading-projects-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trading_projects', filter: `user_id=eq.${user.id}` }, () => fetchTradingProjects())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
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
      if (data && data.length > 0 && !selectedProject) setSelectedProject(data[0]);
    } catch (error) {
      console.error("Error fetching trading projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const createTradingProject = async () => {
    if (!newProject.name.trim()) { toast.error("Enter a project name"); return; }
    try {
      setCreating(true);
      const { data, error } = await supabase.from('trading_projects').insert({
        user_id: user?.id, name: newProject.name, exchange: newProject.exchange,
        mode: newProject.mode, status: 'active', capital: parseFloat(newProject.capital) || 10000,
        total_pnl: 0, risk_level: newProject.risk_level, current_phase: 1,
      }).select().single();
      if (error) throw error;
      toast.success(`"${newProject.name}" created!`);
      setNewProject({ name: "", exchange: "alpaca", mode: "paper", capital: "10000", risk_level: "moderate" });
      setShowCreateDialog(false);
      setSelectedProject(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  const deleteTradingProject = async (projectId: string) => {
    if (!confirm("Delete this trading project?")) return;
    try {
      const { error } = await supabase.from('trading_projects').delete().eq('id', projectId);
      if (error) throw error;
      toast.success("Project deleted");
      if (selectedProject?.id === projectId) setSelectedProject(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    }
  };

  const toggleAutonomousMode = async (projectId: string, enabled: boolean) => {
    try {
      const { error } = await supabase.from('trading_projects').update({ autonomous_mode: enabled }).eq('id', projectId);
      if (error) throw error;
      toast.success(enabled ? '🤖 Autonomous mode ACTIVATED' : '⏸️ Autonomous mode paused');
      if (selectedProject?.id === projectId) setSelectedProject({ ...selectedProject!, autonomous_mode: enabled });
    } catch (error: any) {
      toast.error(error.message || 'Failed');
    }
  };

  const totalCapital = tradingProjects.reduce((s, p) => s + (p.capital || 0), 0);
  const totalPnL = tradingProjects.reduce((s, p) => s + (p.total_pnl || 0), 0);
  const autonomousCount = tradingProjects.filter(p => p.autonomous_mode).length;
  const agentCount = Object.keys(TRADING_AGENTS).length;

  return (
    <div className="min-h-screen bg-background flex">
      <SimpleDashboardSidebar />

      <main className="flex-1 ml-[260px]">
        {/* Hero Header */}
        <div className="border-b border-border/50 bg-card">
          <div className="p-6 pb-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  📈 Autonomous Trading AI Agent Team
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  Your 24/7 Digital Trading Floor — {agentCount} Specialized Agents • Never Sleeps, Always Executing
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" /> New Project
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Trading Project</DialogTitle>
                      <DialogDescription>Deploy your AI agent team on a new trading strategy.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Project Name *</Label>
                        <Input placeholder="e.g., Crypto Momentum" value={newProject.name} onChange={(e) => setNewProject({ ...newProject, name: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Exchange</Label>
                          <Select value={newProject.exchange} onValueChange={(v) => setNewProject({ ...newProject, exchange: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="alpaca">Alpaca (Stocks)</SelectItem>
                              <SelectItem value="binance">Binance (Crypto)</SelectItem>
                              <SelectItem value="coinbase">Coinbase (Crypto)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Mode</Label>
                          <Select value={newProject.mode} onValueChange={(v) => setNewProject({ ...newProject, mode: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="paper">🧪 Paper Trading</SelectItem>
                              <SelectItem value="live">💰 Live (Real Money)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Starting Capital ($)</Label>
                          <Input type="number" value={newProject.capital} onChange={(e) => setNewProject({ ...newProject, capital: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Risk Profile</Label>
                          <Select value={newProject.risk_level} onValueChange={(v) => setNewProject({ ...newProject, risk_level: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {RISK_PROFILES.map(r => (
                                <SelectItem key={r.id} value={r.id}>{r.emoji} {r.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {newProject.mode === "live" && (
                        <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20 text-sm">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                            <div>
                              <p className="font-medium text-destructive">Live Trading Warning</p>
                              <p className="text-muted-foreground text-xs mt-1">Real money. All trades require dual approval (AI CEO + You).</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                      <Button onClick={createTradingProject} disabled={creating}>{creating ? "Creating..." : "Deploy Agent Team"}</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" size="sm" onClick={fetchTradingProjects} disabled={refreshing}>
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            {/* Quick Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Agent Team", value: `${agentCount} Agents`, icon: Users, accent: false },
                { label: "Active Projects", value: tradingProjects.filter(p => p.status === 'active').length.toString(), icon: Target, accent: false },
                { label: "Total Capital", value: `$${totalCapital.toLocaleString()}`, icon: DollarSign, accent: false },
                { label: "Total P&L", value: `${totalPnL >= 0 ? '+' : ''}$${totalPnL.toLocaleString()}`, icon: totalPnL >= 0 ? TrendingUp : TrendingDown, accent: totalPnL >= 0 },
                { label: "Autonomous", value: `${autonomousCount} active`, icon: Zap, accent: autonomousCount > 0 },
              ].map((s, idx) => (
                <Card key={idx} className="border-border/30">
                  <CardContent className="p-3 flex items-center gap-3">
                    <s.icon className={`h-5 w-5 ${s.accent ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                      <p className="text-sm font-bold">{s.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Main Tabbed Content */}
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-card border border-border">
              <TabsTrigger value="dashboard" className="gap-1.5 text-xs">
                <BarChart3 className="h-3.5 w-3.5" /> Dashboard
              </TabsTrigger>
              <TabsTrigger value="agents" className="gap-1.5 text-xs">
                <Users className="h-3.5 w-3.5" /> Agent Team ({agentCount})
              </TabsTrigger>
              <TabsTrigger value="projects" className="gap-1.5 text-xs">
                <Target className="h-3.5 w-3.5" /> Projects ({tradingProjects.length})
              </TabsTrigger>
              <TabsTrigger value="consensus" className="gap-1.5 text-xs">
                <Brain className="h-3.5 w-3.5" /> Consensus
              </TabsTrigger>
              <TabsTrigger value="markets" className="gap-1.5 text-xs">
                <Globe className="h-3.5 w-3.5" /> Markets
              </TabsTrigger>
              <TabsTrigger value="execution" className="gap-1.5 text-xs">
                <Zap className="h-3.5 w-3.5" /> Execution
              </TabsTrigger>
              <TabsTrigger value="risk" className="gap-1.5 text-xs">
                <Shield className="h-3.5 w-3.5" /> Risk & Safety
              </TabsTrigger>
            </TabsList>

            {/* ===== DASHBOARD TAB ===== */}
            <TabsContent value="dashboard" className="space-y-6">
              <LivePortfolioDashboard />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <WorkflowEngine />
                <MarketSessionClock />
              </div>
            </TabsContent>

            {/* ===== AGENT TEAM TAB ===== */}
            <TabsContent value="agents" className="space-y-6">
              <div className="mb-4">
                <h2 className="text-xl font-bold">🏢 The Trading Floor Team</h2>
                <p className="text-sm text-muted-foreground">
                  {agentCount} specialized AI agents working in concert — each built for a critical trading function.
                </p>
              </div>
              <AgentTeamGrid />
            </TabsContent>

            {/* ===== PROJECTS TAB ===== */}
            <TabsContent value="projects" className="space-y-6">
              {tradingProjects.length === 0 ? (
                <Card className="border-dashed border-2">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <LineChart className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Trading Projects</h3>
                    <p className="text-muted-foreground text-center mb-4 text-sm">
                      Deploy your {agentCount}-agent team on a new trading strategy.
                    </p>
                    <Button onClick={() => setShowCreateDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" /> Deploy Agent Team
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tradingProjects.map((project) => (
                    <motion.div key={project.id} whileHover={{ scale: 1.01 }} transition={{ duration: 0.15 }}>
                      <Card className={`transition-all ${selectedProject?.id === project.id ? "border-primary ring-1 ring-primary/20" : "hover:border-border"}`}
                        onClick={() => setSelectedProject(project)}>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-sm flex items-center gap-2">
                                <LineChart className="h-4 w-4 text-primary" />
                                {project.name}
                              </CardTitle>
                              <CardDescription className="text-xs mt-0.5">
                                {project.exchange.toUpperCase()} • {project.mode === 'paper' ? '🧪 Paper' : '💰 Live'}
                              </CardDescription>
                            </div>
                            <div className="flex gap-1">
                              <Badge variant={project.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                                {project.status}
                              </Badge>
                              {project.autonomous_mode && (
                                <Badge className="bg-green-500 text-[10px] animate-pulse">🤖 AUTO</Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-2">
                          <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                            <div className="p-2 bg-muted/50 rounded">
                              <p className="text-muted-foreground">Capital</p>
                              <p className="font-bold">${(project.capital || 0).toLocaleString()}</p>
                            </div>
                            <div className="p-2 bg-muted/50 rounded">
                              <p className="text-muted-foreground">P&L</p>
                              <p className={`font-bold ${(project.total_pnl || 0) >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                                {(project.total_pnl || 0) >= 0 ? '+' : ''}${(project.total_pnl || 0).toLocaleString()}
                              </p>
                            </div>
                            <div className="p-2 bg-muted/50 rounded">
                              <p className="text-muted-foreground">Risk</p>
                              <p className="font-bold capitalize">{project.risk_level || 'moderate'}</p>
                            </div>
                          </div>
                          {project.last_sync_at && (
                            <p className="text-[10px] text-muted-foreground mb-2">
                              Last sync: {new Date(project.last_sync_at).toLocaleTimeString()}
                            </p>
                          )}
                          <div className="flex gap-1.5">
                            <Button size="sm" className="flex-1 h-7 text-xs" onClick={(e) => { e.stopPropagation(); setSelectedProject(project); setActiveTab("execution"); }}>
                              <Play className="h-3 w-3 mr-1" /> Open
                            </Button>
                            <Button size="sm" variant={project.autonomous_mode ? "destructive" : "outline"} className="h-7 text-xs"
                              onClick={(e) => { e.stopPropagation(); toggleAutonomousMode(project.id, !project.autonomous_mode); }}>
                              {project.autonomous_mode ? <Pause className="h-3 w-3" /> : <Power className="h-3 w-3" />}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive"
                              onClick={(e) => { e.stopPropagation(); deleteTradingProject(project.id); }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                  <Card className="border-dashed border-2 cursor-pointer hover:border-primary/50 transition-all" onClick={() => setShowCreateDialog(true)}>
                    <CardContent className="flex flex-col items-center justify-center h-full py-12">
                      <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-xs text-muted-foreground">Deploy New Agent Team</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* ===== CONSENSUS TAB ===== */}
            <TabsContent value="consensus" className="space-y-6">
              <div className="mb-4">
                <h2 className="text-xl font-bold">🗳️ Multi-Agent Consensus Framework</h2>
                <p className="text-sm text-muted-foreground">
                  No single agent can unilaterally make high-risk decisions — trades require multi-agent agreement.
                </p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ConsensusPanel symbol="NVDA" />
                <ConsensusPanel
                  symbol="BTC/USD"
                  votes={[
                    { agentEmoji: '📊', agentName: 'Technical Agent', vote: 'HOLD', confidence: 55, reason: 'Consolidation near resistance' },
                    { agentEmoji: '🧠', agentName: 'Strategy Agent', vote: 'BUY', confidence: 70, reason: 'Long-term accumulation zone' },
                    { agentEmoji: '🧾', agentName: 'Sentiment Agent', vote: 'BUY', confidence: 80, reason: 'Strong bullish sentiment' },
                    { agentEmoji: '📰', agentName: 'News Agent', vote: 'NEUTRAL', confidence: 45, reason: 'ETF flows mixed' },
                    { agentEmoji: '🛡️', agentName: 'Risk Agent', vote: 'BUY', confidence: 75, reason: 'Position fits allocation' },
                    { agentEmoji: '🤖', agentName: 'Quant Agent', vote: 'SELL', confidence: 60, reason: 'Mean reversion signal' },
                  ]}
                />
              </div>
            </TabsContent>

            {/* ===== MARKETS TAB ===== */}
            <TabsContent value="markets" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MarketSessionClock />
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">💰 Supported Markets & Asset Classes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {SUPPORTED_MARKETS.map((m, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/30">
                        <span className="text-lg">{m.emoji}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{m.category}</p>
                          <p className="text-xs text-muted-foreground">{m.assets}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{m.hours}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
              <MarketDataScraper />
            </TabsContent>

            {/* ===== EXECUTION TAB ===== */}
            <TabsContent value="execution" className="space-y-6">
              {selectedProject ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <RealTimeAgentExecutor
                    projectId={selectedProject.id}
                    projectName={selectedProject.name}
                    currentPhase={selectedProject.current_phase}
                    exchange={selectedProject.exchange}
                    mode={selectedProject.mode as "paper" | "live"}
                    capital={selectedProject.capital}
                    onPhaseChange={async (newPhase) => {
                      await supabase.from("trading_projects").update({ current_phase: newPhase }).eq("id", selectedProject.id);
                      setSelectedProject({ ...selectedProject, current_phase: newPhase });
                    }}
                  />
                  <TradingJournalViewer />
                </div>
              ) : (
                <Card className="border-dashed border-2">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Zap className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Select a Project</h3>
                    <p className="text-muted-foreground text-sm">Go to Projects tab and select one to start agent execution.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ===== RISK & SAFETY TAB ===== */}
            <TabsContent value="risk" className="space-y-6">
              <div className="mb-4">
                <h2 className="text-xl font-bold">🛡️ Risk Management & Safety</h2>
                <p className="text-sm text-muted-foreground">
                  Capital protection is the #1 priority. The Risk Agent overrides ALL other agents when thresholds are breached.
                </p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RiskProfileSelector selected={riskProfile} onSelect={setRiskProfile} />
                <TrustFramework />
              </div>

              {/* Risk Parameters Table */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">🛡️ Risk Management Agent — The Capital Guardian</CardTitle>
                  <CardDescription>THE MOST CRITICAL AGENT IN THE ENTIRE TEAM</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left py-2 text-muted-foreground font-medium">Risk Parameter</th>
                          <th className="text-left py-2 text-muted-foreground font-medium">Implementation</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {[
                          ['Max Risk Per Trade', 'Never risks more than a defined % of capital (1-2%)'],
                          ['Max Daily Drawdown', 'Halts all trading if daily loss limit is reached'],
                          ['Max Total Drawdown', 'Emergency shutdown if portfolio drawdown exceeds threshold'],
                          ['Position Sizing', 'Kelly Criterion, fixed fractional, or ATR-based models'],
                          ['Correlation Risk', 'Prevents overexposure to correlated assets'],
                          ['Leverage Limits', 'Caps leverage to prevent catastrophic losses'],
                          ['Volatility Adjustment', 'Reduces position sizes during high-volatility regimes'],
                          ['Circuit Breakers', 'Pauses during black swan events or flash crashes'],
                        ].map(([param, impl], idx) => (
                          <tr key={idx} className="border-b border-border/20">
                            <td className="py-2.5 font-medium">{param}</td>
                            <td className="py-2.5 text-muted-foreground">{impl}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Disclaimer */}
              <Card className="border-destructive/20 bg-destructive/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                    <div className="text-xs text-muted-foreground">
                      <p className="font-semibold text-destructive mb-1">⚠️ Important Disclaimer</p>
                      <p>
                        Trading financial instruments involves substantial risk of loss. Past performance does not guarantee future results. 
                        This is a technology platform, not financial advice. Only trade with capital you can afford to lose. 
                        Consult a licensed financial advisor before making investment decisions.
                      </p>
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

export default TradingDashboardPage;
