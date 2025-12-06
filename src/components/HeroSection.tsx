import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, Sparkles, Globe, Cpu } from 'lucide-react';
import { Button } from './ui/button';

// Hexagonal grid background
const HexGrid = () => (
  <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="hexagons" width="50" height="86.6" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
        <polygon 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="0.5"
          points="25,0 50,14.4 50,43.3 25,57.7 0,43.3 0,14.4"
          className="text-primary"
        />
        <polygon 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="0.5"
          points="25,28.9 50,43.3 50,72.2 25,86.6 0,72.2 0,43.3"
          className="text-primary"
        />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#hexagons)" />
  </svg>
);

// Animated counter
const AnimatedNumber = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const controls = animate(0, value, {
      duration: 2,
      onUpdate: (v) => setDisplayValue(Math.floor(v)),
    });
    return controls.stop;
  }, [value]);
  
  return <span>{displayValue.toLocaleString()}{suffix}</span>;
};

// Neural connection lines
const NeuralLines = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
          style={{
            top: `${15 + i * 12}%`,
            left: '-10%',
            width: '120%',
            transform: `rotate(${-15 + i * 5}deg)`,
          }}
          animate={{
            opacity: [0, 0.6, 0],
            scaleX: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 4 + i * 0.5,
            repeat: Infinity,
            delay: i * 0.3,
          }}
        />
      ))}
    </div>
  );
};

// Floating data particles
const DataParticles = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -100, 0],
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
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
};

