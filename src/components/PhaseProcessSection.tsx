import { motion } from 'framer-motion';
import { 
  Search, Palette, Code, FileText, Megaphone, 
  Check, ChevronRight, Users, Sparkles, Globe
} from 'lucide-react';

const phases = [
  {
    number: 1,
    name: 'Research',
    icon: Search,
    description: 'Market analysis, competitor research, trend identification',
    deliverables: ['Market Analysis Report', 'Competitor Breakdown', 'Target Audience Profile'],
    team: 'Research Division',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    number: 2,
    name: 'Branding',
    icon: Palette,
    description: 'Logo, colors, typography, brand voice & identity',
    deliverables: ['Logo Variations', 'Brand Guidelines', 'Color Palette', 'Typography System'],
    team: 'Brand & Design Division',
    color: 'from-purple-500 to-pink-500',
  },
  {
    number: 3,
    name: 'Development',
    icon: Code,
    description: 'Modern React website with hosting & payments',
    deliverables: ['Live Website', 'Hosting Setup', 'Domain Config', 'Stripe Integration'],
    team: 'Development Division',
    features: ['React + TypeScript', '21st.dev Components', 'Shadcn/UI', 'Vercel/Cloudflare'],
    color: 'from-emerald-500 to-teal-500',
  },
  {
    number: 4,
    name: 'Content',
    icon: FileText,
    description: 'SEO copy, blog posts, social content, email sequences',
    deliverables: ['Website Copy', 'Blog Articles', 'Social Posts', 'Email Templates'],
    team: 'Content Division',
    color: 'from-orange-500 to-amber-500',
  },
  {
    number: 5,
    name: 'Marketing',
    icon: Megaphone,
    description: 'Launch campaigns, ads, influencer outreach',
    deliverables: ['Launch Strategy', 'Ad Creatives', 'Influencer List', 'Campaign Schedule'],
    team: 'Marketing Division',
    color: 'from-rose-500 to-red-500',
  },
];

const PhaseCard = ({ phase, index }: { phase: typeof phases[0]; index: number }) => {
  const Icon = phase.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="relative group"
    >
      {/* Connection line */}
      {index < phases.length - 1 && (
        <div className="hidden lg:block absolute top-1/2 -right-4 w-8 z-0">
          <ChevronRight className="w-6 h-6 text-muted-foreground/30" />
        </div>
      )}
      
      <motion.div
        whileHover={{ y: -8, scale: 1.02 }}
        className="relative p-6 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/50 
          hover:border-primary/30 transition-all duration-300 h-full"
      >
        {/* Phase number badge */}
        <div className={`absolute -top-3 -left-3 w-10 h-10 rounded-xl bg-gradient-to-br ${phase.color} 
          flex items-center justify-center text-white font-bold shadow-lg`}>
          {phase.number}
        </div>
        
        {/* Icon */}
        <div className="flex items-center gap-3 mb-4 mt-2">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${phase.color} p-0.5`}>
            <div className="w-full h-full rounded-xl bg-background flex items-center justify-center">
              <Icon className="w-6 h-6 text-foreground" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">{phase.name}</h3>
            <p className="text-xs text-muted-foreground">{phase.team}</p>
          </div>
        </div>
        
        {/* Description */}
        <p className="text-sm text-muted-foreground mb-4">{phase.description}</p>
        
        {/* Deliverables */}
        <div className="space-y-2">
          {phase.deliverables.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <Check className="w-3 h-3 text-primary" />
              <span className="text-foreground/80">{item}</span>
            </div>
          ))}
        </div>
        
        {/* Tech stack for dev phase */}
        {phase.features && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex flex-wrap gap-2">
              {phase.features.map((feat, i) => (
                <span key={i} className="px-2 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-mono">
                  {feat}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Approval badges */}
        <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-3">
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px]">
            <Sparkles className="w-3 h-3" />
            <span>CEO Review</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[10px]">
            <Users className="w-3 h-3" />
            <span>User Approval</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export const PhaseProcessSection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/20 to-background" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/20 mb-6">
            <Globe className="w-4 h-4 text-primary" />
            <span className="text-sm font-mono text-primary">5-PHASE BUSINESS MACHINE</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="text-foreground">From Idea to </span>
            <span className="text-gradient">Revenue</span>
            <span className="text-foreground"> in 5 Phases</span>
          </h2>
          
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Every business goes through a proven 5-phase creation process. 
            Each phase requires dual approval from your AI CEO and you before progressing.
          </p>
        </motion.div>
        
        {/* Phase cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-4">
          {phases.map((phase, index) => (
            <PhaseCard key={phase.number} phase={phase} index={index} />
          ))}
        </div>
        
        {/* Bottom highlight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-4 px-6 py-3 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm text-muted-foreground">Human-in-the-Loop</span>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">2-Tier Approvals</span>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-muted-foreground">Real Deliverables</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
