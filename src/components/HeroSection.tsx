import { motion } from 'framer-motion';
import { Play, Zap, Users, TrendingUp, Activity } from 'lucide-react';
import { Button } from './ui/button';

const stats = [
  { value: '2,845', label: 'Leads Processed', icon: Users },
  { value: '14.2K', label: 'Messages Sent', icon: TrendingUp },
  { value: '3.4%', label: 'Conversion Rate', icon: Zap },
];

// Animated Orb component using CSS
const AnimatedOrb = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Main orb */}
      <motion.div
        className="relative w-64 h-64 md:w-80 md:h-80 rounded-full"
        style={{
          background: 'radial-gradient(circle at 30% 30%, hsl(158 100% 60%), hsl(158 100% 35%), hsl(160 40% 15%))',
          boxShadow: '0 0 60px hsl(158 100% 45% / 0.4), 0 0 120px hsl(158 100% 45% / 0.2), inset 0 0 60px hsl(158 100% 60% / 0.3)',
        }}
        animate={{
          scale: [1, 1.05, 1],
          rotate: [0, 5, -5, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Inner glow */}
        <motion.div
          className="absolute inset-8 rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(180 100% 60% / 0.3), transparent 70%)',
          }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </motion.div>

      {/* Orbiting particles */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-full h-full"
          style={{ transformOrigin: 'center center' }}
          animate={{ rotate: 360 }}
          transition={{
            duration: 10 + i * 5,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <motion.div
            className="absolute w-3 h-3 rounded-full"
            style={{
              top: '10%',
              left: '50%',
              background: i === 0 ? 'hsl(180 100% 50%)' : i === 1 ? 'hsl(270 80% 60%)' : 'hsl(158 100% 50%)',
              boxShadow: `0 0 10px ${i === 0 ? 'hsl(180 100% 50%)' : i === 1 ? 'hsl(270 80% 60%)' : 'hsl(158 100% 50%)'}`,
            }}
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
          />
        </motion.div>
      ))}

      {/* Particle ring */}
      <motion.div
        className="absolute w-[120%] h-[120%] rounded-full border border-primary/20"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute w-[140%] h-[140%] rounded-full border border-cyber-cyan/10"
        animate={{ rotate: -360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
};

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Animated background grid */}
      <div className="absolute inset-0 matrix-bg opacity-30" />
      
      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background opacity-50" />

      {/* Floating geometric shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-32 h-32 border border-primary/10 rounded-full"
            style={{
              top: `${20 + i * 15}%`,
              left: `${10 + i * 20}%`,
            }}
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.1, 0.3, 0.1],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 10 + i * 2,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center lg:text-left"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
            >
              <motion.div 
                className="w-2 h-2 rounded-full bg-primary"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="font-mono text-sm text-primary">25 AGENTS ACTIVE</span>
            </motion.div>

            {/* Main heading */}
            <h1 className="font-cyber text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              <span className="text-foreground">THE FUTURE OF</span>
              <br />
              <span className="text-gradient">AUTONOMOUS</span>
              <br />
              <span className="text-foreground">BUSINESS</span>
            </h1>

            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
              ShelVey is an autonomous AI workforce that operates like a real company. 
              25+ specialized agents working 24/7 to identify opportunities, build solutions, 
              and generate revenue.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button 
                size="lg" 
                className="group relative overflow-hidden bg-primary hover:bg-primary/90 text-primary-foreground font-cyber tracking-wider"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-cyber-cyan/20 to-cyber-purple/20"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
                <span className="relative flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  INITIALIZE AGENTS
                </span>
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                className="font-cyber tracking-wider border-primary/30 hover:border-primary hover:bg-primary/5"
              >
                <Play className="w-5 h-5 mr-2" />
                WATCH DEMO
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-12">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="text-center p-4 rounded-lg bg-card/50 border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                  <div className="font-cyber text-2xl text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground font-mono">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right - Animated Orb */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="relative h-[400px] lg:h-[600px]"
          >
            {/* Glow effect behind orb */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-primary/20 blur-[100px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full bg-cyber-cyan/20 blur-[60px]" />

            <AnimatedOrb />

            {/* Floating info cards */}
            <motion.div
              className="absolute top-[15%] right-[10%] p-3 rounded-lg glass-morphism border border-primary/20 shadow-cyber"
              animate={{ y: [-5, 5, -5] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-sm">🤖</span>
                </div>
                <div>
                  <div className="text-xs font-mono text-primary">DIRECTOR AGENT</div>
                  <div className="text-[10px] text-muted-foreground">Orchestrating...</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="absolute bottom-[20%] left-[5%] p-3 rounded-lg glass-morphism border border-cyber-cyan/20 shadow-cyber"
              animate={{ y: [5, -5, 5] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-cyber-cyan/20 flex items-center justify-center">
                  <span className="text-sm">💰</span>
                </div>
                <div>
                  <div className="text-xs font-mono text-cyber-cyan">REVENUE TODAY</div>
                  <div className="text-lg font-cyber text-foreground">$12,450</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 rounded-full border-2 border-primary/30 flex justify-center p-2">
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