// Central orb with morphing effect
const CentralOrb = () => {
  return (
    <div className="relative w-[320px] h-[320px] md:w-[420px] md:h-[420px]">
      {/* Outer glow rings */}
      <motion.div
        className="absolute inset-[-20%] rounded-full border border-primary/20"
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute inset-[-10%] rounded-full border border-primary/10"
        animate={{ rotate: -360 }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
      />
      
      {/* Main orb container */}
      <div className="absolute inset-0 rounded-full overflow-hidden">
        {/* Gradient background */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(circle at 30% 30%, hsl(var(--primary)) 0%, transparent 50%),
              radial-gradient(circle at 70% 70%, hsl(var(--accent)) 0%, transparent 50%),
              radial-gradient(circle at 50% 50%, hsl(var(--cyber-purple)) 0%, transparent 60%),
              linear-gradient(135deg, hsl(var(--primary) / 0.8), hsl(var(--cyber-dark)))
            `,
          }}
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        
        {/* Inner glow */}
        <motion.div
          className="absolute inset-[15%] rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.5) 0%, transparent 70%)',
          }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        
        {/* Scan line effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/10 to-transparent"
          animate={{ y: ['-100%', '100%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      </div>
      
      {/* Orbiting elements */}
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="absolute top-1/2 left-1/2 w-3 h-3"
          style={{ transformOrigin: '0 0' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 8 + i * 2, repeat: Infinity, ease: 'linear' }}
        >
          <motion.div
            className="w-3 h-3 rounded-full"
            style={{
              background: i % 2 === 0 ? 'hsl(var(--primary))' : 'hsl(var(--accent))',
              transform: `translateX(${130 + i * 20}px)`,
              boxShadow: `0 0 20px ${i % 2 === 0 ? 'hsl(var(--primary))' : 'hsl(var(--accent))'}`,
            }}
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
          />
        </motion.div>
      ))}
      
      {/* Center core */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full"
        style={{
          background: 'radial-gradient(circle, hsl(var(--background)) 0%, hsl(var(--card)) 100%)',
          boxShadow: 'inset 0 0 30px hsl(var(--primary) / 0.3)',
        }}
      >
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        >
          <Cpu className="w-8 h-8 text-primary" />
        </motion.div>
      </motion.div>
    </div>
  );
};

// Status indicator cards floating around
const StatusCard = ({ children, className, delay }: { children: React.ReactNode; className: string; delay: number }) => (
  <motion.div
    className={`absolute p-3 rounded-xl bg-card/80 backdrop-blur-xl border border-border/50 shadow-lg ${className}`}
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ 
      opacity: 1, 
      scale: 1,
      y: [0, -8, 0],
    }}
    transition={{ 
      delay,
      y: { duration: 4, repeat: Infinity, ease: 'easeInOut' }
    }}
  >
    {children}
  </motion.div>
);

export const HeroSection = () => {
  const navigate = useNavigate();
  
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background layers */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/20" />
      <HexGrid />
      <NeuralLines />
      <DataParticles />
      
      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-[150px]" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center lg:text-left order-2 lg:order-1"
          >
            {/* Live status badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/5 border border-primary/20 mb-8"
            >
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
              </span>
              <span className="text-sm font-mono text-primary tracking-wide">
                25 AGENTS • 52 MCP SERVERS • 5-PHASE MACHINE
              </span>
            </motion.div>
            
            {/* Main heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-6 leading-[1.1] tracking-tight">
              <motion.span 
                className="block text-foreground"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                Your Personal
              </motion.span>
              <motion.span 
                className="block text-gradient mt-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                AI CEO
              </motion.span>
              <motion.span 
                className="block text-foreground/60 text-2xl sm:text-3xl lg:text-4xl mt-4 font-normal"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                Builds Your Business 24/7
              </motion.span>
            </h1>
            
            <motion.p 
              className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Create your custom AI CEO, watch 25 agents execute the 5-phase business process, 
              approve each step, and launch profitable businesses while you sleep.
            </motion.p>
            
            {/* CTA Buttons */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Button 
                size="lg" 
                className="group text-base px-8 h-14 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
                onClick={() => navigate('/auth?mode=signup')}
              >
                <Zap className="w-5 h-5 mr-2" />
                Launch Dashboard
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                className="text-base px-8 h-14 rounded-xl border-border hover:bg-muted"
                onClick={() => navigate('/live-demo')}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                View Live Demo
              </Button>
            </motion.div>
            
            {/* Stats row */}
            <motion.div 
              className="grid grid-cols-3 gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              {[
                { value: 847, label: 'Businesses Built', suffix: '' },
                { value: 25, label: 'AI Agents', suffix: '' },
                { value: 127450, label: 'Revenue MTD', suffix: '' },
              ].map((stat, i) => (
                <div key={stat.label} className="text-center lg:text-left">
                  <div className="text-2xl sm:text-3xl font-bold text-foreground">
                    {stat.label === 'Revenue MTD' ? '$' : ''}
                    <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
          
          {/* Right - Orb visualization */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="relative flex items-center justify-center order-1 lg:order-2 h-[400px] lg:h-[600px]"
          >
            {/* Background glow */}
            <div className="absolute w-[300px] h-[300px] rounded-full bg-primary/20 blur-[100px]" />
            <div className="absolute w-[200px] h-[200px] rounded-full bg-accent/20 blur-[80px] translate-x-20" />
            
            <CentralOrb />
            
            {/* Floating status cards */}
            <StatusCard className="top-[5%] right-[5%]" delay={0.8}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs font-mono text-amber-400">CEO Active</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">Voice Ready</div>
            </StatusCard>
            
            <StatusCard className="bottom-[15%] left-[0%]" delay={1}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-mono text-emerald-400">Phase 2</span>
              </div>
              <div className="text-[10px] text-muted-foreground">Branding Approved</div>
            </StatusCard>
            
            <StatusCard className="top-[25%] left-[-5%]" delay={1.2}>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                <span className="text-xs font-mono text-primary">ecoglow.shelvey.pro</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">Website Live</div>
            </StatusCard>
            
            <StatusCard className="bottom-[5%] right-[10%]" delay={1.4}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                <span className="text-xs font-mono text-pink-400">Alpaca</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">+$2,450 profit</div>
            </StatusCard>
          </motion.div>
        </div>
      </div>
      
      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2">
          <motion.div
            className="w-1 h-2 rounded-full bg-primary"
            animate={{ y: [0, 8, 0], opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  );
};
