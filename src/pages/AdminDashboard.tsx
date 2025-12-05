import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Activity, Server, DollarSign, Users, Zap, TrendingUp, 
  Clock, CheckCircle, AlertTriangle, RefreshCw, Settings, Key
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { AdminAPIKeys } from '@/components/AdminAPIKeys';
import { supabase } from '@/integrations/supabase/client';
import { useMCPServers, getServerMetadata } from '@/hooks/useMCPServers';
import { agents, businesses } from '@/lib/agents-data';

// Chart colors using design tokens
const CHART_COLORS = [
  'hsl(158 100% 45%)',
  'hsl(180 100% 50%)',
  'hsl(270 80% 60%)',
  'hsl(120 100% 50%)',
  'hsl(45 100% 60%)',
];

interface ActivityLog {
  id: string;
  agent_id: string;
  agent_name: string;
  action: string;
  status: string;
  created_at: string;
}

const AdminDashboard = () => {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { servers: mcpServers, stats: mcpStats, simulateActivity } = useMCPServers();

  // Generate agent performance data
  const agentPerformanceData = agents.slice(0, 8).map(agent => ({
    name: agent.name.replace(' Agent', ''),
    tasks: agent.tasksPerHour,
    success: agent.successRate,
  }));

  const revenueData = [
    { month: 'Jan', revenue: 12000, costs: 4000 },
    { month: 'Feb', revenue: 19000, costs: 5000 },
    { month: 'Mar', revenue: 28000, costs: 6000 },
    { month: 'Apr', revenue: 35000, costs: 7000 },
    { month: 'May', revenue: 48000, costs: 8000 },
    { month: 'Jun', revenue: 62000, costs: 9000 },
  ];

  // Real MCP data from database
  const mcpRequestsData = mcpServers.slice(0, 6).map(server => ({
    name: server.server_name.split(' ')[0],
    requests: server.requests_today || 0,
    latency: server.latency_ms || 0,
  }));

  const businessStageData = [
    { name: 'Research', value: businesses.filter(b => b.stage === 'research').length, color: CHART_COLORS[0] },
    { name: 'Building', value: businesses.filter(b => b.stage === 'building').length, color: CHART_COLORS[1] },
    { name: 'Marketing', value: businesses.filter(b => b.stage === 'marketing').length, color: CHART_COLORS[2] },
    { name: 'Launching', value: businesses.filter(b => b.stage === 'launching').length, color: CHART_COLORS[3] },
    { name: 'Scaling', value: businesses.filter(b => b.stage === 'scaling').length, color: CHART_COLORS[4] },
  ];

  // Realtime subscription
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      // Fetch activity logs
      const { data: logs } = await supabase
        .from('agent_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (logs) setActivityLogs(logs);
      
      setIsLoading(false);
    };

    fetchData();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('admin-dashboard')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'agent_activity_logs'
      }, (payload) => {
        setActivityLogs(prev => [payload.new as ActivityLog, ...prev.slice(0, 19)]);
      })
      .subscribe();

    // Auto-simulate activity
    const interval = setInterval(() => {
      simulateActivity();
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const totalRevenue = businesses.reduce((sum, b) => sum + b.revenue, 0);
  const activeAgents = agents.filter(a => a.status === 'active').length;
  const avgSuccessRate = (agents.reduce((sum, a) => sum + a.successRate, 0) / agents.length).toFixed(1);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 pt-24">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="cyber-text text-4xl font-bold text-gradient">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-2">Real-time analytics and system configuration</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => simulateActivity()}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </motion.div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview" className="gap-2">
              <Activity className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="mcp" className="gap-2">
              <Server className="w-4 h-4" />
              MCP Servers
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Key className="w-4 h-4" />
              API Keys
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, change: '+23%', color: 'text-primary' },
                { title: 'Active Agents', value: activeAgents, icon: Users, change: `/${agents.length} total`, color: 'text-accent' },
                { title: 'MCP Servers', value: mcpStats.connected, icon: Server, change: `/${mcpStats.total} connected`, color: 'text-chart-3' },
                { title: 'Success Rate', value: `${avgSuccessRate}%`, icon: CheckCircle, change: '+2.1%', color: 'text-chart-4' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="glass-morphism cyber-border">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">{stat.title}</p>
                          <p className={`text-3xl font-bold cyber-text ${stat.color}`}>{stat.value}</p>
                          <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                        </div>
                        <stat.icon className={`w-10 h-10 ${stat.color} opacity-50`} />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Charts Row 1 */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Revenue Chart */}
              <Card className="glass-morphism cyber-border">
                <CardHeader>
                  <CardTitle className="cyber-text flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Revenue vs Costs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(158 100% 45%)" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="hsl(158 100% 45%)" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorCosts" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(270 80% 60%)" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="hsl(270 80% 60%)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 'var(--radius)'
                        }}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="revenue" stroke="hsl(158 100% 45%)" fillOpacity={1} fill="url(#colorRevenue)" />
                      <Area type="monotone" dataKey="costs" stroke="hsl(270 80% 60%)" fillOpacity={1} fill="url(#colorCosts)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Agent Performance */}
              <Card className="glass-morphism cyber-border">
                <CardHeader>
                  <CardTitle className="cyber-text flex items-center gap-2">
                    <Activity className="w-5 h-5 text-accent" />
                    Agent Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={agentPerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 'var(--radius)'
                        }}
                      />
                      <Legend />
                      <Bar dataKey="tasks" name="Tasks/Hour" fill="hsl(180 100% 50%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="success" name="Success %" fill="hsl(158 100% 45%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Activity Log */}
            <Card className="glass-morphism cyber-border">
              <CardHeader>
                <CardTitle className="cyber-text flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Real-time Activity Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {activityLogs.length > 0 ? (
                    activityLogs.map((log, i) => (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between p-3 bg-card/50 rounded-lg border border-border/50"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant={log.status === 'completed' ? 'default' : 'secondary'}>
                            {log.status}
                          </Badge>
                          <span className="font-medium text-foreground">{log.agent_name}</span>
                          <span className="text-muted-foreground">{log.action}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </span>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No activity logs yet. Agent actions will appear here in real-time.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mcp" className="space-y-6">
            {/* MCP Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="glass-morphism cyber-border">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-emerald-400">{mcpStats.connected}</div>
                  <div className="text-sm text-muted-foreground">Connected</div>
                </CardContent>
              </Card>
              <Card className="glass-morphism cyber-border">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-amber-400">{mcpStats.syncing}</div>
                  <div className="text-sm text-muted-foreground">Syncing</div>
                </CardContent>
              </Card>
              <Card className="glass-morphism cyber-border">
                <CardContent className="p-4 text-center">
                  <div className="text-3xl font-bold text-rose-400">{mcpStats.requiresKey}</div>
                  <div className="text-sm text-muted-foreground">Needs Key</div>
                </CardContent>
              </Card>
              <Card className="glass-morphism cyber-border">
                <CardContent className="p-4 text-center">
                  <motion.div 
                    key={mcpStats.totalRequests}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    className="text-3xl font-bold text-primary"
                  >
                    {mcpStats.totalRequests.toLocaleString()}
                  </motion.div>
                  <div className="text-sm text-muted-foreground">Total Requests</div>
                </CardContent>
              </Card>
            </div>

            {/* MCP Server Health Chart */}
            <Card className="glass-morphism cyber-border">
              <CardHeader>
                <CardTitle className="cyber-text flex items-center gap-2">
                  <Server className="w-5 h-5 text-chart-3" />
                  MCP Server Health (Live from Database)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={mcpRequestsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius)'
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="requests" name="Requests" stroke="hsl(180 100% 50%)" strokeWidth={2} dot={{ fill: 'hsl(180 100% 50%)' }} />
                    <Line type="monotone" dataKey="latency" name="Latency (ms)" stroke="hsl(45 100% 60%)" strokeWidth={2} dot={{ fill: 'hsl(45 100% 60%)' }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Server List */}
            <Card className="glass-morphism cyber-border">
              <CardHeader>
                <CardTitle className="cyber-text">All MCP Servers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {mcpServers.map((server) => {
                    const metadata = getServerMetadata(server.metadata);
                    return (
                      <div 
                        key={server.id}
                        className="flex items-center justify-between p-3 bg-card/50 rounded-lg border border-border/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            server.status === 'connected' ? 'bg-emerald-500' :
                            server.status === 'syncing' ? 'bg-amber-500' : 'bg-rose-500'
                          }`} />
                          <span className="font-medium text-foreground">{server.server_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {metadata.category}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{server.latency_ms}ms</span>
                          <span>{server.requests_today?.toLocaleString()} req</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <AdminAPIKeys />
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default AdminDashboard;
