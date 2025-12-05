import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Search, Palette, Code, PenTool, Megaphone, Phone, Settings, Users, ChevronRight } from 'lucide-react';
import { useExperienceMode } from '@/contexts/ExperienceModeContext';
import { useRef, useState } from 'react';

const teams = [
  {
    name: 'Research',
    fullName: 'Research Team',
    description: 'Finds opportunities',
    icon: Search,
    color: 'from-blue-500 to-cyan-500',
    members: 3,
    tasks: ['Market Analysis', 'Competitor Research', 'Trend Prediction'],
  },
  {
    name: 'Design',
    fullName: 'Brand & Design Team',
    description: 'Creates your identity',
    icon: Palette,
    color: 'from-pink-500 to-rose-500',
    members: 3,
    tasks: ['Logo Design', 'Brand Guidelines', 'Visual Assets'],
  },
  {
    name: 'Development',
    fullName: 'Development Team',
    description: 'Builds your products',
    icon: Code,
    color: 'from-green-500 to-emerald-500',
    members: 3,
    tasks: ['Website Building', 'App Development', 'QA Testing'],
  },
  {
    name: 'Content',
    fullName: 'Content Team',
    description: 'Writes your story',
    icon: PenTool,
    color: 'from-yellow-500 to-orange-500',
    members: 3,
    tasks: ['Copywriting', 'Blog Posts', 'Social Content'],
  },
  {
    name: 'Marketing',
    fullName: 'Marketing Team',
    description: 'Spreads the word',
    icon: Megaphone,
    color: 'from-purple-500 to-violet-500',
    members: 4,
    tasks: ['SEO', 'Paid Ads', 'Social Media'],
  },
  {
    name: 'Sales',
    fullName: 'Sales Team',
    description: 'Closes deals',
    icon: Phone,
    color: 'from-red-500 to-pink-500',
    members: 3,
    tasks: ['Lead Generation', 'Sales Calls', 'Customer Success'],
  },
  {
    name: 'Operations',
    fullName: 'Operations Team',
    description: 'Keeps things running',
    icon: Settings,
    color: 'from-slate-500 to-zinc-500',
    members: 6,
    tasks: ['Analytics', 'Finance', 'Legal Compliance'],
  },
];

// Team type definition
type Team = {
  name: string;
  fullName: string;
  description: string;
  icon: typeof Search;
  color: string;
  members: number;
  tasks: string[];
};

// Hexagon team card
const TeamHexagon = ({ team, index, isInView, isSelected, onSelect }: {
  team: Team;
  index: number;
  isInView: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const Icon = team.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, rotate: -30 }}
      animate={isInView ? { opacity: 1, scale: 1, rotate: 0 } : {}}
      transition={{ delay: index * 0.1, duration: 0.5, type: "spring" }}
      whileHover={{ scale: 1.1, zIndex: 10 }}
      whileTap={{ scale: 0.95 }}
      onClick={onSelect}
      className={`relative cursor-pointer group ${isSelected ? 'z-20' : 'z-0'}`}
    >
      {/* Glow */}
      <motion.div
        className={`absolute inset-0 bg-gradient-to-br ${team.color} rounded-2xl blur-xl`}
        animate={{ opacity: isSelected ? 0.4 : 0 }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Card */}
      <motion.div
        className={`relative w-28 h-28 md:w-36 md:h-36 rounded-2xl bg-card/90 backdrop-blur border-2 flex flex-col items-center justify-center transition-colors ${
          isSelected ? 'border-primary shadow-lg' : 'border-border/50 hover:border-primary/50'
        }`}
        animate={{ 
          rotateY: isSelected ? [0, 10, 0] : 0,
        }}
        transition={{ duration: 0.5 }}
      >
        {/* Icon */}
        <motion.div
          className={`w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br ${team.color} flex items-center justify-center mb-2 shadow-lg`}
          animate={isSelected ? { rotate: [0, -10, 10, 0] } : {}}
          transition={{ duration: 0.5 }}
        >
          <Icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
        </motion.div>
        
        {/* Name */}
        <span className="text-sm md:text-base font-semibold text-foreground">{team.name}</span>
        
        {/* Member count */}
        <span className="text-xs text-muted-foreground">{team.members} members</span>

        {/* Selection indicator */}
        <motion.div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary"
          initial={{ scale: 0 }}
          animate={{ scale: isSelected ? 1 : 0 }}
          transition={{ type: "spring" }}
        />
      </motion.div>
    </motion.div>
  );
};

