import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Users } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ALL_AGENTS, DIVISION_COLORS } from '@/lib/all-agents';

interface TeamCardProps {
  teamName: string;
  description: string;
  division: string;
  icon: React.ReactNode;
  agentCount: number;
  isActive?: boolean;
}

export const TeamCard = ({ teamName, description, division, icon, agentCount, isActive = false }: TeamCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const teamAgents = ALL_AGENTS.filter(agent => agent.division === division);
  const gradientClass = DIVISION_COLORS[division] || 'from-primary to-accent';

  return (
    <Card 
      className={`overflow-hidden transition-all cursor-pointer hover:shadow-lg ${
        isActive ? 'border-primary/50 shadow-primary/20' : ''
      }`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl bg-gradient-to-br ${gradientClass} text-white`}>
              {icon}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{teamName}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isActive && (
              <Badge className="bg-primary/10 text-primary border-primary/20">
                Active
              </Badge>
            )}
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              {agentCount}
            </div>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            </motion.div>
          </div>
        </div>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-3">Team Members</p>
              <div className="grid grid-cols-1 gap-2">
                {teamAgents.map((agent) => (
                  <div 
                    key={agent.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className={`p-1.5 rounded-lg bg-gradient-to-br ${gradientClass}`}>
                      <agent.icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{agent.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{agent.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};
