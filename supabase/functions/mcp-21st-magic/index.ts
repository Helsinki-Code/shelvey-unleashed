import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 21st.dev Magic API endpoint
const TWENTYFIRST_API_URL = 'https://api.21st.dev/v1';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tool, arguments: args, credentials, userId, agentId } = await req.json();

    const apiKey = credentials?.TWENTY_FIRST_API_KEY || Deno.env.get('TWENTY_FIRST_API_KEY');
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'TWENTY_FIRST_API_KEY not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[mcp-21st-magic] Tool: ${tool}, Agent: ${agentId}`);

    let result;

    switch (tool) {
      case 'generate_component':
      case '21st_magic_component_builder': {
        // Generate React component from natural language description
        const response = await fetch(`${TWENTYFIRST_API_URL}/magic/component`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: args.description || args.prompt,
            framework: args.framework || 'react',
            styling: args.styling || 'tailwind',
            typescript: args.typescript !== false,
            includeImports: true,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[mcp-21st-magic] API error:`, response.status, errorText);
          
          // Fallback: Generate component locally using best practices
          result = generateLocalComponent(args);
        } else {
          result = await response.json();
        }
        break;
      }

      case 'search_logos':
      case 'logo_search': {
        // Search SVGL brand logos
        const response = await fetch(`https://api.svgl.app/search?q=${encodeURIComponent(args.query || args.brand)}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          result = { logos: [], error: 'Failed to search logos' };
        } else {
          const logos = await response.json();
          result = { 
            success: true, 
            logos: logos.slice(0, args.limit || 10),
            count: logos.length 
          };
        }
        break;
      }

      case 'get_inspiration':
      case '21st_magic_component_inspiration': {
        // Get component inspiration from 21st.dev library
        const response = await fetch(`${TWENTYFIRST_API_URL}/components/search?q=${encodeURIComponent(args.query || args.type)}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          // Fallback: Return curated component suggestions
          result = getComponentInspiration(args.query || args.type);
        } else {
          result = await response.json();
        }
        break;
      }

      case 'refine_component':
      case '21st_magic_component_refiner': {
        // Refine/improve existing component
        const response = await fetch(`${TWENTYFIRST_API_URL}/magic/refine`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: args.code || args.component,
            instructions: args.instructions || args.feedback,
            preserveLogic: args.preserveLogic !== false,
          }),
        });

        if (!response.ok) {
          result = { 
            success: false, 
            error: 'Failed to refine component',
            original: args.code || args.component 
          };
        } else {
          result = await response.json();
        }
        break;
      }

      case 'generate_landing_page': {
        // Generate complete landing page with multiple sections
        const sections = args.sections || ['hero', 'features', 'pricing', 'testimonials', 'cta', 'footer'];
        const components: Record<string, any> = {};

        for (const section of sections) {
          const sectionPrompt = buildSectionPrompt(section, args);
          components[section] = generateLocalComponent({
            description: sectionPrompt,
            businessName: args.businessName,
            brandColors: args.brandColors,
            section,
          });
        }

        result = {
          success: true,
          components,
          metadata: {
            framework: 'react',
            styling: 'tailwind',
            sections,
            businessName: args.businessName,
          },
        };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown tool: ${tool}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log(`[mcp-21st-magic] Completed ${tool}`);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[mcp-21st-magic] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Local component generation with modern React patterns
function generateLocalComponent(args: any): any {
  const { description, businessName, brandColors, section } = args;
  
  const componentName = section 
    ? `${section.charAt(0).toUpperCase()}${section.slice(1)}Section`
    : 'GeneratedComponent';

  const primaryColor = brandColors?.primary || 'hsl(var(--primary))';
  
  // Generate component based on section type
  const componentCode = generateSectionCode(section || 'hero', {
    businessName: businessName || 'Your Business',
    description: description || '',
    primaryColor,
    brandColors,
  });

  return {
    success: true,
    code: componentCode,
    componentName,
    imports: [
      "import { Button } from '@/components/ui/button'",
      "import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'",
      "import { motion } from 'framer-motion'",
    ],
    dependencies: ['@/components/ui/button', '@/components/ui/card', 'framer-motion'],
  };
}

function generateSectionCode(section: string, config: any): string {
  const { businessName, description, primaryColor } = config;

  const sections: Record<string, string> = {
    hero: `
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

export function HeroSection({ businessName = "${businessName}", headline, subheadline, ctaText = "Get Started" }) {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      <div className="container relative z-10 px-4 mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto"
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-primary/10 border border-primary/20"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Welcome to {businessName}</span>
          </motion.div>

          <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-7xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            {headline || "Transform Your Business with AI-Powered Solutions"}
          </h1>

          <p className="mb-8 text-xl text-muted-foreground max-w-2xl mx-auto">
            {subheadline || "Discover innovative solutions that help you grow, scale, and succeed in todays competitive market."}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="group">
              {ctaText}
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button size="lg" variant="outline">
              Learn More
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}`,

    features: `
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Zap, Shield, Rocket, Users, BarChart, Globe } from "lucide-react";

const features = [
  { icon: Zap, title: "Lightning Fast", description: "Experience blazing fast performance that keeps you ahead." },
  { icon: Shield, title: "Secure & Reliable", description: "Enterprise-grade security protecting your data 24/7." },
  { icon: Rocket, title: "Scale Effortlessly", description: "Grow from startup to enterprise without missing a beat." },
  { icon: Users, title: "Team Collaboration", description: "Work seamlessly with your team in real-time." },
  { icon: BarChart, title: "Advanced Analytics", description: "Data-driven insights to optimize your strategy." },
  { icon: Globe, title: "Global Reach", description: "Connect with customers worldwide effortlessly." },
];

export function FeaturesSection() {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container px-4 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4">Powerful Features</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to succeed, all in one platform.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow border-primary/10 hover:border-primary/30">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}`,

    pricing: `
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "$29",
    description: "Perfect for small teams getting started",
    features: ["Up to 5 team members", "Basic analytics", "24/7 support", "1GB storage"],
    popular: false,
  },
  {
    name: "Professional",
    price: "$99",
    description: "Best for growing businesses",
    features: ["Unlimited team members", "Advanced analytics", "Priority support", "100GB storage", "API access", "Custom integrations"],
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large-scale operations",
    features: ["Everything in Pro", "Dedicated account manager", "Custom SLA", "Unlimited storage", "On-premise option"],
    popular: false,
  },
];

