import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useExperienceMode } from '@/contexts/ExperienceModeContext';
import { Hero3DScene } from './Hero3DScene';
import { Suspense } from 'react';

const benefits = [
  'Research',
  'Design', 
  'Build',
  'Content',
  'Marketing',
  'Sales',
];

// Loading fallback for 3D scene
const SceneLoader = () => (
  <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/20 flex items-center justify-center">
    <motion.div
      className="w-20 h-20 rounded-full border-2 border-primary/20 border-t-primary"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
  </div>
);

// Animated stat counter
const StatCounter = ({ value, label, suffix = '' }: { value: number; label: string; suffix?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="text-center"
  >
    <div className="text-3xl md:text-4xl font-bold text-primary">
      {value}{suffix}
    </div>
    <div className="text-sm text-muted-foreground">{label}</div>
  </motion.div>
);

export const SimplifiedHero = () => {
  const { isBeginner } = useExperienceMode();

  if (!isBeginner) return null;

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* 3D Background Scene */}
      <Suspense fallback={<SceneLoader />}>
        <Hero3DScene />
      </Suspense>

      {/* Gradient overlays for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-background/80 pointer-events-none" />

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Main content - offset to left */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 backdrop-blur-sm mb-6"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="w-4 h-4 text-primary" />
                </motion.div>
                <span className="text-sm font-medium text-primary">AI-Powered Business Building</span>
              </motion.div>

              {/* Title */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6"
              >
                <span className="text-foreground">Your </span>
                <span className="bg-gradient-to-r from-primary via-primary to-emerald-400 bg-clip-text text-transparent">
                  AI Business
                </span>
                <br />
                <span className="text-foreground">Team</span>
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed"
              >
                Tell us your idea. Our 25 AI specialists will research, design, build, and grow your business automatically.
              </motion.p>

              {/* Benefits pills */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex flex-wrap gap-2 mb-8"
              >
                {benefits.map((benefit, i) => (
                  <motion.span
                    key={benefit}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 + i * 0.1 }}
                    whileHover={{ scale: 1.1, backgroundColor: 'hsl(var(--primary) / 0.2)' }}
                    className="px-3 py-1.5 text-sm rounded-full bg-muted/50 border border-border/50 backdrop-blur-sm cursor-default"
                  >
                    {benefit}
                  </motion.span>
                ))}
              </motion.div>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Link to="/auth">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                    <Button size="lg" className="gap-2 rounded-full px-8 h-12 shadow-lg shadow-primary/25">
                      Get Started Free
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </motion.div>
                </Link>
                <Link to="#demo">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                    <Button variant="outline" size="lg" className="gap-2 rounded-full h-12 border-primary/30 backdrop-blur-sm">
                      <Play className="w-4 h-4" />
                      Try Live Demo
                    </Button>
                  </motion.div>
                </Link>
              </motion.div>

              {/* Trust text */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1 }}
                className="text-sm text-muted-foreground mt-6"
              >
                No credit card required • Start in minutes
              </motion.p>
            </motion.div>

            {/* Right side - Stats */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="hidden lg:flex flex-col gap-8 items-center justify-center"
            >
              <div className="grid grid-cols-2 gap-8 bg-card/30 backdrop-blur-md border border-border/30 rounded-2xl p-8">
                <StatCounter value={25} label="AI Specialists" />
                <StatCounter value={45} suffix="+" label="Integrations" />
                <StatCounter value={6} label="Business Phases" />
                <StatCounter value={24} suffix="/7" label="Working" />
              </div>
              
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="text-sm text-muted-foreground text-center"
              >
                <span className="text-primary">↑</span> Drag to explore the 3D scene <span className="text-primary">↑</span>
              </motion.p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-xs text-muted-foreground uppercase tracking-widest">Scroll</span>
        <motion.div
          className="w-6 h-10 rounded-full border-2 border-primary/30 flex justify-center"
          animate={{ borderColor: ['hsl(var(--primary) / 0.3)', 'hsl(var(--primary) / 0.6)', 'hsl(var(--primary) / 0.3)'] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-primary mt-2"
            animate={{ y: [0, 16, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
};
