import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useExperienceMode } from '@/contexts/ExperienceModeContext';
import { useRef } from 'react';

const benefits = [
  'Research the market',
  'Design your brand',
  'Build your website',
  'Create your content',
  'Market to customers',
  'Handle sales calls',
];

// Floating orbs component
const FloatingOrbs = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(6)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full"
        style={{
          width: `${150 + i * 80}px`,
          height: `${150 + i * 80}px`,
          background: `radial-gradient(circle, hsl(var(--primary) / ${0.15 - i * 0.02}) 0%, transparent 70%)`,
          left: `${10 + i * 15}%`,
          top: `${20 + (i % 3) * 20}%`,
        }}
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -40, 20, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{
          duration: 8 + i * 2,
          repeat: Infinity,
          ease: "easeInOut",
          delay: i * 0.5,
        }}
      />
    ))}
  </div>
);

// Animated grid lines
const GridLines = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
    <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="hero-grid" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 60" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.5" />
        </pattern>
        <linearGradient id="grid-fade" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="50%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <mask id="grid-mask">
          <rect width="100%" height="100%" fill="url(#grid-fade)" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="url(#hero-grid)" mask="url(#grid-mask)" />
    </svg>
  </div>
);

// Morphing blob
const MorphingBlob = () => (
  <motion.div
    className="absolute right-0 top-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-30"
    style={{
      background: 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.3) 0%, transparent 70%)',
      filter: 'blur(60px)',
    }}
    animate={{
      scale: [1, 1.2, 1.1, 1],
      rotate: [0, 10, -5, 0],
      borderRadius: ["40% 60% 70% 30% / 40% 50% 60% 50%", "70% 30% 50% 50% / 30% 30% 70% 70%", "40% 60% 70% 30% / 40% 50% 60% 50%"],
    }}
    transition={{
      duration: 12,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);

// Animated benefit item
const BenefitItem = ({ benefit, index }: { benefit: string; index: number }) => (
  <motion.div
    initial={{ opacity: 0, x: -30 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
    whileHover={{ scale: 1.05, x: 5 }}
    className="group flex items-center gap-3 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 hover:border-primary/30 hover:bg-primary/10 transition-all cursor-default"
  >
    <motion.div 
      className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center"
      whileHover={{ rotate: 360 }}
      transition={{ duration: 0.5 }}
    >
      <Sparkles className="w-3 h-3 text-primary-foreground" />
    </motion.div>
    <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">
      {benefit}
    </span>
  </motion.div>
);

// Glowing text effect
const GlowingTitle = () => (
  <div className="relative">
    {/* Glow layer */}
    <motion.h1 
      className="absolute inset-0 text-5xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent blur-2xl opacity-50"
      animate={{ opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 3, repeat: Infinity }}
    >
      Your AI Business Team
    </motion.h1>
    {/* Main text */}
    <motion.h1 
      className="relative text-5xl md:text-6xl lg:text-7xl font-bold"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
        Your{' '}
      </span>
      <span className="relative">
        <span className="bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
          AI Business
        </span>
        <motion.span
          className="absolute -inset-2 bg-primary/20 rounded-lg -z-10"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        />
      </span>
      <br />
      <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
        Team
      </span>
    </motion.h1>
  </div>
);

// Animated particles
const Particles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(20)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-1 h-1 rounded-full bg-primary/40"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
        }}
        animate={{
          y: [0, -100],
          opacity: [0, 1, 0],
        }}
        transition={{
          duration: 3 + Math.random() * 2,
          repeat: Infinity,
          delay: Math.random() * 3,
        }}
      />
    ))}
  </div>
);

export const SimplifiedHero = () => {
  const { isBeginner } = useExperienceMode();
  const containerRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });
  
  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  if (!isBeginner) return null;

  return (
    <section ref={containerRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/20" />
      <GridLines />
      <FloatingOrbs />
      <MorphingBlob />
      <Particles />
      
      <motion.div style={{ y, opacity }} className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-4 h-4 text-primary" />
            </motion.div>
            <span className="text-sm font-medium text-primary">The Future of Business Building</span>
          </motion.div>

          {/* Main title with glow */}
          <GlowingTitle />

          {/* Subtitle */}
          <motion.p 
            className="text-xl md:text-2xl text-muted-foreground mt-6 mb-10 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            Tell us your idea, and our AI team will build your{' '}
            <span className="text-foreground font-medium">entire business</span> — from research to revenue.
          </motion.p>

          {/* Benefits grid */}
          <motion.div
            className="flex flex-wrap justify-center gap-3 mb-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {benefits.map((benefit, index) => (
              <BenefitItem key={benefit} benefit={benefit} index={index} />
            ))}
          </motion.div>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/auth">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button size="lg" className="gap-2 text-lg px-8 h-14 rounded-full shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow">
                  Get Started Free
                  <motion.span
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight className="w-5 h-5" />
                  </motion.span>
                </Button>
              </motion.div>
            </Link>
            <Link to="/live-demo">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="gap-2 h-14 rounded-full border-primary/20 hover:border-primary/50 hover:bg-primary/5"
                >
                  See How It Works
                </Button>
              </motion.div>
            </Link>
          </motion.div>

          {/* Trust indicator */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-sm text-muted-foreground mt-8"
          >
            No credit card required • Start building in minutes
          </motion.p>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 rounded-full border-2 border-primary/30 flex items-start justify-center p-2">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-primary"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  );
};
