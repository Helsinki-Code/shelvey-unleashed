import { motion, useScroll, useTransform, useSpring, useMotionValue, useAnimationFrame } from 'framer-motion';
import { ArrowRight, Sparkles, Play, Pause } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useExperienceMode } from '@/contexts/ExperienceModeContext';
import { useRef, useState, useEffect } from 'react';

const benefits = [
  'Research the market',
  'Design your brand',
  'Build your website',
  'Create your content',
  'Market to customers',
  'Handle sales calls',
];

// 3D Parallax floating layers
const ParallaxLayers = () => {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 150]);
  const y2 = useTransform(scrollY, [0, 500], [0, -100]);
  const y3 = useTransform(scrollY, [0, 500], [0, 200]);
  const rotate1 = useTransform(scrollY, [0, 500], [0, 15]);
  const rotate2 = useTransform(scrollY, [0, 500], [0, -10]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Deep background layer */}
      <motion.div
        style={{ y: y3 }}
        className="absolute inset-0"
      >
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={`deep-${i}`}
            className="absolute w-2 h-2 rounded-full bg-primary/10"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.1, 0.3, 0.1],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 4 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </motion.div>

      {/* Mid layer - geometric shapes */}
      <motion.div style={{ y: y2, rotate: rotate2 }} className="absolute inset-0">
        <div className="absolute top-[20%] left-[10%] w-32 h-32 border border-primary/10 rounded-xl rotate-45" />
        <div className="absolute top-[60%] right-[15%] w-48 h-48 border border-primary/5 rounded-full" />
        <div className="absolute bottom-[30%] left-[20%] w-24 h-24 border border-primary/10 rotate-12" />
      </motion.div>

      {/* Front layer - glowing orbs */}
      <motion.div style={{ y: y1, rotate: rotate1 }} className="absolute inset-0">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={`orb-${i}`}
            className="absolute rounded-full"
            style={{
              width: `${100 + i * 60}px`,
              height: `${100 + i * 60}px`,
              background: `radial-gradient(circle, hsl(var(--primary) / ${0.15 - i * 0.025}) 0%, transparent 70%)`,
              left: `${15 + i * 18}%`,
              top: `${25 + (i % 2) * 30}%`,
              filter: 'blur(20px)',
            }}
            animate={{
              scale: [1, 1.2, 1],
              x: [0, 20, 0],
              y: [0, -15, 0],
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.8,
            }}
          />
        ))}
      </motion.div>
    </div>
  );
};

