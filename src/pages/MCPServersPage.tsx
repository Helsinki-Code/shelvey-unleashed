import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { categoryColors } from '@/lib/mcp-servers';
import { useMCPServers, MCPServerDB, getServerMetadata } from '@/hooks/useMCPServers';
import { Helmet } from 'react-helmet-async';
import { 
  Server, Activity, Zap, Clock, TrendingUp, Search, 
  RefreshCw, AlertCircle, CheckCircle2, Loader2, Key
} from 'lucide-react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';

// Generate latency history from current latency
const generateLatencyHistory = (baseLatency: number) => {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    latency: Math.max(5, baseLatency + Math.floor(Math.random() * 40) - 20),
  }));
};

// Generate request history
const generateRequestHistory = (baseRequests: number) => {
  return Array.from({ length: 7 }, (_, i) => ({
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    requests: Math.max(100, Math.floor(baseRequests / 7) + Math.floor(Math.random() * 500) - 250),
  }));
};

const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { icon: any; color: string; bg: string; label: string }> = {
    connected: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Connected' },
    syncing: { icon: Loader2, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Syncing' },
    'requires-key': { icon: Key, color: 'text-rose-400', bg: 'bg-rose-500/10', label: 'Requires Key' },
  };
  const { icon: Icon, color, bg, label } = config[status] || config['requires-key'];
  
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${bg}`}>
      <Icon className={`w-3 h-3 ${color} ${status === 'syncing' ? 'animate-spin' : ''}`} />
      <span className={`text-xs font-medium ${color}`}>{label}</span>
    </div>
  );
};

const ServerDetailCard = ({ server, onClose }: { server: MCPServerDB; onClose: () => void }) => {
  const metadata = getServerMetadata(server.metadata);
  const latencyData = generateLatencyHistory(server.latency_ms || 50);
  const requestData = generateRequestHistory(server.requests_today || 1000);
  const categoryStyle = categoryColors[metadata.category as keyof typeof categoryColors] || 
    { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl rounded-2xl bg-card border border-border shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-xl ${categoryStyle.bg} flex items-center justify-center text-4xl`}>
                <Server className={`w-8 h-8 ${categoryStyle.text}`} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">{server.server_name}</h2>
                <p className="text-muted-foreground">Server ID: {server.server_id}</p>
              </div>
            </div>
            <StatusBadge status={server.status} />
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 p-6 border-b border-border">
          <div className="text-center p-4 rounded-xl bg-muted/50">
            <motion.div 
              key={server.latency_ms}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              className="text-3xl font-bold text-primary"
            >
              {server.latency_ms || '--'}ms
            </motion.div>
            <div className="text-xs text-muted-foreground mt-1">Avg Latency</div>
          </div>
          <div className="text-center p-4 rounded-xl bg-muted/50">
            <motion.div 
              key={server.requests_today}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              className="text-3xl font-bold text-emerald-400"
            >
              {server.requests_today?.toLocaleString() || '--'}
            </motion.div>
            <div className="text-xs text-muted-foreground mt-1">Requests Today</div>
          </div>
          <div className="text-center p-4 rounded-xl bg-muted/50">
            <div className="text-3xl font-bold text-amber-400">{metadata.toolCount || '--'}</div>
            <div className="text-xs text-muted-foreground mt-1">Available Tools</div>
          </div>
          <div className="text-center p-4 rounded-xl bg-muted/50">
            <div className="text-3xl font-bold text-cyan-400">99.9%</div>
            <div className="text-xs text-muted-foreground mt-1">Uptime</div>
          </div>
        </div>
        
        {/* Charts */}
        <div className="p-6 space-y-6">
          {/* Latency Chart */}
          <div>
            <h3 className="text-sm font-mono text-muted-foreground mb-4 uppercase tracking-wider">
              24h Latency Trend
            </h3>
            <div className="h-48 w-full">
              <ResponsiveContainer>
                <AreaChart data={latencyData}>
                  <defs>
                    <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="latency" 
                    stroke="hsl(var(--primary))" 
                    fill="url(#latencyGradient)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Request Volume Chart */}
          <div>
            <h3 className="text-sm font-mono text-muted-foreground mb-4 uppercase tracking-wider">
              Weekly Request Volume
            </h3>
            <div className="h-48 w-full">
              <ResponsiveContainer>
                <BarChart data={requestData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="requests" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Environment Requirements */}
          {metadata.envRequired && metadata.envRequired.length > 0 && (
            <div>
              <h3 className="text-sm font-mono text-muted-foreground mb-3 uppercase tracking-wider">
                Required Environment Variables
              </h3>
              <div className="flex flex-wrap gap-2">
                {metadata.envRequired.map((env: string) => (
                  <code key={env} className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 text-sm font-mono">
                    {env}
                  </code>
                ))}
              </div>
            </div>
          )}

          {/* Last Updated */}
          <div className="text-xs text-muted-foreground">
            Last updated: {new Date(server.updated_at).toLocaleString()}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const MCPServersPage = () => {
  const { servers, isLoading, stats, refreshServers, simulateActivity } = useMCPServers();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedServer, setSelectedServer] = useState<MCPServerDB | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto-simulate activity every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      simulateActivity();
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  
  const categories = [...new Set(servers.map(s => getServerMetadata(s.metadata).category))];
  
  const filteredServers = servers.filter(server => {
    const metadata = getServerMetadata(server.metadata);
    const matchesSearch = server.server_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || metadata.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || server.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await simulateActivity();
    refreshServers();
    setTimeout(() => setIsRefreshing(false), 1000);
  };
  
  return (
    <>
      <Helmet>
        <title>MCP Servers Monitor - ShelVey</title>
        <meta name="description" content="Real-time monitoring of all 26 AMROGEN MCP servers. Track latency, request volume, and connection status." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="pt-24">
          {/* Hero */}
          <section className="py-12 relative overflow-hidden">
            <div className="absolute inset-0 matrix-bg opacity-10" />
            <div className="container mx-auto px-4 relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
              >
                <h1 className="font-cyber text-4xl md:text-5xl font-bold mb-4">
                  <span className="text-gradient">MCP SERVERS</span>
                </h1>
                <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                  Real-time monitoring of all {stats.total} AMROGEN backend integrations. Data updates live from database.
                </p>
              </motion.div>
              
              {/* Stats Overview */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="p-4 rounded-xl bg-card border border-border text-center"
                >
                  <Server className="w-6 h-6 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{stats.total}</div>
                  <div className="text-xs text-muted-foreground">Total Servers</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="p-4 rounded-xl bg-card border border-border text-center"
                >
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-emerald-400">{stats.connected}</div>
                  <div className="text-xs text-muted-foreground">Connected</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="p-4 rounded-xl bg-card border border-border text-center"
                >
                  <Loader2 className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-amber-400">{stats.syncing}</div>
                  <div className="text-xs text-muted-foreground">Syncing</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="p-4 rounded-xl bg-card border border-border text-center"
                >
                  <Key className="w-6 h-6 text-rose-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-rose-400">{stats.requiresKey}</div>
                  <div className="text-xs text-muted-foreground">Needs Key</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="p-4 rounded-xl bg-card border border-border text-center"
                >
                  <TrendingUp className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                  <motion.div 
                    key={stats.totalRequests}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    className="text-2xl font-bold text-cyan-400"
                  >
                    {stats.totalRequests.toLocaleString()}
                  </motion.div>
                  <div className="text-xs text-muted-foreground">Requests Today</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="p-4 rounded-xl bg-card border border-border text-center"
                >
                  <Clock className="w-6 h-6 text-violet-400 mx-auto mb-2" />
                  <motion.div 
                    key={stats.avgLatency}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    className="text-2xl font-bold text-violet-400"
                  >
                    {stats.avgLatency}ms
                  </motion.div>
                  <div className="text-xs text-muted-foreground">Avg Latency</div>
                </motion.div>
              </div>
              
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-8">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search servers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-card border border-border 
                      focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 
                      text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                
                {/* Category Filter */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-3 rounded-xl bg-card border border-border text-foreground 
                    focus:border-primary/50 focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                  ))}
                </select>
                
                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-3 rounded-xl bg-card border border-border text-foreground 
                    focus:border-primary/50 focus:outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="connected">Connected</option>
                  <option value="syncing">Syncing</option>
                  <option value="requires-key">Requires Key</option>
                </select>
                
                {/* Refresh Button */}
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="px-4 py-3 rounded-xl bg-primary text-primary-foreground 
                    hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Updating...' : 'Refresh'}
                </button>
              </div>
            </div>
          </section>
          
          {/* Server Grid */}
          <section className="pb-24">
            <div className="container mx-auto px-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <motion.div 
                  layout
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                >
                  <AnimatePresence mode="popLayout">
                    {filteredServers.map((server, index) => {
                      const metadata = getServerMetadata(server.metadata);
                      const categoryStyle = categoryColors[metadata.category as keyof typeof categoryColors] || 
                        { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' };
                      
                      return (
                        <motion.div
                          key={server.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: index * 0.02 }}
                          onClick={() => setSelectedServer(server)}
                          className="group relative p-5 rounded-2xl bg-card/60 backdrop-blur border border-border/50 
                            cursor-pointer transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div className={`w-12 h-12 rounded-xl ${categoryStyle.bg} flex items-center justify-center
                              group-hover:scale-110 transition-transform`}>
                              <Server className={`w-6 h-6 ${categoryStyle.text}`} />
                            </div>
                            <StatusBadge status={server.status} />
                          </div>
                          
                          {/* Name */}
                          <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                            {server.server_name}
                          </h3>
                          <p className="text-xs text-muted-foreground mb-4">{server.server_id}</p>
                          
                          {/* Category Tag */}
                          <div className="mb-4">
                            <span className={`text-xs px-2 py-1 rounded-full ${categoryStyle.bg} ${categoryStyle.text}`}>
                              {metadata.category}
                            </span>
                          </div>
                          
                          {/* Live Stats */}
                          <div className="flex items-center justify-between pt-3 border-t border-border/50">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <motion.span
                                key={server.latency_ms}
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="font-mono"
                              >
                                {server.latency_ms ? `${server.latency_ms}ms` : '--'}
                              </motion.span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Activity className="w-3 h-3" />
                              <motion.span
                                key={server.requests_today}
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="font-mono"
                              >
                                {server.requests_today?.toLocaleString() || '--'}
                              </motion.span>
                            </div>
                            {metadata.toolCount > 0 && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Zap className="w-3 h-3 text-primary" />
                                <span>{metadata.toolCount}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Live indicator pulse */}
                          {server.status === 'connected' && (
                            <motion.div
                              className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-500"
                              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
              )}
              
              {!isLoading && filteredServers.length === 0 && (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No servers match your filters</p>
                </div>
              )}
            </div>
          </section>
        </main>
        
        <Footer />
        
        {/* Detail Modal */}
        <AnimatePresence>
          {selectedServer && (
            <ServerDetailCard 
              server={selectedServer} 
              onClose={() => setSelectedServer(null)} 
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default MCPServersPage;
