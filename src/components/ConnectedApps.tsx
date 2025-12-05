import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useExperienceMode } from '@/contexts/ExperienceModeContext';

const appCategories = [
  {
    category: 'Social Media',
    emoji: '📱',
    apps: ['Twitter', 'Instagram', 'LinkedIn', 'TikTok'],
  },
  {
    category: 'Design',
    emoji: '🎨',
    apps: ['Canva', 'Fal AI', '21st.dev'],
  },
  {
    category: 'Payments',
    emoji: '💳',
    apps: ['Stripe', 'Shopify'],
  },
  {
    category: 'Communication',
    emoji: '📧',
    apps: ['Gmail', 'WhatsApp', 'Twilio'],
  },
  {
    category: 'Voice',
    emoji: '🎙️',
    apps: ['Phone Calls', 'Voice AI'],
  },
  {
    category: 'AI',
    emoji: '🤖',
    apps: ['ChatGPT', 'Claude', 'Gemini', 'Perplexity'],
  },
];

export const ConnectedApps = () => {
  const { isBeginner } = useExperienceMode();

  if (!isBeginner) return null;

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Apps Your Team Can Use</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Your AI team connects to 45+ apps automatically to handle any task.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-5xl mx-auto mb-10">
          {appCategories.map((cat, index) => (
            <motion.div
              key={cat.category}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-card border rounded-xl p-4 text-center hover:border-primary/50 transition-colors"
            >
              <div className="text-3xl mb-2">{cat.emoji}</div>
              <p className="font-medium text-sm mb-1">{cat.category}</p>
              <p className="text-xs text-muted-foreground">
                {cat.apps.slice(0, 2).join(', ')}
                {cat.apps.length > 2 && ` +${cat.apps.length - 2}`}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Link to="/mcp">
            <Button variant="outline" className="gap-2">
              See All 45+ Apps
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};
