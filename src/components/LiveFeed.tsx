import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateActivityLogs, ActivityLog, agents } from '@/lib/agents-data';
import { Activity, CheckCircle, Clock, AlertCircle, Search, Filter } from 'lucide-react';
import { Input } from './ui/input';

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

  useEffect(() => {
    // Initial logs
    setLogs(generateActivityLogs());

    // Add new log every few seconds
    const interval = setInterval(() => {
      const agent = agents[Math.floor(Math.random() * agents.length)];
      const actions = ['Lead qualified', 'Message sent', 'Data collected', 'API call made', 'Content generated'];
      const results: Array<'success' | 'pending' | 'error'> = ['success', 'success', 'success', 'pending', 'error'];
      
      const newLog: ActivityLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date(),
        agentId: agent.id,
        agentName: agent.name,
        action: actions[Math.floor(Math.random() * actions.length)],
        result: results[Math.floor(Math.random() * results.length)],
        details: `Processing item ${Math.floor(Math.random() * 1000)}`,
      };

      setLogs(prev => [newLog, ...prev.slice(0, 49)]);
    }, 3000);

    return () => clearInterval(interval);
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
                <Filter className="w-5 h-5 text-primary" />
                SYSTEM STATUS
              </h3>
              
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-background/50 border border-border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Active Agents</span>
                    <span className="font-cyber text-2xl text-primary">18</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-border overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      whileInView={{ width: '72%' }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.2 }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-background/50 border border-border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Tasks/Hour</span>
                    <span className="font-cyber text-2xl text-cyber-cyan">847</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-border overflow-hidden">
                    <motion.div
                      className="h-full bg-cyber-cyan rounded-full"
                      initial={{ width: 0 }}
                      whileInView={{ width: '85%' }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.3 }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-background/50 border border-border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Success Rate</span>
                    <span className="font-cyber text-2xl text-green-500">94.2%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-border overflow-hidden">
                    <motion.div
                      className="h-full bg-green-500 rounded-full"
                      initial={{ width: 0 }}
                      whileInView={{ width: '94.2%' }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.4 }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-background/50 border border-border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">System Health</span>
                    <span className="font-cyber text-2xl text-primary">98%</span>
                  </div>
                  <div className="flex gap-1">
                    {[...Array(10)].map((_, i) => (
                      <motion.div
                        key={i}
                        className={`flex-1 h-3 rounded ${i < 9.8 ? 'bg-primary' : 'bg-border'}`}
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

            {/* Alert notifications */}
            <div className="rounded-2xl bg-card border border-border p-4 shadow-cyber">
              <h4 className="font-mono text-sm text-muted-foreground mb-3">RECENT ALERTS</h4>
              <div className="space-y-2">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm"
                >
                  <span className="text-yellow-500 font-mono">⚠️ High CPU usage on Research Agent</span>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm"
                >
                  <span className="text-green-500 font-mono">✓ API rate limit restored</span>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
