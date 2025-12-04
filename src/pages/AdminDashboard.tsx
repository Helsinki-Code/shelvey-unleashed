import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Activity, Server, DollarSign, Users, Zap, TrendingUp, 
  Clock, CheckCircle, AlertTriangle, RefreshCw 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { mcpServers } from '@/lib/mcp-servers';
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

interface MCPStatus {
  server_id: string;
  server_name: string;
  status: string;
  latency_ms: number;
  requests_today: number;
}

const AdminDashboard = () => {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [mcpStatuses, setMcpStatuses] = useState<MCPStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Generate mock real-time data
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

  const mcpRequestsData = mcpServers.slice(0, 6).map(server => ({
    name: server.name.split(' ')[0],
    requests: server.requestsToday || Math.floor(Math.random() * 1000),
    latency: server.latency || Math.floor(Math.random() * 100),
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

      // Fetch MCP statuses
      const { data: statuses } = await supabase
        .from('mcp_server_status')
        .select('*');
      
      if (statuses) setMcpStatuses(statuses);
      
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const totalRevenue = businesses.reduce((sum, b) => sum + b.revenue, 0);
  const activeAgents = agents.filter(a => a.status === 'active').length;
  const connectedServers = mcpServers.filter(s => s.status === 'connected').length;
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
            <p className="text-muted-foreground mt-2">Real-time analytics and system monitoring</p>
          </div>
          <Button variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { title: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, change: '+23%', color: 'text-primary' },
            { title: 'Active Agents', value: activeAgents, icon: Users, change: `/${agents.length} total`, color: 'text-accent' },
            { title: 'MCP Servers', value: connectedServers, icon: Server, change: `/${mcpServers.length} connected`, color: 'text-chart-3' },
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
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
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

        {/* Charts Row 2 */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {/* MCP Server Requests */}
          <Card className="glass-morphism cyber-border lg:col-span-2">
            <CardHeader>
              <CardTitle className="cyber-text flex items-center gap-2">
                <Server className="w-5 h-5 text-chart-3" />
                MCP Server Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
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

          {/* Business Stage Distribution */}
          <Card className="glass-morphism cyber-border">
            <CardHeader>
              <CardTitle className="cyber-text flex items-center gap-2">
                <Zap className="w-5 h-5 text-chart-5" />
                Business Stages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={businessStageData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {businessStageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)'
                    }}
                  />
                  <Legend />
                </PieChart>
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
      </main>

      <Footer />
    </div>
  );
};

export default AdminDashboard;
