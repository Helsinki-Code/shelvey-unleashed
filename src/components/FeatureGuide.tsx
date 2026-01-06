import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Briefcase, Users, Server, Globe, Building2,
  Mic, BarChart, Sparkles, Phone, X, ChevronRight, ChevronLeft,
  Bot, Zap, Target, Palette, Code, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCEO } from '@/hooks/useCEO';

interface Feature {
  id: string;
  title: string;
  icon: typeof MessageSquare;
  shortDesc: string;
  fullDesc: string;
  howToUse: string[];
  tips: string[];
  category: 'core' | 'business' | 'team' | 'settings';
}

// Features array is static, ceoName will be injected at render time
const createFeatures = (ceoName: string): Feature[] => [
  {
    id: 'ceo-chat',
    title: `${ceoName} Chat`,
    icon: MessageSquare,
    shortDesc: `Talk to ${ceoName} to start and manage projects`,
    fullDesc: `${ceoName} is your primary point of contact. ${ceoName} can help you brainstorm ideas, create business plans, delegate work to other agents, and review all deliverables.`,
    howToUse: [
      `Go to Dashboard and click "Talk to ${ceoName}"`,
      'Type your business idea or question',
      `${ceoName} will research, plan, and delegate tasks`,
      'You\'ll receive updates as work progresses'
    ],
    tips: [
      'Be specific about your target audience',
      'Share any existing brand preferences',
      'Ask for explanations if anything is unclear'
    ],
    category: 'core'
  },
  {
    id: 'voice-calls',
    title: 'Voice Calls with Agents',
    icon: Mic,
    shortDesc: 'Have real-time voice conversations with any AI agent',
    fullDesc: 'Speak directly with any of your 25 AI agents using real-time voice technology. Perfect for brainstorming, getting quick updates, or when typing feels too slow.',
    howToUse: [
      'Go to Voice Calls from the sidebar',
      'Select which agent you want to speak with',
      'Click the green call button',
      'Allow microphone access when prompted',
      'Start speaking naturally!'
    ],
    tips: [
      'Use voice calls for quick brainstorming sessions',
      'Speak clearly and pause between thoughts',
      'You can interrupt the agent anytime'
    ],
    category: 'core'
  },
  {
    id: 'projects',
    title: 'Business Projects',
    icon: Briefcase,
    shortDesc: 'Track all your business projects and their progress',
    fullDesc: 'Each project goes through 6 phases: Research, Branding, Development, Content, Marketing, and Sales. Watch your AI team build your business step by step.',
    howToUse: [
      'Start a new project via CEO chat',
      'View progress in the Projects tab',
      'Click any project to see detailed progress',
      'Review and approve deliverables at each phase',
      'Move to the next phase once approved'
    ],
    tips: [
      'Review deliverables promptly to keep work moving',
      'Provide specific feedback for better results',
      'You can have multiple projects running'
    ],
    category: 'business'
  },
  {
    id: 'websites',
    title: 'Website Builder',
    icon: Globe,
    shortDesc: 'AI-generated websites for your businesses',
    fullDesc: 'Your AI team builds professional websites using your approved branding. Websites are automatically responsive, SEO-optimized, and can be deployed with one click.',
    howToUse: [
      'Complete the Branding phase first',
      'Website generation starts in Development phase',
      'Preview your website in the Websites section',
      'Request changes or approve',
      'Deploy to a ShelVey subdomain or custom domain'
    ],
    tips: [
      'Good branding leads to better websites',
      'Test on mobile before deploying',
      'You can regenerate with different feedback'
    ],
    category: 'business'
  },
  {
    id: 'branding',
    title: 'Brand Assets',
    icon: Sparkles,
    shortDesc: 'Logos, colors, and brand identity for your business',
    fullDesc: 'The Brand Identity Agent creates complete brand packages including logos, color palettes, typography, and brand voice guidelines.',
    howToUse: [
      'Branding is Phase 2 of any project',
      'Review logo options when ready',
      'Choose your preferred direction',
      'Approve final brand package',
      'Assets are used throughout the project'
    ],
    tips: [
      'Share examples of brands you like',
      'Be clear about colors you want/don\'t want',
      'Brand assets can be downloaded anytime'
    ],
    category: 'business'
  },
  {
    id: 'organization',
    title: 'AI Organization',
    icon: Building2,
    shortDesc: 'See your 25 AI agents organized by department',
    fullDesc: 'View your entire AI workforce organized into departments: Research, Development, Marketing, Sales, and Operations. Each agent has specific skills and responsibilities.',
    howToUse: [
      'Go to Organization from the sidebar',
      'Browse agents by department',
      'Click any agent to see their skills',
      'View which agents are currently working',
      'See agent performance metrics'
    ],
    tips: [
      'Learn what each agent specializes in',
      'Agents collaborate automatically',
      'The CEO delegates work optimally'
    ],
    category: 'team'
  },
  {
    id: 'team-activity',
    title: 'Team Activity',
    icon: Users,
    shortDesc: 'Watch your AI team collaborate in real-time',
    fullDesc: 'See messages between agents, team meetings, progress reports, and escalations. It\'s like being in an office watching your team work together.',
    howToUse: [
      'Go to Team Activity tab',
      'View real-time agent messages',
      'See scheduled and past meetings',
      'Review progress reports from managers',
      'Handle any escalations that need your input'
    ],
    tips: [
      'Check daily for important updates',
      'Respond to escalations quickly',
      'Progress reports summarize team work'
    ],
    category: 'team'
  },
  {
    id: 'integrations',
    title: 'App Integrations',
    icon: Server,
    shortDesc: 'Connect external apps to supercharge your AI team',
    fullDesc: 'Connect services like Twitter, Stripe, LinkedIn, and 40+ more. Your AI agents use these integrations to post content, process payments, and more.',
    howToUse: [
      'Go to Integrations from sidebar',
      'Browse available integrations',
      'Click Connect on any service',
      'Enter your API key or OAuth',
      'Your agents can now use that service!'
    ],
    tips: [
      'Start with the essentials: Stripe, social media',
      'DFY plan includes pre-configured keys',
      'Integration status shows in real-time'
    ],
    category: 'settings'
  },
  {
    id: 'analytics',
    title: 'Business Analytics',
    icon: BarChart,
    shortDesc: 'Track performance metrics and business growth',
    fullDesc: 'See comprehensive analytics including task completion rates, phase progress, agent performance, and revenue metrics. All data is real, never simulated.',
    howToUse: [
      'Go to Analytics from sidebar',
      'View overall dashboard metrics',
      'Check individual project performance',
      'Monitor agent productivity',
      'Track revenue and growth'
    ],
    tips: [
      'Check analytics weekly for trends',
      'Compare project performance',
      'All metrics reflect real activity'
    ],
    category: 'settings'
  },
];

