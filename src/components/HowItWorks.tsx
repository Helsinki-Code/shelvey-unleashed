import { motion } from 'framer-motion';
import { MessageSquare, Users, Rocket } from 'lucide-react';
import { useExperienceMode } from '@/contexts/ExperienceModeContext';

const steps = [
  {
    icon: MessageSquare,
    title: 'Describe Your Idea',
    description: 'Just tell us what business you want to build. Our AI CEO will understand your vision.',
    image: '💬',
  },
  {
    icon: Users,
    title: 'Watch Your AI Team Work',
    description: '25 specialists collaborate to build your business — researchers, designers, developers, marketers, and more.',
    image: '👥',
  },
  {
    icon: Rocket,
    title: 'Launch & Grow',
    description: 'Get a live website, content, and sales system in days, not months.',
    image: '🚀',
  },
];

export const HowItWorks = () => {
  const { isBeginner } = useExperienceMode();

  if (!isBeginner) return null;

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Building a business has never been easier. Here's your journey with ShelVey.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="relative"
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/20 to-transparent" />
              )}

              <div className="bg-card border rounded-2xl p-6 h-full">
                <div className="text-5xl mb-4">{step.image}</div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {index + 1}
                  </span>
                  <h3 className="font-semibold text-lg">{step.title}</h3>
                </div>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
