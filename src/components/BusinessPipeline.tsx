import { motion } from 'framer-motion';
import { businesses, Business, agents } from '@/lib/agents-data';
import { TrendingUp, Clock, Users, DollarSign } from 'lucide-react';

const stageColors = {
  research: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-500' },
  building: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-500' },
  marketing: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-500' },
  launching: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-500' },
  scaling: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-500' },
  'exit-ready': { bg: 'bg-primary/10', border: 'border-primary/30', text: 'text-primary' },
};

const stageLabels = {
  research: 'Research',
  building: 'Building',
  marketing: 'Marketing',
  launching: 'Launching',
  scaling: 'Scaling',
  'exit-ready': 'Exit Ready',
};

const BusinessCard = ({ business, index }: { business: Business; index: number }) => {
  const style = stageColors[business.stage];
  const assignedAgentData = business.assignedAgents.map(id => agents.find(a => a.id === id)).filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -5, scale: 1.02 }}
      className={`p-5 rounded-xl border ${style.border} ${style.bg} cursor-pointer transition-all duration-300 hover:shadow-cyber`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="font-cyber text-lg font-semibold text-foreground">{business.name}</h4>
          <span className="text-xs font-mono text-muted-foreground">{business.industry}</span>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-mono ${style.text} ${style.bg} border ${style.border}`}>
          {stageLabels[business.stage]}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">Progress</span>
          <span className={style.text}>{business.progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-background/50 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${style.text.replace('text-', 'bg-')}`}
            initial={{ width: 0 }}
            whileInView={{ width: `${business.progress}%` }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2 + index * 0.1 }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-green-500" />
          <div>
            <div className="text-sm font-mono text-foreground">${business.revenue.toLocaleString()}</div>
            <div className="text-[10px] text-muted-foreground">Revenue</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <div>
            <div className="text-sm font-mono text-foreground">{business.daysInStage}d</div>
            <div className="text-[10px] text-muted-foreground">In Stage</div>
          </div>
        </div>
      </div>

      {/* Assigned agents */}
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-muted-foreground" />
        <div className="flex -space-x-2">
          {assignedAgentData.map((agent, i) => (
            <div
              key={i}
              className="w-7 h-7 rounded-full bg-card border-2 border-background flex items-center justify-center text-sm"
              title={agent?.name}
            >
              {agent?.icon}
            </div>
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-1">
          {business.assignedAgents.length} agents
        </span>
      </div>
    </motion.div>
  );
};

export const BusinessPipeline = () => {
  const stages: Business['stage'][] = ['research', 'building', 'marketing', 'launching', 'scaling', 'exit-ready'];
  
  const businessesByStage = stages.map(stage => ({
    stage,
    businesses: businesses.filter(b => b.stage === stage),
  }));

  const totalRevenue = businesses.reduce((sum, b) => sum + b.revenue, 0);
  const avgProgress = Math.round(businesses.reduce((sum, b) => sum + b.progress, 0) / businesses.length);

  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background effect */}
      <div className="absolute inset-0 matrix-bg opacity-10" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-cyber text-3xl md:text-4xl font-bold mb-4">
            <span className="text-gradient">BUSINESS PIPELINE</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            AI-powered business creation factory. From market research to exit-ready in weeks, not years.
          </p>

          {/* Pipeline Stats */}
          <div className="flex flex-wrap justify-center gap-6">
            <div className="px-6 py-3 rounded-xl bg-card border border-border">
              <div className="text-2xl font-cyber text-primary">{businesses.length}</div>
              <div className="text-xs font-mono text-muted-foreground">Active Businesses</div>
            </div>
            <div className="px-6 py-3 rounded-xl bg-card border border-border">
              <div className="text-2xl font-cyber text-green-500">${totalRevenue.toLocaleString()}</div>
              <div className="text-xs font-mono text-muted-foreground">Total Revenue</div>
            </div>
            <div className="px-6 py-3 rounded-xl bg-card border border-border">
              <div className="text-2xl font-cyber text-cyber-cyan">{avgProgress}%</div>
              <div className="text-xs font-mono text-muted-foreground">Avg Progress</div>
            </div>
          </div>
        </motion.div>

        {/* Pipeline Kanban */}
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {businessesByStage.map(({ stage, businesses: stageBiz }, stageIndex) => {
              const style = stageColors[stage];
              return (
                <motion.div
                  key={stage}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: stageIndex * 0.1 }}
                  className="w-[300px] flex-shrink-0"
                >
                  {/* Stage header */}
                  <div className={`p-3 rounded-t-xl border ${style.border} ${style.bg} flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <TrendingUp className={`w-4 h-4 ${style.text}`} />
                      <span className={`font-cyber text-sm ${style.text}`}>
                        {stageLabels[stage]}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${style.text} bg-background/50`}>
                      {stageBiz.length}
                    </span>
                  </div>

                  {/* Business cards */}
                  <div className="p-2 rounded-b-xl bg-card/50 border border-t-0 border-border min-h-[200px] space-y-3">
                    {stageBiz.length > 0 ? (
                      stageBiz.map((business, index) => (
                        <BusinessCard key={business.id} business={business} index={index} />
                      ))
                    ) : (
                      <div className="h-full flex items-center justify-center p-8 text-center">
                        <span className="text-sm text-muted-foreground font-mono">
                          No businesses in this stage
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Scroll hint for mobile */}
        <div className="text-center mt-4 lg:hidden">
          <span className="text-xs text-muted-foreground font-mono">← Scroll to see all stages →</span>
        </div>
      </div>
    </section>
  );
};
