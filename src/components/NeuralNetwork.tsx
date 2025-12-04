import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { agents, divisionColors, Division } from '@/lib/agents-data';

// CSS-based Neural Network visualization
const NetworkVisualization = () => {
  const nodes = useMemo(() => {
    return agents.map((agent, i) => {
      // Position nodes in a circular pattern
      const angle = (i / agents.length) * Math.PI * 2;
      const radius = 40;
      const x = 50 + radius * Math.cos(angle);
      const y = 50 + radius * Math.sin(angle);
      return {
        x,
        y,
        color: divisionColors[agent.division as Division],
        agent,
      };
    });
  }, []);

  // Create connections
  const connections = useMemo(() => {
    const conns: { x1: number; y1: number; x2: number; y2: number; color: string }[] = [];
    
    nodes.forEach((node, i) => {
      // Connect to nodes in same division
      nodes.forEach((otherNode, j) => {
        if (i < j && node.agent.division === otherNode.agent.division) {
          conns.push({
            x1: node.x,
            y1: node.y,
            x2: otherNode.x,
            y2: otherNode.y,
            color: node.color,
          });
        }
      });
      
      // Connect some to center
      if (i % 4 === 0) {
        conns.push({
          x1: node.x,
          y1: node.y,
          x2: 50,
          y2: 50,
          color: '#00E5A0',
        });
      }
    });
    
    return conns;
  }, [nodes]);

  return (
    <div className="relative w-full h-full">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Connections */}
        {connections.map((conn, i) => (
          <motion.line
            key={`conn-${i}`}
            x1={conn.x1}
            y1={conn.y1}
            x2={conn.x2}
            y2={conn.y2}
            stroke={conn.color}
            strokeWidth="0.15"
            strokeOpacity="0.3"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1, strokeOpacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.05 }}
          />
        ))}

        {/* Center node */}
        <motion.circle
          cx="50"
          cy="50"
          r="3"
          fill="#00E5A0"
          animate={{ r: [3, 3.5, 3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.circle
          cx="50"
          cy="50"
          r="5"
          fill="none"
          stroke="#00E5A0"
          strokeWidth="0.2"
          strokeOpacity="0.5"
          animate={{ r: [5, 7, 5], strokeOpacity: [0.5, 0.2, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        {/* Agent nodes */}
        {nodes.map((node, i) => (
          <motion.g key={`node-${i}`}>
            <motion.circle
              cx={node.x}
              cy={node.y}
              r="1.5"
              fill={node.color}
              animate={{ 
                r: node.agent.status === 'active' ? [1.5, 2, 1.5] : 1.5,
              }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
            />
            {node.agent.status === 'active' && (
              <motion.circle
                cx={node.x}
                cy={node.y}
                r="2.5"
                fill="none"
                stroke={node.color}
                strokeWidth="0.1"
                animate={{ r: [2.5, 4, 2.5], strokeOpacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
              />
            )}
          </motion.g>
        ))}
      </svg>

      {/* Rotating ring overlay */}
      <motion.div
        className="absolute inset-0 border border-primary/10 rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
};

export const NeuralNetwork = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/20 via-background to-background" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="text-gradient">Neural Communication</span>
            <span className="text-foreground"> Network</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Real-time visualization of agent-to-agent data flow. Each node represents an AI agent, 
            connections show active communication channels.
          </p>
        </motion.div>

        {/* Network visualization */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative h-[500px] rounded-2xl overflow-hidden border border-border bg-card/50 shadow-cyber-lg"
        >
          {/* Glow effect */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-primary/10 blur-[100px]" />
          
          <div className="absolute inset-0 p-8">
            <NetworkVisualization />
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 p-4 rounded-xl glass-morphism border border-border/50">
            <h4 className="font-mono text-xs text-muted-foreground mb-2">DIVISIONS</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(divisionColors).slice(0, 4).map(([division, color]) => (
                <div key={division} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs text-muted-foreground capitalize">
                    {division.split('-')[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats overlay */}
          <div className="absolute top-4 right-4 p-4 rounded-xl glass-morphism border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <motion.div
                className="w-2 h-2 rounded-full bg-primary"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className="font-mono text-xs text-primary">LIVE</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Active Connections:</span>
                <span className="text-foreground font-mono">142</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Data Packets/sec:</span>
                <span className="text-foreground font-mono">2.4K</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Latency:</span>
                <span className="text-green-500 font-mono">12ms</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
