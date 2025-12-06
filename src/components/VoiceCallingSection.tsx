import { motion } from 'framer-motion';
import { Phone, Mic, Volume2, Users, Sparkles, PhoneCall } from 'lucide-react';
import { Button } from './ui/button';

export const VoiceCallingSection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-background to-accent/5" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Voice visualization */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative order-2 lg:order-1"
          >
            <div className="relative aspect-square max-w-md mx-auto">
              {/* Outer rings */}
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-full border border-primary/20"
                  style={{ 
                    inset: `${i * 15}%`,
                  }}
                  animate={{ 
                    scale: [1, 1.05, 1],
                    opacity: [0.3, 0.5, 0.3],
                  }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                />
              ))}
              
              {/* Center orb */}
              <div className="absolute inset-[30%] rounded-full bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-xl flex items-center justify-center">
                <motion.div
                  animate={{ 
                    boxShadow: ['0 0 40px hsl(var(--primary) / 0.3)', '0 0 80px hsl(var(--primary) / 0.5)', '0 0 40px hsl(var(--primary) / 0.3)']
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center"
                >
                  <PhoneCall className="w-10 h-10 text-primary-foreground" />
                </motion.div>
              </div>
              
              {/* Audio waveform */}
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-1">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-primary rounded-full"
                    animate={{ height: [4, 20 + Math.random() * 20, 4] }}
                    transition={{ duration: 0.5 + Math.random() * 0.5, repeat: Infinity, delay: i * 0.05 }}
                  />
                ))}
              </div>
              
              {/* Floating agent avatars */}
              {['CEO', 'Sales', 'Marketing'].map((agent, i) => (
                <motion.div
                  key={agent}
                  className="absolute p-3 rounded-xl bg-card border border-border shadow-lg"
                  style={{
                    top: i === 0 ? '5%' : i === 1 ? '60%' : '40%',
                    left: i === 0 ? '60%' : i === 1 ? '0%' : '80%',
                  }}
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">{agent} Agent</p>
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] text-emerald-500">Voice Ready</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
          
          {/* Right - Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-1 lg:order-2"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/20 mb-6">
              <Phone className="w-4 h-4 text-primary" />
              <span className="text-sm font-mono text-primary">LIVE VOICE CALLING</span>
            </div>
            
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              <span className="text-foreground">Talk to Your</span>
              <br />
              <span className="text-gradient">AI Team</span>
            </h2>
            
            <p className="text-lg text-muted-foreground mb-8">
              Skip the chat. Have real-time voice conversations with your CEO and all 25 agents. 
              Powered by OpenAI Realtime API and ElevenLabs for natural, lifelike interactions.
            </p>
            
            {/* Features */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {[
                { icon: Mic, title: 'Voice Input', desc: 'Speak naturally' },
                { icon: Volume2, title: 'Voice Output', desc: 'Lifelike responses' },
                { icon: Users, title: '25 Agents', desc: 'All voice-enabled' },
                { icon: Sparkles, title: 'Real-time', desc: 'Zero latency' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="p-4 rounded-xl bg-card/50 border border-border/50"
                >
                  <item.icon className="w-6 h-6 text-primary mb-2" />
                  <h4 className="font-semibold text-foreground">{item.title}</h4>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </motion.div>
              ))}
            </div>
            
            {/* Tech badges */}
            <div className="flex flex-wrap gap-3 mb-8">
              <span className="px-3 py-1.5 rounded-full bg-muted text-sm text-foreground">OpenAI Realtime API</span>
              <span className="px-3 py-1.5 rounded-full bg-muted text-sm text-foreground">ElevenLabs TTS</span>
              <span className="px-3 py-1.5 rounded-full bg-muted text-sm text-foreground">WebRTC</span>
            </div>
            
            {/* CTA */}
            <div className="flex items-center gap-4">
              <Button size="lg" className="rounded-xl">
                <Phone className="w-4 h-4 mr-2" />
                Start Voice Call
              </Button>
              <p className="text-sm text-muted-foreground">
                Available 24/7
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