interface FeatureGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeatureGuide = ({ isOpen, onClose }: FeatureGuideProps) => {
  const { ceoName } = useCEO();
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const features = useMemo(() => createFeatures(ceoName), [ceoName]);

  const filteredFeatures = filter === 'all' 
    ? features 
    : features.filter(f => f.category === filter);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex">
      <AnimatePresence mode="wait">
        {!selectedFeature ? (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-4xl mx-auto p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold">ShelVey Features Guide</h1>
                <p className="text-muted-foreground">Learn how to use every feature of ShelVey</p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex gap-2 mb-6">
              {[
                { id: 'all', label: 'All' },
                { id: 'core', label: 'Core' },
                { id: 'business', label: 'Business' },
                { id: 'team', label: 'Team' },
                { id: 'settings', label: 'Settings' },
              ].map((cat) => (
                <Button
                  key={cat.id}
                  variant={filter === cat.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(cat.id)}
                >
                  {cat.label}
                </Button>
              ))}
            </div>

            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredFeatures.map((feature) => (
                  <Card
                    key={feature.id}
                    className="cursor-pointer hover:border-primary/50 transition-all"
                    onClick={() => setSelectedFeature(feature)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <feature.icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{feature.title}</h3>
                          <p className="text-sm text-muted-foreground">{feature.shortDesc}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </motion.div>
        ) : (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-2xl mx-auto p-6"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedFeature(null)}
              className="mb-4"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to all features
            </Button>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <selectedFeature.icon className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{selectedFeature.title}</CardTitle>
                    <Badge variant="secondary" className="mt-1">
                      {selectedFeature.category}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">What is this?</h4>
                  <p className="text-muted-foreground">{selectedFeature.fullDesc}</p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">How to use it</h4>
                  <ol className="space-y-2">
                    {selectedFeature.howToUse.map((step, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full text-xs flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-sm">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">💡 Pro Tips</h4>
                  <ul className="space-y-1">
                    {selectedFeature.tips.map((tip, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            <div className="mt-4 flex justify-end">
              <Button variant="ghost" onClick={onClose}>
                Close Guide
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