export function PricingSection() {
  return (
    <section className="py-24">
      <div className="container px-4 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-xl text-muted-foreground">Choose the plan that fits your needs</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={\`h-full \${plan.popular ? 'border-primary shadow-lg scale-105' : ''}\`}>
                {plan.popular && (
                  <div className="bg-primary text-primary-foreground text-center py-1 text-sm font-medium flex items-center justify-center gap-1">
                    <Star className="w-4 h-4" /> Most Popular
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.price !== "Custom" && <span className="text-muted-foreground">/month</span>}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-primary" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" variant={plan.popular ? "default" : "outline"}>
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}`,

    testimonials: `
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    quote: "This platform transformed how we do business. The results speak for themselves.",
    author: "Sarah Johnson",
    role: "CEO, TechStart",
    rating: 5,
  },
  {
    quote: "The best investment we've made this year. Our productivity doubled within months.",
    author: "Michael Chen",
    role: "Founder, GrowthLabs",
    rating: 5,
  },
  {
    quote: "Outstanding support and incredible features. Highly recommend to any business.",
    author: "Emily Rodriguez",
    role: "Director, ScaleUp Inc",
    rating: 5,
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container px-4 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4">What Our Customers Say</h2>
          <p className="text-xl text-muted-foreground">Join thousands of satisfied customers</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.author}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full">
                <CardContent className="pt-6">
                  <Quote className="w-10 h-10 text-primary/20 mb-4" />
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-lg mb-6 text-muted-foreground italic">"{testimonial.quote}"</p>
                  <div>
                    <p className="font-semibold">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}`,

    cta: `
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

export function CTASection({ businessName = "${businessName}" }) {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10" />
      
      <div className="container px-4 mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Limited Time Offer</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Transform Your Business?
          </h2>
          
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of businesses already growing with {businessName}. Start your free trial today.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="group text-lg px-8">
              Start Free Trial
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8">
              Schedule Demo
            </Button>
          </div>
          
          <p className="mt-6 text-sm text-muted-foreground">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </motion.div>
      </div>
    </section>
  );
}`,

    footer: `
import { Separator } from "@/components/ui/separator";
import { Facebook, Twitter, Linkedin, Instagram, Mail, Phone, MapPin } from "lucide-react";

const footerLinks = {
  Product: ["Features", "Pricing", "Integrations", "API", "Changelog"],
  Company: ["About", "Blog", "Careers", "Press", "Partners"],
  Resources: ["Documentation", "Guides", "Help Center", "Community", "Templates"],
  Legal: ["Privacy Policy", "Terms of Service", "Cookie Policy", "Security"],
};

export function FooterSection({ businessName = "${businessName}" }) {
  return (
    <footer className="bg-muted/50 pt-16 pb-8">
      <div className="container px-4 mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <h3 className="text-xl font-bold mb-4">{businessName}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Empowering businesses with innovative solutions.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold mb-4">{category}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <Separator className="mb-8" />
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© 2024 {businessName}. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-primary transition-colors flex items-center gap-1">
              <Mail className="w-4 h-4" /> contact@example.com
            </a>
            <a href="#" className="hover:text-primary transition-colors flex items-center gap-1">
              <Phone className="w-4 h-4" /> (555) 123-4567
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}`,
  };

  return sections[section] || sections.hero;
}

function buildSectionPrompt(section: string, args: any): string {
  const { businessName, industry, brandColors } = args;
  
  const prompts: Record<string, string> = {
    hero: `Create a stunning hero section for ${businessName || 'a business'} in the ${industry || 'technology'} industry. Include animated elements, gradient backgrounds, and a compelling CTA.`,
    features: `Design a features grid showcasing 6 key benefits with icons, cards, and hover effects.`,
    pricing: `Build a pricing section with 3 tiers (Starter, Pro, Enterprise) with feature comparison.`,
    testimonials: `Create a testimonials section with 3 customer quotes, ratings, and professional styling.`,
    cta: `Design an eye-catching call-to-action section with urgency elements and dual buttons.`,
    footer: `Build a comprehensive footer with navigation links, social icons, and contact info.`,
  };

  return prompts[section] || prompts.hero;
}

function getComponentInspiration(query: string): any {
  const inspirations: Record<string, any[]> = {
    hero: [
      { name: 'Gradient Hero', style: 'Modern gradient with floating elements' },
      { name: 'Video Background', style: 'Full-screen video with overlay' },
      { name: 'Split Hero', style: 'Image on one side, content on other' },
      { name: '3D Hero', style: 'Three.js animated background' },
    ],
    pricing: [
      { name: 'Comparison Table', style: 'Feature matrix with highlights' },
      { name: 'Card Stack', style: 'Stacked cards with popular highlight' },
      { name: 'Slider Pricing', style: 'Interactive usage-based pricing' },
    ],
    features: [
      { name: 'Bento Grid', style: 'Asymmetric grid with large featured card' },
      { name: 'Icon Cards', style: 'Uniform cards with icon headers' },
      { name: 'Tabbed Features', style: 'Category tabs with detailed views' },
    ],
  };

  return {
    success: true,
    inspiration: inspirations[query] || inspirations.hero,
    suggestions: ['Add animations', 'Use shadcn/ui components', 'Include dark mode support'],
  };
}
