import { motion } from 'framer-motion';
import { Search, Palette, Code, PenTool, Megaphone, Phone, Settings } from 'lucide-react';
import { useExperienceMode } from '@/contexts/ExperienceModeContext';
import { TeamCard } from './TeamCard';
import { ALL_AGENTS } from '@/lib/all-agents';

const teams = [
  {
    name: 'Research Team',
    description: 'Finds opportunities & analyzes markets',
    division: 'research',
    icon: <Search className="w-5 h-5" />,
  },
  {
    name: 'Brand & Design Team',
    description: 'Creates your visual identity',
    division: 'marketing',
    icon: <Palette className="w-5 h-5" />,
    filterFn: (agent: typeof ALL_AGENTS[0]) => 
      ['agent-6', 'agent-8', 'agent-9'].includes(agent.id),
  },
  {
    name: 'Development Team',
    description: 'Builds your products',
    division: 'development',
    icon: <Code className="w-5 h-5" />,
  },
  {
    name: 'Content Team',
    description: 'Writes your story',
    division: 'marketing',
    icon: <PenTool className="w-5 h-5" />,
    filterFn: (agent: typeof ALL_AGENTS[0]) => 
      ['agent-7'].includes(agent.id),
  },
  {
    name: 'Marketing Team',
    description: 'Spreads the word',
    division: 'marketing',
    icon: <Megaphone className="w-5 h-5" />,
    filterFn: (agent: typeof ALL_AGENTS[0]) => 
      ['agent-10', 'agent-11', 'agent-12', 'agent-23'].includes(agent.id),
  },
  {
    name: 'Sales Team',
    description: 'Closes deals',
    division: 'sales',
    icon: <Phone className="w-5 h-5" />,
  },
  {
    name: 'Operations Team',
    description: 'Keeps things running',
    division: 'operations',
    icon: <Settings className="w-5 h-5" />,
  },
];

export const MeetYourTeam = () => {
  const { isBeginner } = useExperienceMode();

  if (!isBeginner) return null;

  const getAgentCount = (division: string) => {
    return ALL_AGENTS.filter(a => a.division === division).length;
  };

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Meet Your AI Team</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            25 specialized AI team members organized into 7 expert teams, all working together on your business.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {teams.map((team, index) => (
            <motion.div
              key={team.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <TeamCard
                teamName={team.name}
                description={team.description}
                division={team.division}
                icon={team.icon}
                agentCount={getAgentCount(team.division)}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
