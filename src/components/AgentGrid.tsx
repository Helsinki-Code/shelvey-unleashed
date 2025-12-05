import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { agents, Agent, AgentStatus, divisionNames } from '@/lib/agents-data';
import { mcpServers, agentMCPConnections } from '@/lib/mcp-servers';
import { X, Mic, Activity, Zap, Server, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';

const statusConfig: Record<AgentStatus, { color: string; bg: string; label: string }> = {
  active: { color: 'text-emerald-400', bg: 'bg-emerald-500', label: 'Active' },
  processing: { color: 'text-amber-400', bg: 'bg-amber-500', label: 'Processing' },
  meeting: { color: 'text-rose-400', bg: 'bg-rose-500', label: 'In Meeting' },
  idle: { color: 'text-muted-foreground', bg: 'bg-muted-foreground', label: 'Idle' },
};

const AgentCard = ({ agent, onClick }: { agent: Agent; onClick: () => void }) => {
  const status = statusConfig[agent.status];
  const connectedServers = agentMCPConnections[agent.id] || [];
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -6 }}
      onClick={onClick}
      className="group relative p-5 rounded-2xl bg-card/60 backdrop-blur border border-border/50 
        cursor-pointer transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
    >
      {/* Active glow */}
      {agent.status === 'active' && (
        <div className="absolute inset-0 rounded-2xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 
            flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
            {agent.icon}
          </div>
          
          <div className="flex items-center gap-2">
            <motion.div
              className={`w-2 h-2 rounded-full ${status.bg}`}
              animate={agent.status === 'active' ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className={`text-xs font-mono ${status.color}`}>{status.label}</span>
          </div>
        </div>
        
        {/* Name and role */}
        <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
          {agent.name.replace(' Agent', '')}
        </h3>
        <p className="text-xs text-muted-foreground mb-4">{agent.role}</p>
        
        {/* Current task - animated ticker */}
        <div className="relative h-7 overflow-hidden rounded-lg bg-muted/50 mb-4">
          <motion.div
            className="absolute whitespace-nowrap text-xs font-mono text-primary/70 py-1.5 px-3"
            animate={{ x: ['0%', '-50%'] }}
            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          >
            {agent.currentTask} • {agent.currentTask}
          </motion.div>
        </div>
        
        {/* Connected MCP servers with live status */}
        <div className="flex items-center gap-1.5 mb-4">
          <Server className="w-3 h-3 text-muted-foreground" />
          <div className="flex gap-1.5">
            {connectedServers.slice(0, 3).map(serverId => {
              const server = mcpServers.find(s => s.id === serverId);
              if (!server) return null;
              const isConnected = server.status === 'connected';
              const isSyncing = server.status === 'syncing';
              return (
                <div 
                  key={serverId} 
                  className="relative flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/50"
                  title={`${server.name} - ${server.status}`}
                >
                  <span className="text-sm">{server.icon}</span>
                  <motion.div
                    className={`w-1.5 h-1.5 rounded-full ${
                      isConnected ? 'bg-emerald-500' : isSyncing ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    animate={isConnected ? { scale: [1, 1.3, 1] } : isSyncing ? { opacity: [1, 0.5, 1] } : {}}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                </div>
              );
            })}
          </div>
          {connectedServers.length > 3 && (
            <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
              +{connectedServers.length - 3}
            </span>
          )}
        </div>
        
        {/* Stats footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Zap className="w-3 h-3 text-primary" />
            <span>{agent.tasksPerHour}/hr</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Activity className="w-3 h-3 text-emerald-400" />
            <span>{agent.successRate}%</span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 
            group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </motion.div>
  );
};

const AgentDetailModal = ({ agent, onClose }: { agent: Agent; onClose: () => void }) => {
  const status = statusConfig[agent.status];
  const connectedServers = agentMCPConnections[agent.id] || [];
  
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
        className="relative w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="relative p-6 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-background/50 backdrop-blur 
              flex items-center justify-center hover:bg-background/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-background/50 backdrop-blur flex items-center justify-center text-4xl">
              {agent.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{agent.name}</h2>
              <p className="text-muted-foreground">{agent.role}</p>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
            <div className="flex items-center gap-3">
              <motion.div
                className={`w-3 h-3 rounded-full ${status.bg}`}
                animate={agent.status === 'active' ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className={`font-medium ${status.color}`}>{status.label}</span>
            </div>
            <span className="text-sm text-muted-foreground">{divisionNames[agent.division]}</span>
          </div>
          
          {/* Current Task */}
          <div>
            <h4 className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wider">Current Task</h4>
            <p className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-foreground">
              {agent.currentTask}
            </p>
          </div>
          
          {/* Connected MCP Servers with live status */}
          <div>
            <h4 className="text-xs font-mono text-muted-foreground mb-3 uppercase tracking-wider">
              Connected MCP Servers
            </h4>
            <div className="flex flex-wrap gap-2">
              {connectedServers.map(serverId => {
                const server = mcpServers.find(s => s.id === serverId);
                if (!server) return null;
                const isConnected = server.status === 'connected';
                const isSyncing = server.status === 'syncing';
                return (
                  <div 
                    key={serverId} 
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                      isConnected ? 'bg-emerald-500/5 border-emerald-500/30' :
                      isSyncing ? 'bg-amber-500/5 border-amber-500/30' :
                      'bg-rose-500/5 border-rose-500/30'
                    }`}
                  >
                    <span className="text-lg">{server.icon}</span>
                    <span className="text-sm">{server.name}</span>
                    <motion.span 
                      className={`text-xs ${
                        isConnected ? 'text-emerald-400' : isSyncing ? 'text-amber-400' : 'text-rose-400'
                      }`}
                      animate={isConnected || isSyncing ? { opacity: [1, 0.5, 1] } : {}}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      ●
                    </motion.span>
                    {server.latency && (
                      <span className="text-[10px] text-muted-foreground font-mono">{server.latency}ms</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Performance */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-muted/50 text-center">
              <div className="text-3xl font-bold text-primary">{agent.tasksPerHour}</div>
              <div className="text-xs text-muted-foreground mt-1">Tasks/Hour</div>
            </div>
            <div className="p-4 rounded-xl bg-muted/50 text-center">
              <div className="text-3xl font-bold text-emerald-400">{agent.successRate}%</div>
              <div className="text-xs text-muted-foreground mt-1">Success Rate</div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1">
              <Mic className="w-4 h-4 mr-2" />
              Talk to Agent
            </Button>
            <Button className="flex-1">
              View Activity
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export const AgentGrid = () => {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [filter, setFilter] = useState<AgentStatus | 'all'>('all');
  
  const filteredAgents = filter === 'all' ? agents : agents.filter(a => a.status === filter);
  
  const statusCounts = {
    all: agents.length,
    active: agents.filter(a => a.status === 'active').length,
    processing: agents.filter(a => a.status === 'processing').length,
    meeting: agents.filter(a => a.status === 'meeting').length,
    idle: agents.filter(a => a.status === 'idle').length,
  };
  
  return (
    <section className="py-24 relative overflow-hidden" id="agents">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/10 to-background" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="text-gradient">25 AI Agents</span>
            <span className="text-foreground"> Working Now</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Each agent specializes in specific tasks and connects to real MCP servers 
            to execute operations autonomously.
          </p>
        </motion.div>
        
        {/* Filter tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {(['all', 'active', 'processing', 'meeting', 'idle'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all
                ${filter === status 
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' 
                  : 'bg-card/50 text-muted-foreground hover:text-foreground border border-border/50 hover:border-primary/30'
                }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)} ({statusCounts[status]})
            </button>
          ))}
        </div>
        
        {/* Grid */}
        <motion.div 
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5"
        >
          <AnimatePresence mode="popLayout">
            {filteredAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onClick={() => setSelectedAgent(agent)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
        
        {/* Modal */}
        <AnimatePresence>
          {selectedAgent && (
            <AgentDetailModal
              agent={selectedAgent}
              onClose={() => setSelectedAgent(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
