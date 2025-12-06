import { motion } from 'framer-motion';
import { Globe, Code, Palette, CreditCard, Server, ShoppingCart, Sparkles } from 'lucide-react';

const techStack = [
  { name: 'React', icon: '⚛️' },
  { name: 'TypeScript', icon: '📘' },
  { name: 'Tailwind', icon: '🎨' },
  { name: 'Framer Motion', icon: '🎬' },
  { name: 'Shadcn/UI', icon: '🧩' },
  { name: '21st.dev', icon: '✨' },
];

const features = [
  {
    icon: Code,
    title: 'Modern React Websites',
    description: 'Production-ready React + TypeScript code with real-time preview',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Palette,
    title: '21st.dev & Shadcn',
    description: 'AI-generated components from premium UI libraries',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  {
    icon: Server,
    title: 'Instant Hosting',
    description: 'Deploy to *.shelvey.pro or your custom domain',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: ShoppingCart,
    title: 'Domain Marketplace',
    description: 'Search & buy domains with automatic DNS setup',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    icon: CreditCard,
    title: 'Stripe Connect',
    description: 'Accept payments instantly with built-in checkout',
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
  },
  {
    icon: Globe,
    title: 'SSL & CDN',
    description: 'Automatic SSL certificates and global CDN',
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
  },
];

export const WebsiteHostingSection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-muted/20 via-background to-background" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/20 mb-6">
            <Code className="w-4 h-4 text-primary" />
            <span className="text-sm font-mono text-primary">PHASE 3 • DEVELOPMENT</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="text-foreground">Real Websites, </span>
            <span className="text-gradient">Instantly Live</span>
          </h2>
          
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Not templates. Modern React applications built with production-grade code, 
            deployed instantly with hosting, domains, and payments ready to go.
          </p>
        </motion.div>
        
        {/* Tech stack badges */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-3 mb-12"
        >
          {techStack.map((tech, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border"
            >
              <span>{tech.icon}</span>
              <span className="text-sm font-medium text-foreground">{tech.name}</span>
            </motion.div>
          ))}
        </motion.div>
        
        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -5 }}
              className="p-6 rounded-2xl bg-card/60 border border-border/50 hover:border-primary/30 transition-all"
            >
              <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4`}>
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
        
        {/* Website preview mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative max-w-4xl mx-auto"
        >
          <div className="p-4 rounded-2xl bg-card border border-border shadow-2xl">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1.5 rounded-lg bg-muted text-xs font-mono text-muted-foreground">
                  ecoglow.shelvey.pro
                </div>
              </div>
            </div>
            
            {/* Mock website content */}
            <div className="aspect-video rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:50px_50px]" />
              
              <div className="relative z-10 text-center p-8">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 mb-4"
                >
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm text-primary">AI-Generated Website Live</span>
                </motion.div>
                
                <h3 className="text-2xl font-bold text-foreground mb-2">EcoGlow Candles</h3>
                <p className="text-muted-foreground mb-4">Premium sustainable candles subscription</p>
                
                <div className="flex justify-center gap-3">
                  <div className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">
                    Shop Now
                  </div>
                  <div className="px-4 py-2 rounded-lg bg-muted text-foreground text-sm">
                    Learn More
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Floating badges */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute -right-4 top-10 p-3 rounded-xl bg-card border border-border shadow-lg"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-emerald-500">SSL Active</span>
            </div>
          </motion.div>
          
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
            className="absolute -left-4 bottom-20 p-3 rounded-xl bg-card border border-border shadow-lg"
          >
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              <span className="text-xs text-foreground">Stripe Ready</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
