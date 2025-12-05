import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Check, Zap, Crown, ArrowRight, Sparkles, Bot, Server, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';

const PricingPage = () => {
  const { user } = useAuth();
  const { createCheckout, isLoading } = useSubscription();
  const navigate = useNavigate();

  const handleSubscribe = async (tier: 'standard' | 'dfy') => {
    if (!user) {
      navigate('/auth');
      return;
    }
    await createCheckout(true, tier);
  };

  const plans = [
    {
      name: 'Standard Plan',
      tier: 'standard' as const,
      price: '$2,999',
      setupFee: '$999',
      period: '/month',
      description: 'Full access with your own API keys',
      badge: 'Most Popular',
      badgeVariant: 'default' as const,
      icon: Zap,
      features: [
        '25 Specialized AI Agents',
        '27 Real MCP Server Integrations',
        'CEO Agent Orchestration',
        'AI Website Generation & Hosting',
        'Full Business Building Pipeline',
        '6-Phase Automated Workflow',
        'Real-time Agent Monitoring',
        'Email Notifications System',
        'Custom Domain Support',
        'Priority Support',
        'Bring Your Own API Keys',
      ],
      highlighted: false,
    },
    {
      name: 'DFY Plan',
      tier: 'dfy' as const,
      price: '$4,999',
      setupFee: '$1,499',
      period: '/month',
      description: 'Done-For-You with pre-configured keys',
      badge: 'Enterprise',
      badgeVariant: 'secondary' as const,
      icon: Crown,
      features: [
        'Everything in Standard Plan',
        'Pre-configured API Keys',
        'No Setup Required',
        'Instant Start',
        'Managed Infrastructure',
        'Premium MCP Server Access',
        'Advanced Analytics Dashboard',
        'Dedicated Account Manager',
        'White-glove Onboarding',
        '24/7 Priority Support',
        'Custom Integrations',
      ],
      highlighted: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Pricing - ShelVey | AI-Powered Business Building</title>
        <meta name="description" content="Choose your ShelVey plan. Standard or DFY - start building autonomous businesses with AI agents today." />
      </Helmet>
      
      <Navbar />
      
      <main className="pt-24 pb-20">
        {/* Hero Section */}
        <section className="container mx-auto px-4 text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="outline" className="mb-6 px-4 py-2 text-sm">
              <Sparkles className="w-4 h-4 mr-2" />
              Simple, Transparent Pricing
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="text-foreground">Choose Your</span>
              <br />
              <span className="text-gradient">Growth Plan</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Deploy 25 AI agents and 27 MCP servers to build your autonomous business empire. 
              No hidden fees, cancel anytime.
            </p>
          </motion.div>
        </section>

        {/* Stats Bar */}
        <section className="container mx-auto px-4 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6"
          >
            {[
              { icon: Bot, value: '25', label: 'AI Agents' },
              { icon: Server, value: '27', label: 'MCP Servers' },
              { icon: Globe, value: '∞', label: 'Websites' },
              { icon: Zap, value: '24/7', label: 'Automation' },
            ].map((stat, i) => (
              <div key={stat.label} className="text-center p-6 rounded-2xl bg-card/50 border border-border/50">
                <stat.icon className="w-8 h-8 mx-auto mb-3 text-primary" />
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </section>

        {/* Pricing Cards */}
        <section className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <Card className={`relative overflow-hidden h-full ${
                  plan.highlighted 
                    ? 'border-primary shadow-lg shadow-primary/20' 
                    : 'border-border'
                }`}>
                  {plan.highlighted && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />
                  )}
                  
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <plan.icon className="w-7 h-7 text-primary" />
                      </div>
                      <Badge variant={plan.badgeVariant}>{plan.badge}</Badge>
                    </div>
                    
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription className="text-base">{plan.description}</CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    {/* Pricing */}
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-bold text-foreground">{plan.price}</span>
                        <span className="text-muted-foreground">{plan.period}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        + {plan.setupFee} one-time setup fee
                      </p>
                    </div>
                    
                    {/* Features */}
                    <ul className="space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-3 h-3 text-primary" />
                          </div>
                          <span className="text-sm text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {/* CTA */}
                    <Button 
                      className={`w-full h-12 text-base ${
                        plan.highlighted 
                          ? 'bg-primary hover:bg-primary/90' 
                          : 'bg-card hover:bg-muted border border-border'
                      }`}
                      variant={plan.highlighted ? 'default' : 'outline'}
                      onClick={() => handleSubscribe(plan.tier)}
                      disabled={isLoading}
                    >
                      Get Started
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="container mx-auto px-4 mt-24">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground mb-12">
              Everything you need to know about ShelVey pricing
            </p>
            
            <div className="grid gap-6 text-left">
              {[
                {
                  q: 'What\'s the difference between Standard and DFY?',
                  a: 'Standard Plan requires you to bring your own API keys for MCP servers. DFY (Done-For-You) Plan includes pre-configured keys so you can start immediately without any setup.',
                },
                {
                  q: 'Can I switch between plans?',
                  a: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect on your next billing cycle.',
                },
                {
                  q: 'What happens after I subscribe?',
                  a: 'You\'ll get instant access to your dashboard, all 25 AI agents, and the full 6-phase business building pipeline. Our CEO Agent will guide you through creating your first business.',
                },
                {
                  q: 'Is there a free trial?',
                  a: 'We offer a live demo where you can see ShelVey in action. Due to the real costs of AI agents and MCP servers, we don\'t offer a free trial.',
                },
              ].map((faq, i) => (
                <div key={i} className="p-6 rounded-xl bg-card/50 border border-border/50">
                  <h3 className="font-semibold mb-2">{faq.q}</h3>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default PricingPage;