// Animated video-like background with gradient mesh
const AnimatedMeshBackground = () => {
  const time = useMotionValue(0);
  
  useAnimationFrame((t) => {
    time.set(t / 1000);
  });

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Gradient mesh simulation */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 20% 40%, hsl(var(--primary) / 0.15) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 60%, hsl(var(--primary) / 0.1) 0%, transparent 50%),
            radial-gradient(ellipse 40% 60% at 50% 80%, hsl(var(--primary) / 0.08) 0%, transparent 50%)
          `,
        }}
        animate={{
          opacity: [0.8, 1, 0.8],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Animated gradient waves */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute inset-0"
          style={{
            background: `linear-gradient(${120 + i * 30}deg, transparent 40%, hsl(var(--primary) / ${0.03 + i * 0.01}) 50%, transparent 60%)`,
          }}
          animate={{
            rotate: [0, 360],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20 + i * 5,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}

      {/* Grid overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
};

// Morphing text cursor effect
const TypewriterText = ({ text }: { text: string }) => {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index <= text.length) {
        setDisplayText(text.slice(0, index));
        index++;
      } else {
        setIsComplete(true);
        clearInterval(timer);
      }
    }, 50);
    return () => clearInterval(timer);
  }, [text]);

  return (
    <span>
      {displayText}
      {!isComplete && (
        <motion.span
          className="inline-block w-0.5 h-[1em] bg-primary ml-1"
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      )}
    </span>
  );
};

// Magnetic button effect
const MagneticButton = ({ children, className, ...props }: React.ComponentProps<typeof Button>) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(0, { stiffness: 300, damping: 20 });
  const y = useSpring(0, { stiffness: 300, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * 0.2);
    y.set((e.clientY - centerY) * 0.2);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      style={{ x, y }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <Button className={className} {...props}>
        {children}
      </Button>
    </motion.div>
  );
};

// Animated benefit pill with stagger
const BenefitPill = ({ benefit, index }: { benefit: string; index: number }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8, y: 20 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    transition={{ 
      delay: 1 + index * 0.1, 
      duration: 0.5,
      type: "spring",
      stiffness: 200,
    }}
    whileHover={{ 
      scale: 1.1, 
      y: -5,
      boxShadow: "0 10px 40px hsl(var(--primary) / 0.2)",
    }}
    className="group relative px-4 py-2.5 rounded-full bg-card/50 backdrop-blur-sm border border-primary/20 cursor-default overflow-hidden"
  >
    {/* Shine effect */}
    <motion.div
      className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent -translate-x-full"
      animate={{ translateX: ["100%", "-100%"] }}
      transition={{ duration: 3, repeat: Infinity, delay: index * 0.5 }}
    />
    
    <div className="relative flex items-center gap-2">
      <motion.div 
        className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center"
        whileHover={{ rotate: 360 }}
        transition={{ duration: 0.5 }}
      >
        <Sparkles className="w-3 h-3 text-primary-foreground" />
      </motion.div>
      <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">
        {benefit}
      </span>
    </div>
  </motion.div>
);

// Scroll indicator with pulse
const ScrollIndicator = () => (
  <motion.div
    className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 2 }}
  >
    <span className="text-xs text-muted-foreground uppercase tracking-widest">Scroll</span>
    <motion.div
      className="relative w-6 h-10 rounded-full border-2 border-primary/30"
      animate={{ borderColor: ["hsl(var(--primary) / 0.3)", "hsl(var(--primary) / 0.6)", "hsl(var(--primary) / 0.3)"] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 top-2 w-1.5 h-1.5 rounded-full bg-primary"
        animate={{ y: [0, 16, 0], opacity: [1, 0.5, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    </motion.div>
  </motion.div>
);

export const SimplifiedHero = () => {
  const { isBeginner } = useExperienceMode();
  const containerRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });
  
  const y = useTransform(scrollYProgress, [0, 1], [0, 300]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  if (!isBeginner) return null;

  return (
    <section ref={containerRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated mesh background */}
      <AnimatedMeshBackground />
      
      {/* Parallax layers */}
      <ParallaxLayers />
      
      {/* Vignette overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background pointer-events-none" />

      <motion.div 
        style={{ y, opacity, scale }} 
        className="container mx-auto px-4 relative z-10"
      >
        <div className="max-w-4xl mx-auto text-center">
          {/* Floating badge */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 mb-8 backdrop-blur-sm"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-4 h-4 text-primary" />
            </motion.div>
            <span className="text-sm font-medium text-primary">The Future of Business Building</span>
            <motion.div
              className="w-2 h-2 rounded-full bg-green-500"
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </motion.div>

          {/* Main headline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative mb-6"
          >
            {/* Glow effect behind text */}
            <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 -z-10" />
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
                Your{' '}
              </span>
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                  AI Business
                </span>
                <motion.span
                  className="absolute -inset-x-4 -inset-y-2 bg-primary/10 rounded-xl -z-10"
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.8, duration: 0.6 }}
                />
              </span>
              <br />
              <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
                Team
              </span>
            </h1>
          </motion.div>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            Tell us your idea, and our AI team will build your{' '}
            <span className="text-foreground font-medium">entire business</span> — from research to revenue.
          </motion.p>

          {/* Benefits grid */}
          <motion.div
            className="flex flex-wrap justify-center gap-3 mb-14"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            {benefits.map((benefit, index) => (
              <BenefitPill key={benefit} benefit={benefit} index={index} />
            ))}
          </motion.div>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/auth">
              <MagneticButton 
                size="lg" 
                className="gap-2 text-lg px-10 h-14 rounded-full shadow-[0_0_40px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_60px_hsl(var(--primary)/0.4)] transition-shadow"
              >
                Get Started Free
                <motion.span
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <ArrowRight className="w-5 h-5" />
                </motion.span>
              </MagneticButton>
            </Link>
            
            <Link to="#demo">
              <MagneticButton 
                variant="outline" 
                size="lg" 
                className="gap-2 h-14 rounded-full border-primary/30 hover:border-primary/60 hover:bg-primary/5 backdrop-blur-sm"
              >
                <Play className="w-4 h-4" />
                Try Live Demo
              </MagneticButton>
            </Link>
          </motion.div>

          {/* Trust text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8 }}
            className="text-sm text-muted-foreground mt-8"
          >
            No credit card required • Start building in minutes
          </motion.p>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <ScrollIndicator />
    </section>
  );
};
