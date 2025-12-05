import { motion, useInView } from 'framer-motion';
import { ArrowRight, Zap, Twitter, Instagram, Github, CreditCard, Mail, Mic, Bot, Globe, Palette, Calendar, MessageSquare, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useExperienceMode } from '@/contexts/ExperienceModeContext';
import { useRef, useState } from 'react';

const appCategories = [
  {
    category: 'Social Media',
    icon: Twitter,
    color: 'from-blue-400 to-blue-600',
    apps: ['Twitter', 'Instagram', 'LinkedIn', 'TikTok', 'Facebook'],
    description: 'Post, engage, and grow your audience',
  },
  {
    category: 'Design',
    icon: Palette,
    color: 'from-pink-400 to-rose-600',
    apps: ['Canva', 'Fal AI', '21st.dev', 'Figma'],
    description: 'Create stunning visuals and graphics',
  },
  {
    category: 'Payments',
    icon: CreditCard,
    color: 'from-green-400 to-emerald-600',
    apps: ['Stripe', 'Shopify', 'PayPal'],
    description: 'Accept payments worldwide',
  },
  {
    category: 'Communication',
    icon: Mail,
    color: 'from-yellow-400 to-orange-600',
    apps: ['Gmail', 'WhatsApp', 'Twilio', 'Slack'],
    description: 'Stay connected with customers',
  },
  {
    category: 'Voice AI',
    icon: Mic,
    color: 'from-purple-400 to-violet-600',
    apps: ['Phone Calls', 'Voice AI', 'Vapi'],
    description: 'Automated voice conversations',
  },
  {
    category: 'AI Models',
    icon: Bot,
    color: 'from-cyan-400 to-blue-600',
    apps: ['GPT-5', 'Claude', 'Gemini', 'Perplexity'],
    description: 'Powered by the best AI',
  },
];

// Floating app icons in the background
const FloatingAppIcons = () => {
  const icons = [Twitter, Instagram, Github, CreditCard, Mail, Mic, Bot, Globe, Palette, Calendar, MessageSquare, TrendingUp];
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {icons.map((Icon, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${5 + (i % 6) * 16}%`,
            top: `${10 + Math.floor(i / 6) * 50}%`,
          }}
          animate={{
            y: [0, -20, 0],
            rotate: [0, 10, -10, 0],
            opacity: [0.05, 0.15, 0.05],
          }}
          transition={{
            duration: 6 + i * 0.5,
            repeat: Infinity,
            delay: i * 0.3,
          }}
        >
          <Icon className="w-8 h-8 text-primary" />
        </motion.div>
      ))}
    </div>
  );
};

// 3D rotating app card
const AppCard = ({ category, index, isInView }: { 
  category: typeof appCategories[0]; 
  index: number; 
  isInView: boolean 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = category.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, rotateX: -20 }}
      animate={isInView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative group"
    >
      {/* Glow effect */}
      <motion.div
        className={`absolute -inset-2 bg-gradient-to-r ${category.color} rounded-2xl opacity-0 blur-xl transition-opacity duration-500`}
        animate={{ opacity: isHovered ? 0.3 : 0 }}
      />
      
      {/* Card */}
      <motion.div
        className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-6 h-full overflow-hidden"
        animate={{
          rotateY: isHovered ? 5 : 0,
          scale: isHovered ? 1.02 : 1,
        }}
        transition={{ duration: 0.3 }}
      >
        {/* Background gradient */}
        <motion.div
          className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-0`}
          animate={{ opacity: isHovered ? 0.05 : 0 }}
          transition={{ duration: 0.3 }}
        />

        {/* Icon */}
        <motion.div
          className={`relative w-14 h-14 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center mb-4 shadow-lg`}
          animate={{
            rotate: isHovered ? [0, -10, 10, 0] : 0,
            scale: isHovered ? 1.1 : 1,
          }}
          transition={{ duration: 0.5 }}
        >
          <Icon className="w-7 h-7 text-white" />
        </motion.div>

        {/* Content */}
        <h3 className="text-lg font-bold mb-1 text-foreground">{category.category}</h3>
        <p className="text-sm text-muted-foreground mb-4">{category.description}</p>

        {/* App pills */}
        <div className="flex flex-wrap gap-1.5">
          {category.apps.slice(0, 3).map((app, i) => (
            <motion.span
              key={app}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: index * 0.1 + i * 0.05 + 0.3 }}
              className="px-2 py-0.5 bg-muted text-xs rounded-full text-muted-foreground"
            >
              {app}
            </motion.span>
          ))}
          {category.apps.length > 3 && (
            <span className="px-2 py-0.5 bg-primary/10 text-xs rounded-full text-primary font-medium">
              +{category.apps.length - 3}
            </span>
          )}
        </div>

        {/* Decorative line */}
        <motion.div
          className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${category.color}`}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
      </motion.div>
    </motion.div>
  );
};

// Animated counter
const AnimatedCounter = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  
  return (
    <motion.span
      ref={ref}
      className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
    >
      {isInView ? (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {value}{suffix}
        </motion.span>
      ) : '0'}
    </motion.span>
  );
};

export const ConnectedApps = () => {
  const { isBeginner } = useExperienceMode();
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  if (!isBeginner) return null;

  return (
    <section ref={containerRef} className="relative py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-muted/50 to-muted/30" />
      <FloatingAppIcons />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-full" style={{
          backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header with stats */}
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
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Powerful Integrations</span>
          </motion.div>

          {/* Big stat */}
          <div className="mb-6">
            <AnimatedCounter value={45} suffix="+" />
          </div>
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Apps Your Team{' '}
            </span>
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Can Use
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your AI team connects to all the tools you need automatically
          </p>
        </motion.div>

        {/* App cards grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
          {appCategories.map((category, index) => (
            <AppCard key={category.category} category={category} index={index} isInView={isInView} />
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.8 }}
          className="text-center"
        >
          <Link to="/mcp">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button size="lg" variant="outline" className="gap-2 rounded-full border-primary/20 hover:border-primary/50 hover:bg-primary/5">
                See All Integrations
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ArrowRight className="w-4 h-4" />
                </motion.span>
              </Button>
            </motion.div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};
