import { motion } from 'framer-motion';
import { Crown, Mic, User, Sparkles, MessageCircle, Heart, Briefcase, Target, Lightbulb, Eye } from 'lucide-react';

const personas = [
  { icon: Heart, name: 'Friendly', description: 'Warm & approachable', color: 'text-pink-500' },
  { icon: Briefcase, name: 'Professional', description: 'Formal & precise', color: 'text-blue-500' },
  { icon: Target, name: 'Direct', description: 'Straight to the point', color: 'text-orange-500' },
  { icon: Eye, name: 'Nurturing', description: 'Supportive & caring', color: 'text-emerald-500' },
  { icon: Lightbulb, name: 'Visionary', description: 'Big picture thinker', color: 'text-purple-500' },
];

const voices = [
  { name: 'Aria', gender: 'Female', style: 'Warm' },
  { name: 'Roger', gender: 'Male', style: 'Professional' },
  { name: 'Sarah', gender: 'Female', style: 'Friendly' },
  { name: 'George', gender: 'Male', style: 'Authoritative' },
];

export const CEOPersonaSection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-background to-background" />
      
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-primary/5 blur-[100px]" />
      <div className="absolute bottom-20 right-10 w-72 h-72 rounded-full bg-accent/5 blur-[100px]" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/20 mb-6">
              <Crown className="w-4 h-4 text-primary" />
              <span className="text-sm font-mono text-primary">CUSTOM AI CEO</span>
            </div>
            
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              <span className="text-foreground">Create Your</span>
              <br />
              <span className="text-gradient">Personal AI CEO</span>
            </h2>
            
            <p className="text-lg text-muted-foreground mb-8">
              Design a CEO that matches your personality. Choose their name, voice, 
              communication style, and watch them lead your business empire 24/7.
            </p>
            
            {/* Features list */}
            <div className="space-y-4 mb-8">
              {[
                { icon: User, text: 'Custom name & avatar' },
                { icon: Mic, text: 'ElevenLabs voice selection' },
                { icon: MessageCircle, text: 'Personalized communication style' },
                { icon: Sparkles, text: 'AI-generated welcome email & voice greeting' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-foreground">{item.text}</span>
                </motion.div>
              ))}
            </div>
            
            {/* Persona selector preview */}
            <div className="p-4 rounded-2xl bg-card/50 border border-border/50">
              <p className="text-xs text-muted-foreground mb-3 font-mono">CHOOSE PERSONA TYPE</p>
              <div className="flex flex-wrap gap-2">
                {personas.map((persona, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ scale: 1.05 }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-background border border-border/50 
                      hover:border-primary/30 cursor-pointer transition-all ${i === 0 ? 'ring-2 ring-primary' : ''}`}
                  >
                    <persona.icon className={`w-4 h-4 ${persona.color}`} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{persona.name}</p>
                      <p className="text-[10px] text-muted-foreground">{persona.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
          
          {/* Right - CEO Preview Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="relative p-8 rounded-3xl bg-gradient-to-br from-card via-card to-muted/30 border border-border/50 shadow-2xl">
              {/* Crown decoration */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
                  <Crown className="w-6 h-6 text-white" />
                </div>
              </div>
              
              {/* Avatar */}
              <div className="flex justify-center mb-6 mt-4">
                <motion.div
                  animate={{ 
                    boxShadow: ['0 0 0 0 rgba(var(--primary-rgb), 0.4)', '0 0 0 20px rgba(var(--primary-rgb), 0)', '0 0 0 0 rgba(var(--primary-rgb), 0)']
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border-4 border-primary/30"
                >
                  <User className="w-16 h-16 text-primary" />
                </motion.div>
              </div>
              
              {/* CEO Info */}
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-foreground mb-1">Victoria Chen</h3>
                <p className="text-primary font-mono text-sm">Your AI CEO</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="px-2 py-1 rounded-full bg-pink-500/10 text-pink-500 text-xs">Friendly</span>
                  <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs">Aria Voice</span>
                </div>
              </div>
              
              {/* Voice wave animation */}
              <div className="flex items-center justify-center gap-1 mb-6">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-primary rounded-full"
                    animate={{ height: [8, 24, 8] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                  />
                ))}
              </div>
              
              {/* Sample message */}
              <div className="p-4 rounded-xl bg-background/50 border border-border/30">
                <p className="text-sm text-muted-foreground italic">
                  "Welcome to ShelVey! I'm Victoria, your AI CEO. I'll guide you through building 
                  your business empire. Let's discuss your vision..."
                </p>
              </div>
              
              {/* Voice options */}
              <div className="mt-6 pt-6 border-t border-border/30">
                <p className="text-xs text-muted-foreground mb-3 font-mono text-center">AVAILABLE VOICES</p>
                <div className="grid grid-cols-4 gap-2">
                  {voices.map((voice, i) => (
                    <div key={i} className={`p-2 rounded-lg bg-muted/30 text-center ${i === 0 ? 'ring-1 ring-primary' : ''}`}>
                      <p className="text-xs font-medium text-foreground">{voice.name}</p>
                      <p className="text-[10px] text-muted-foreground">{voice.style}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Floating elements */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute -right-4 top-20 p-3 rounded-xl bg-card border border-border shadow-lg"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-emerald-500">Online 24/7</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
