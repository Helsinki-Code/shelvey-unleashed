import { motion, useInView } from 'framer-motion';
import { MessageSquare, Users, Rocket, Zap } from 'lucide-react';
import { useExperienceMode } from '@/contexts/ExperienceModeContext';
import { useRef } from 'react';

const steps = [
  {
    icon: MessageSquare,
    title: 'Describe Your Idea',
    description: 'Just tell us what business you want to build',
    color: 'from-blue-500 to-cyan-500',
    glowColor: 'blue',
  },
  {
    icon: Users,
    title: 'AI Team Works',
    description: '25 specialists collaborate to build your business',
    color: 'from-purple-500 to-pink-500',
    glowColor: 'purple',
  },
  {
    icon: Rocket,
    title: 'Launch & Grow',
    description: 'Get a live website and sales in days',
    color: 'from-orange-500 to-red-500',
    glowColor: 'orange',
  },
];

// Animated connection line
const ConnectionLine = ({ isActive }: { isActive: boolean }) => (
  <div className="hidden lg:flex items-center justify-center flex-1 px-4">
    <div className="relative w-full h-1 bg-muted rounded-full overflow-hidden">
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-primary to-primary/50 rounded-full"
        initial={{ scaleX: 0, originX: 0 }}
        animate={isActive ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
      {/* Animated pulse */}
      <motion.div
        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary"
        initial={{ left: "0%", opacity: 0 }}
        animate={isActive ? { left: ["0%", "100%"], opacity: [0, 1, 0] } : {}}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
      />
    </div>
  </div>
);

// Step card with 3D hover effect
const StepCard = ({ step, index, isInView }: { step: typeof steps[0]; index: number; isInView: boolean }) => {
  const Icon = step.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, rotateX: -15 }}
      animate={isInView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
      transition={{ delay: index * 0.2, duration: 0.6, ease: "easeOut" }}
      whileHover={{ 
        y: -10, 
        rotateY: 5,
        transition: { duration: 0.3 }
      }}
      className="relative group perspective-1000"
    >
      {/* Glow effect */}
      <motion.div
        className={`absolute -inset-4 bg-gradient-to-r ${step.color} rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500`}
      />
      
      {/* Card */}
      <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-8 h-full transform-style-preserve-3d">
        {/* Step number */}
        <motion.div
          className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-bold shadow-lg"
          initial={{ scale: 0, rotate: -180 }}
          animate={isInView ? { scale: 1, rotate: 0 } : {}}
          transition={{ delay: index * 0.2 + 0.3, type: "spring", stiffness: 200 }}
        >
          {index + 1}
        </motion.div>

        {/* Icon container */}
        <motion.div
          className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-6 shadow-lg`}
          whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
          transition={{ duration: 0.5 }}
        >
          <Icon className="w-8 h-8 text-white" />
        </motion.div>

        {/* Content */}
        <h3 className="text-xl font-bold mb-3 text-foreground">{step.title}</h3>
        <p className="text-muted-foreground leading-relaxed">{step.description}</p>

        {/* Decorative corner */}
        <div className="absolute bottom-0 right-0 w-20 h-20 overflow-hidden rounded-br-2xl">
          <motion.div
            className={`absolute -bottom-10 -right-10 w-20 h-20 bg-gradient-to-br ${step.color} opacity-10 rounded-full`}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        </div>
      </div>
    </motion.div>
  );
};

// Floating decorative elements
const FloatingElements = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(8)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute"
        style={{
          left: `${10 + i * 12}%`,
          top: `${20 + (i % 3) * 30}%`,
        }}
        animate={{
          y: [0, -20, 0],
          rotate: [0, 180, 360],
          opacity: [0.1, 0.3, 0.1],
        }}
        transition={{
          duration: 5 + i,
          repeat: Infinity,
          delay: i * 0.5,
        }}
      >
        <Zap className="w-4 h-4 text-primary/30" />
      </motion.div>
    ))}
  </div>
);

export const HowItWorks = () => {
  const { isBeginner } = useExperienceMode();
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  if (!isBeginner) return null;

  return (
    <section className="relative py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-muted/50 to-muted/30" />
      <FloatingElements />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-full" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }} />
      </div>

      <div ref={containerRef} className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={isInView ? { scale: 1 } : {}}
            transition={{ delay: 0.2, type: "spring" }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
          >
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Simple 3-Step Process</span>
          </motion.div>
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              How It{' '}
            </span>
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Works
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Building a business has never been easier
          </p>
        </motion.div>

        {/* Steps */}
        <div className="flex flex-col lg:flex-row items-stretch gap-6 lg:gap-0 max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <div key={step.title} className="flex flex-col lg:flex-row items-center flex-1">
              <StepCard step={step} index={index} isInView={isInView} />
              {index < steps.length - 1 && <ConnectionLine isActive={isInView} />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
