import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BLOG_EMPIRE_AGENTS, BLOG_AGENT_CATEGORIES, type BlogAgent } from '@/lib/blog-empire-agents';
import { CheckCircle, X } from 'lucide-react';

interface BlogAgentTeamGridProps {
  agentStatuses?: Record<string, 'idle' | 'working' | 'alert' | 'offline'>;
}

export const BlogAgentTeamGrid = ({ agentStatuses = {} }: BlogAgentTeamGridProps) => {
  const [selectedAgent, setSelectedAgent] = useState<BlogAgent | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const agents = BLOG_EMPIRE_AGENTS;
  const filtered = filterCategory ? agents.filter(a => a.category === filterCategory) : agents;

  const getStatusColor = (agentId: string) => {
    const status = agentStatuses[agentId] || 'idle';
    switch (status) {
      case 'working': return 'bg-green-500 animate-pulse';
      case 'alert': return 'bg-yellow-500 animate-pulse';
      case 'offline': return 'bg-destructive';
      default: return 'bg-muted-foreground/40';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={filterCategory === null ? 'default' : 'outline'}
          onClick={() => setFilterCategory(null)}
          className="text-xs"
        >
          All ({agents.length})
        </Button>
        {Object.entries(BLOG_AGENT_CATEGORIES).map(([key, cat]) => {
          const count = agents.filter(a => a.category === key).length;
          if (count === 0) return null;
          return (
            <Button
              key={key}
              size="sm"
              variant={filterCategory === key ? 'default' : 'outline'}
              onClick={() => setFilterCategory(filterCategory === key ? null : key)}
              className="text-xs"
            >
              {cat.emoji} {cat.label} ({count})
            </Button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((agent, idx) => (
            <motion.div
              key={agent.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: idx * 0.03 }}
            >
              <Card
                className="cursor-pointer hover:border-primary/50 transition-all group relative overflow-hidden"
                onClick={() => setSelectedAgent(agent)}
              >
                <div className="absolute top-3 right-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(agent.id)}`} />
                </div>
                <CardContent className="p-4">
                  <div className="text-3xl mb-2">{agent.emoji}</div>
                  <h3 className="font-semibold text-sm leading-tight mb-1 group-hover:text-primary transition-colors">
                    {agent.name}
                  </h3>
                  <p className="text-xs text-muted-foreground italic mb-2">"{agent.title}"</p>
                  <Badge variant="outline" className="text-[10px]">
                    {BLOG_AGENT_CATEGORIES[agent.category]?.label}
                  </Badge>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {selectedAgent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{selectedAgent.emoji}</span>
                    <div>
                      <CardTitle className="text-lg">{selectedAgent.name}</CardTitle>
                      <p className="text-sm text-muted-foreground italic">"{selectedAgent.title}"</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedAgent(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{selectedAgent.description}</p>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Key Responsibilities</p>
                  {selectedAgent.responsibilities.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