// Team detail panel
const TeamDetailPanel = ({ team }: { team: Team | null }) => {
  if (!team) return null;
  const Icon = team.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-2xl"
    >
      <div className="flex items-start gap-6">
        {/* Icon */}
        <motion.div
          className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${team.color} flex items-center justify-center shadow-lg shrink-0`}
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Icon className="w-10 h-10 text-white" />
        </motion.div>
        
        {/* Content */}
        <div className="flex-1">
          <h3 className="text-2xl font-bold mb-2">{team.fullName}</h3>
          <p className="text-muted-foreground mb-4">{team.description}</p>
          
          {/* Tasks */}
          <div className="flex flex-wrap gap-2">
            {team.tasks.map((task, i) => (
              <motion.span
                key={task}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full border border-primary/20"
              >
                {task}
              </motion.span>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="text-center shrink-0">
          <div className="text-3xl font-bold text-primary">{team.members}</div>
          <div className="text-sm text-muted-foreground">AI Members</div>
        </div>
      </div>
    </motion.div>
  );
};

// Orbital visualization
const OrbitalVisualization = ({ teams, selectedIndex, onSelect }: {
  teams: Team[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true });

  return (
    <div ref={containerRef} className="relative w-full max-w-3xl mx-auto aspect-square">
      {/* Center element */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-2xl z-10"
        initial={{ scale: 0 }}
        animate={isInView ? { scale: 1 } : {}}
        transition={{ delay: 0.5, type: "spring" }}
      >
        <Users className="w-10 h-10 md:w-14 md:h-14 text-primary-foreground" />
      </motion.div>

      {/* Orbital rings */}
      {[1, 2].map((ring) => (
        <motion.div
          key={ring}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10"
          style={{
            width: `${ring * 50}%`,
            height: `${ring * 50}%`,
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.3 + ring * 0.1 }}
        />
      ))}

      {/* Team hexagons arranged in a circle */}
      <div className="absolute inset-0">
        {teams.map((team, index) => {
          const angle = (index / teams.length) * 2 * Math.PI - Math.PI / 2;
          const radius = 38; // percentage from center
          const x = 50 + radius * Math.cos(angle);
          const y = 50 + radius * Math.sin(angle);

          return (
            <div
              key={team.name}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <TeamHexagon
                team={team}
                index={index}
                isInView={isInView}
                isSelected={selectedIndex === index}
                onSelect={() => onSelect(index)}
              />
            </div>
          );
        })}
      </div>

      {/* Animated connection lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {teams.map((_, index) => {
          const angle = (index / teams.length) * 2 * Math.PI - Math.PI / 2;
          const radius = 38;
          const x = 50 + radius * Math.cos(angle);
          const y = 50 + radius * Math.sin(angle);

          return (
            <motion.line
              key={index}
              x1="50%"
              y1="50%"
              x2={`${x}%`}
              y2={`${y}%`}
              stroke={`hsl(var(--primary) / ${selectedIndex === index ? 0.5 : 0.1})`}
              strokeWidth={selectedIndex === index ? 2 : 1}
              initial={{ pathLength: 0 }}
              animate={isInView ? { pathLength: 1 } : {}}
              transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
            />
          );
        })}
      </svg>
    </div>
  );
};

export const MeetYourTeam = () => {
  const { isBeginner } = useExperienceMode();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  if (!isBeginner) return null;

  return (
    <section ref={containerRef} className="relative py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-primary/20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.5, 0.2],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 4 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={isInView ? { scale: 1 } : {}}
            transition={{ delay: 0.2, type: "spring" }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
          >
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">25 AI Specialists</span>
          </motion.div>
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Meet Your{' '}
            </span>
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              AI Team
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Click any team to learn more about what they do
          </p>
        </motion.div>

        {/* Orbital visualization */}
        <OrbitalVisualization
          teams={teams}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
        />

        {/* Selected team detail */}
        <div className="mt-12 max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            {selectedIndex !== null && (
              <TeamDetailPanel team={teams[selectedIndex]} />
            )}
          </AnimatePresence>
          
          {selectedIndex === null && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-muted-foreground flex items-center justify-center gap-2"
            >
              <ChevronRight className="w-4 h-4 animate-pulse" />
              Click a team above to see details
              <ChevronRight className="w-4 h-4 animate-pulse rotate-180" />
            </motion.p>
          )}
        </div>
      </div>
    </section>
  );
};
