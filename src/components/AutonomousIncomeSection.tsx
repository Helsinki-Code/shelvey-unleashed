import { motion } from 'framer-motion';
import { 
  Building2, ShoppingBag, TrendingUp, Palette, 
  ArrowRight, DollarSign, Zap, Clock 
} from 'lucide-react';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';

const incomeStreams = [
  {
    icon: Building2,
    title: 'Business Creation',
    description: '5-phase autonomous business building from idea to revenue',
    stats: { label: 'Avg Launch', value: '14 days' },
    color: 'from-primary to-primary/70',
    features: ['Market Research', 'Branding', 'Website', 'Content', 'Marketing'],
  },
  {
    icon: ShoppingBag,
    title: 'E-Commerce Automation',
    description: 'AI manages your Shopify, Etsy, WooCommerce, and Amazon stores',
    stats: { label: 'Orders/day', value: '500+' },
    color: 'from-purple-500 to-pink-500',
    features: ['Inventory', 'Pricing', 'Fulfillment', 'Customer Service'],
  },
  {
    icon: TrendingUp,
    title: 'Trading AI Agents',
    description: 'Automated stock and crypto trading with Alpaca, Binance, Coinbase',
    stats: { label: 'Win Rate', value: '67%' },
    color: 'from-emerald-500 to-teal-500',
    features: ['Strategy Builder', 'Backtesting', 'Paper Trading', 'Live Execution'],
  },
  {
    icon: Palette,
    title: 'Print-on-Demand Empire',
    description: 'AI designs products and syncs to Printful & Printify stores',
    stats: { label: 'Products', value: '10K+' },
    color: 'from-orange-500 to-amber-500',
    features: ['AI Designs', 'Multi-store Sync', 'Auto Fulfillment', 'Profit Tracking'],
  },
];

export const AutonomousIncomeSection = () => {
  const navigate = useNavigate();
  
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-[150px]" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/20 mb-6">
            <DollarSign className="w-4 h-4 text-primary" />
            <span className="text-sm font-mono text-primary">AUTONOMOUS INCOME STREAMS</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="text-foreground">Earn While </span>
            <span className="text-gradient">You Sleep</span>
          </h2>
          
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Multiple revenue streams running 24/7. From business creation to trading, 
            e-commerce to print-on-demand—your AI workforce never stops.
          </p>
        </motion.div>
        
        {/* Income streams grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {incomeStreams.map((stream, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -8 }}
              className="group relative p-6 rounded-2xl bg-card/60 border border-border/50 hover:border-primary/30 transition-all overflow-hidden"
            >
              {/* Gradient accent */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stream.color}`} />
              
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${stream.color} p-0.5 shrink-0`}>
                  <div className="w-full h-full rounded-xl bg-background flex items-center justify-center">
                    <stream.icon className="w-7 h-7 text-foreground" />
                  </div>
                </div>
                
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground mb-1">{stream.title}</h3>
                  <p className="text-sm text-muted-foreground">{stream.description}</p>
                </div>
                
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">{stream.stats.value}</div>
                  <div className="text-xs text-muted-foreground">{stream.stats.label}</div>
                </div>
              </div>
              
              {/* Features */}
              <div className="flex flex-wrap gap-2">
                {stream.features.map((feat, j) => (
                  <span 
                    key={j} 
                    className="px-2 py-1 rounded-md bg-muted/50 text-xs text-muted-foreground"
                  >
                    {feat}
                  </span>
                ))}
              </div>
              
              {/* Hover arrow */}
              <ArrowRight className="absolute bottom-6 right-6 w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </motion.div>
          ))}
        </div>
        
        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
        >
          {[
            { icon: Clock, value: '24/7', label: 'Always Running' },
            { icon: Zap, value: '25', label: 'AI Agents' },
            { icon: DollarSign, value: '$127K+', label: 'Revenue MTD' },
            { icon: TrendingUp, value: '98.7%', label: 'Success Rate' },
          ].map((stat, i) => (
            <div 
              key={i} 
              className="p-4 rounded-xl bg-card/50 border border-border/50 text-center"
            >
              <stat.icon className="w-6 h-6 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </motion.div>
        
        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Button 
            size="lg" 
            className="rounded-xl px-8 h-14 text-base"
            onClick={() => navigate('/auth?mode=signup')}
          >
            <Zap className="w-5 h-5 mr-2" />
            Start Building Income Streams
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            Join 500+ entrepreneurs building passive income with AI
          </p>
        </motion.div>
      </div>
    </section>
  );
};
