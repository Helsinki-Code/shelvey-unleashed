import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { agents, Agent, AgentStatus, divisionNames } from '@/lib/agents-data';
import { X, Mic, Activity, Clock, Zap } from 'lucide-react';
import { Button } from './ui/button';

const statusColors: Record<AgentStatus, string> = {
  active: 'bg-green-500',
  processing: 'bg-yellow-500',
  meeting: 'bg-red-500',
  idle: 'bg-gray-500',
};

const statusLabels: Record<AgentStatus, string> = {
  active: 'Active',
  processing: 'Processing',
  meeting: 'In Meeting',
  idle: 'Idle',
};

const AgentCard = ({ agent, onClick }: { agent: Agent; onClick: () => void }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, y: -5 }}
      onClick={onClick}
      className={`relative p-4 rounded-xl bg-card/80 border border-border/50 cursor-pointer
        hover:border-primary/50 transition-all duration-300 group overflow-hidden
        ${agent.status === 'active' ? 'shadow-cyber' : ''}`}
    >
      {/* Animated border glow for active agents */}
      {agent.status === 'active' && (
        <motion.div
          className="absolute inset-0 rounded-xl"
          animate={{ boxShadow: ['0 0 20px hsl(var(--primary) / 0.2)', '0 0 30px hsl(var(--primary) / 0.4)', '0 0 20px hsl(var(--primary) / 0.2)'] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity">
        <div className="absolute inset-0 matrix-bg" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
            {agent.icon}
          </div>
          <div className="flex items-center gap-1.5">
            <motion.div
              className={`w-2.5 h-2.5 rounded-full ${statusColors[agent.status]}`}
              animate={agent.status === 'active' ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="text-xs font-mono text-muted-foreground">{statusLabels[agent.status]}</span>
          </div>
        </div>

        {/* Name and Role */}
        <h3 className="font-cyber text-sm font-semibold text-foreground truncate mb-1">
          {agent.name.replace(' Agent', '')}
        </h3>
        <p className="text-xs text-muted-foreground font-mono mb-3">{agent.role}</p>

        {/* Current Task - scrolling */}
        <div className="relative h-6 overflow-hidden rounded bg-background/50 mb-3">
          <motion.div
            className="absolute whitespace-nowrap text-xs font-mono text-primary/80 py-1 px-2"
            animate={{ x: [0, -200] }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          >
            {agent.currentTask} • {agent.currentTask}
          </motion.div>
        </div>

        {/* Stats */}
        <div className="flex justify-between text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Zap className="w-3 h-3 text-primary" />
            <span>{agent.tasksPerHour}/hr</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Activity className="w-3 h-3 text-green-500" />
            <span>{agent.successRate}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const AgentDetailModal = ({ agent, onClose }: { agent: Agent; onClose: () => void }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-2xl bg-card border border-border shadow-cyber-lg overflow-hidden"
      >
        {/* Header with gradient */}
        <div className="relative h-32 bg-cyber-gradient p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-background/20 backdrop-blur flex items-center justify-center hover:bg-background/40 transition-colors"
          >
            <X className="w-4 h-4 text-primary-foreground" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-background/20 backdrop-blur flex items-center justify-center text-4xl">
              {agent.icon}
            </div>
            <div>
              <h2 className="font-cyber text-xl font-bold text-primary-foreground">{agent.name}</h2>
              <p className="text-primary-foreground/80 font-mono text-sm">{agent.role}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border">
            <div className="flex items-center gap-3">
              <motion.div
                className={`w-4 h-4 rounded-full ${statusColors[agent.status]}`}
                animate={agent.status === 'active' ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className="font-mono">{statusLabels[agent.status]}</span>
            </div>
            <span className="text-sm text-muted-foreground">{divisionNames[agent.division]}</span>
          </div>

          {/* Current Task */}
          <div>
            <h4 className="text-sm font-mono text-muted-foreground mb-2">CURRENT TASK</h4>
            <p className="text-foreground p-3 rounded-lg bg-primary/5 border border-primary/20">
              {agent.currentTask}
            </p>
          </div>

          {/* Performance Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-background/50 border border-border text-center">
              <div className="text-3xl font-cyber text-primary">{agent.tasksPerHour}</div>
              <div className="text-xs font-mono text-muted-foreground">TASKS/HOUR</div>
            </div>
            <div className="p-4 rounded-xl bg-background/50 border border-border text-center">
              <div className="text-3xl font-cyber text-green-500">{agent.successRate}%</div>
              <div className="text-xs font-mono text-muted-foreground">SUCCESS RATE</div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button className="flex-1 gap-2" variant="outline">
              <Mic className="w-4 h-4" />
              Talk to Agent
            </Button>
            <Button className="flex-1 gap-2">
              <Clock className="w-4 h-4" />
              View Timeline
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

  const filteredAgents = filter === 'all' 
    ? agents 
    : agents.filter(a => a.status === filter);

  const statusCounts = {
    all: agents.length,
    active: agents.filter(a => a.status === 'active').length,
    processing: agents.filter(a => a.status === 'processing').length,
    meeting: agents.filter(a => a.status === 'meeting').length,
    idle: agents.filter(a => a.status === 'idle').length,
  };

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-cyber text-3xl md:text-4xl font-bold mb-4">
            <span className="text-gradient">AGENT WORKFORCE</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            25 specialized AI agents working autonomously across 8 divisions to build, market, and scale businesses.
          </p>
        </motion.div>

        {/* Filter tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {(['all', 'active', 'processing', 'meeting', 'idle'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-full font-mono text-sm transition-all
                ${filter === status 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-card border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'}`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)} ({statusCounts[status]})
            </button>
          ))}
        </div>

        {/* Agent Grid */}
        <motion.div 
          layout
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
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

        {/* Detail Modal */}
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
