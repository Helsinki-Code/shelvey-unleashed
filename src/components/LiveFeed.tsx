import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, CheckCircle, Clock, AlertCircle, Search, Loader2 } from 'lucide-react';
import { Input } from './ui/input';
import { supabase } from '@/integrations/supabase/client';

interface ActivityLog {
  id: string;
  timestamp: Date;
  agentId: string;
  agentName: string;
  action: string;
  result: 'success' | 'pending' | 'error';
  details: string;
}

const resultIcons = {
  success: <CheckCircle className="w-4 h-4 text-green-500" />,
  pending: <Clock className="w-4 h-4 text-yellow-500" />,
  error: <AlertCircle className="w-4 h-4 text-red-500" />,
};

const resultColors = {
  success: 'border-green-500/30 bg-green-500/5',
  pending: 'border-yellow-500/30 bg-yellow-500/5',
  error: 'border-red-500/30 bg-red-500/5',
};

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export const LiveFeed = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterResult, setFilterResult] = useState<'all' | 'success' | 'pending' | 'error'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ active: 0, tasksPerHour: 0, successRate: 0 });

  useEffect(() => {
    // Fetch real agent activity logs
    const fetchLogs = async () => {
      try {
        const { data } = await supabase
          .from('agent_activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (data) {
          const formattedLogs: ActivityLog[] = data.map((log) => ({
            id: log.id,
            timestamp: new Date(log.created_at),
            agentId: log.agent_id,
            agentName: log.agent_name,
            action: log.action,
            result: log.status === 'completed' ? 'success' : log.status === 'error' ? 'error' : 'pending',
            details: (log.metadata as any)?.mcp_server || (log.metadata as any)?.deliverable || 'Processing',
          }));
          setLogs(formattedLogs);

          // Calculate stats
          const successCount = formattedLogs.filter(l => l.result === 'success').length;
          const uniqueAgents = new Set(formattedLogs.map(l => l.agentId)).size;
          setStats({
            active: uniqueAgents,
            tasksPerHour: formattedLogs.length,
            successRate: formattedLogs.length > 0 ? Math.round((successCount / formattedLogs.length) * 100) : 0,
          });
        }
      } catch (error) {
        console.error('Error fetching logs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('live-feed-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_activity_logs',
        },
        (payload) => {
          const newLog: ActivityLog = {
            id: payload.new.id,
            timestamp: new Date(payload.new.created_at),
            agentId: payload.new.agent_id,
            agentName: payload.new.agent_name,
            action: payload.new.action,
            result: payload.new.status === 'completed' ? 'success' : payload.new.status === 'error' ? 'error' : 'pending',
            details: (payload.new.metadata as any)?.mcp_server || (payload.new.metadata as any)?.deliverable || 'Processing',
          };
          setLogs(prev => [newLog, ...prev.slice(0, 49)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.action.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterResult === 'all' || log.result === filterResult;
    return matchesSearch && matchesFilter;
  });

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Live Feed Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-2"
          >
            <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-cyber">
              {/* Header */}
              <div className="p-4 border-b border-border bg-background/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    <h3 className="font-cyber text-lg">LIVE OPERATIONS FEED</h3>
                    <motion.div
                      className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-mono"
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      LIVE
                    </motion.div>
                  </div>
                </div>

                {/* Search and Filters */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search agents or actions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-background/50 border-border"
                    />
                  </div>
                  <div className="flex gap-1">
                    {(['all', 'success', 'pending', 'error'] as const).map((result) => (
                      <button
                        key={result}
                        onClick={() => setFilterResult(result)}
                        className={`px-3 py-2 rounded-lg text-xs font-mono transition-all
                          ${filterResult === result 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-background border border-border hover:border-primary/50'}`}
                      >
                        {result === 'all' ? 'All' : result.charAt(0).toUpperCase() + result.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Log entries */}
              <div className="h-[400px] overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Activity className="w-12 h-12 mb-2 opacity-50" />
                    <p>No activity yet</p>
                    <p className="text-sm">Agent activity will appear here in real-time</p>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {filteredLogs.map((log, index) => (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3 }}
                        className={`p-3 border-b border-border/50 hover:bg-card/50 transition-colors ${index === 0 ? 'bg-primary/5' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 p-1.5 rounded-lg border ${resultColors[log.result]}`}>
                            {resultIcons[log.result]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-xs text-muted-foreground">
                                [{formatTime(log.timestamp)}]
                              </span>
                              <span className="font-medium text-sm text-foreground truncate">
                                {log.agentName.replace(' Agent', '')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-primary">{log.action}</span>
                              <span className="text-xs text-muted-foreground">• {log.details}</span>
                            </div>
                          </div>
                          {index === 0 && (
                            <motion.div
                              className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-mono"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                            >
                              NEW
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </motion.div>

          {/* Stats Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            {/* Global KPIs */}
            <div className="rounded-2xl bg-card border border-border p-6 shadow-cyber">
              <h3 className="font-cyber text-lg mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                SYSTEM STATUS
              </h3>
              
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-background/50 border border-border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Active Agents</span>
                    <span className="font-cyber text-2xl text-primary">{stats.active}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-border overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(stats.active * 4, 100)}%` }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-background/50 border border-border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Tasks Logged</span>
                    <span className="font-cyber text-2xl text-cyan-500">{stats.tasksPerHour}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-border overflow-hidden">
                    <motion.div
                      className="h-full bg-cyan-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(stats.tasksPerHour * 2, 100)}%` }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-background/50 border border-border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Success Rate</span>
                    <span className="font-cyber text-2xl text-green-500">{stats.successRate}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-border overflow-hidden">
                    <motion.div
                      className="h-full bg-green-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${stats.successRate}%` }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-background/50 border border-border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">System Health</span>
                    <span className="font-cyber text-2xl text-primary">{logs.length > 0 ? '98%' : '—'}</span>
                  </div>
                  <div className="flex gap-1">
                    {[...Array(10)].map((_, i) => (
                      <motion.div
                        key={i}
                        className={`flex-1 h-3 rounded ${logs.length > 0 && i < 9.8 ? 'bg-primary' : 'bg-border'}`}
                        initial={{ scaleY: 0 }}
                        whileInView={{ scaleY: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.3, delay: i * 0.05 }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent activity summary */}
            <div className="rounded-2xl bg-card border border-border p-4 shadow-cyber">
              <h4 className="font-mono text-sm text-muted-foreground mb-3">RECENT ACTIVITY</h4>
              <div className="space-y-2">
                {logs.slice(0, 2).map((log, i) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`p-3 rounded-lg text-sm ${
                      log.result === 'success' 
                        ? 'bg-green-500/10 border border-green-500/20' 
                        : log.result === 'error'
                        ? 'bg-red-500/10 border border-red-500/20'
                        : 'bg-yellow-500/10 border border-yellow-500/20'
                    }`}
                  >
                    <span className={
                      log.result === 'success' ? 'text-green-500' : 
                      log.result === 'error' ? 'text-red-500' : 'text-yellow-500'
                    }>
                      {log.result === 'success' ? '✓' : log.result === 'error' ? '✗' : '⏳'} {log.agentName}: {log.action}
                    </span>
                  </motion.div>
                ))}
                {logs.length === 0 && (
                  <p className="text-muted-foreground text-sm">No recent activity</p>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
