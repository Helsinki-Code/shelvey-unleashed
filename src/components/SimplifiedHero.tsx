import { motion } from 'framer-motion';
import { Check, ArrowRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useExperienceMode } from '@/contexts/ExperienceModeContext';

const benefits = [
  'Research the market',
  'Design your brand',
  'Build your website',
  'Create your content',
  'Market to customers',
  'Handle sales calls',
];

export const SimplifiedHero = () => {
  const { isBeginner } = useExperienceMode();

  if (!isBeginner) return null;

  return (
    <section className="relative py-20 lg:py-32 overflow-hidden">
      {/* Soft gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
      
      <div className="container mx-auto px-4 relative">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              <span className="text-foreground">Your AI Business Team</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Tell us your idea, and our AI team will build your entire business — from research to revenue.
            </p>
          </motion.div>

          {/* Benefits list */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-xl mx-auto mb-10"
          >
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="flex items-center gap-2 text-sm"
              >
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <span className="text-muted-foreground">{benefit}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/auth">
              <Button size="lg" className="gap-2 text-lg px-8">
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/live-demo">
              <Button variant="outline" size="lg" className="gap-2">
                <Play className="w-4 h-4" />
                See How It Works
              </Button>
            </Link>
          </motion.div>

          {/* Trust indicators */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-sm text-muted-foreground mt-6"
          >
            No credit card required • Start building in minutes
          </motion.p>
        </div>
      </div>
    </section>
  );
};
