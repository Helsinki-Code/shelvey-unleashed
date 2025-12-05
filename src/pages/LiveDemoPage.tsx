import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { 
  Play, Pause, RotateCcw, Bot, Server, Globe, Zap, 
  CheckCircle2, Clock, ArrowRight, Sparkles, Brain,
  FileText, Palette, Code, Megaphone, DollarSign, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useNavigate } from 'react-router-dom';

interface DemoStep {
  id: number;
  phase: string;
  phaseIcon: any;
  title: string;
  description: string;
  agent: string;
  mcpServers: string[];
  duration: number;
  output?: string;
}

const demoSteps: DemoStep[] = [
  {
    id: 1,
    phase: 'Phase 1: Research',
    phaseIcon: Brain,
    title: 'Market Research Analysis',
    description: 'CEO Agent delegates market research to understand target audience and competition',
    agent: 'Market Research Agent',
    mcpServers: ['Perplexity', 'Browser Use', 'Data Scraping'],
    duration: 4000,
    output: 'Identified $2.4B market opportunity in sustainable fashion e-commerce',
  },
  {
    id: 2,
    phase: 'Phase 1: Research',
    phaseIcon: Brain,
    title: 'Trend Analysis',
    description: 'Analyzing emerging trends and consumer behavior patterns',
    agent: 'Trend Prediction Agent',
    mcpServers: ['Perplexity', 'Twitter', 'Google Trends'],
    duration: 3500,
    output: 'Gen-Z sustainability interest up 340% YoY. High demand for eco-friendly fashion.',
  },
  {
    id: 3,
    phase: 'Phase 2: Branding',
    phaseIcon: Palette,
    title: 'Brand Identity Creation',
    description: 'Generating unique brand identity including logo, colors, and voice',
    agent: 'Brand Identity Agent',
    mcpServers: ['Canva', 'Fal AI', '21st Dev'],
    duration: 4500,
    output: 'Created "EcoThread" brand with forest green palette and sustainability-first messaging',
  },
  {
    id: 4,
    phase: 'Phase 2: Branding',
    phaseIcon: Palette,
    title: 'Visual Design System',
    description: 'Building comprehensive design system for all brand touchpoints',
    agent: 'Visual Design Agent',
    mcpServers: ['Canva', 'Fal AI', 'Shadcn'],
    duration: 3000,
    output: 'Generated 50+ brand assets, typography system, and component library',
  },
  {
    id: 5,
    phase: 'Phase 3: Development',
    phaseIcon: Code,
    title: 'Website Generation',
    description: 'Building fully responsive e-commerce website with the brand identity',
    agent: 'Code Builder Agent',
    mcpServers: ['21st Dev', 'Shadcn', 'Playwright'],
    duration: 5000,
    output: 'Generated 12-page responsive website with integrated checkout',
  },
  {
    id: 6,
    phase: 'Phase 3: Development',
    phaseIcon: Code,
    title: 'QA Testing',
    description: 'Running automated tests across all pages and user flows',
    agent: 'QA Testing Agent',
    mcpServers: ['Playwright', 'Browser Use', 'Chrome'],
    duration: 3500,
    output: '98.5% test pass rate. Fixed 3 responsive issues automatically.',
  },
  {
    id: 7,
    phase: 'Phase 4: Content',
    phaseIcon: FileText,
    title: 'Content Creation',
    description: 'Generating SEO-optimized content for all pages and products',
    agent: 'Content Creator Agent',
    mcpServers: ['Perplexity', 'Content Core', 'Fal AI'],
    duration: 4000,
    output: 'Created 45 product descriptions, 12 blog posts, and homepage copy',
  },
  {
    id: 8,
    phase: 'Phase 4: Content',
    phaseIcon: FileText,
    title: 'SEO Optimization',
    description: 'Implementing technical SEO and content optimization',
    agent: 'SEO Optimization Agent',
    mcpServers: ['Perplexity', 'Browser Use', 'Data Scraping'],
    duration: 3000,
    output: 'Optimized for 125 keywords. Projected organic traffic: 15K/month',
  },
  {
    id: 9,
    phase: 'Phase 5: Marketing',
    phaseIcon: Megaphone,
    title: 'Social Media Campaign',
    description: 'Launching multi-platform social media presence and campaigns',
    agent: 'Social Media Manager',
    mcpServers: ['Twitter', 'Facebook', 'LinkedIn', 'YouTube'],
    duration: 4000,
    output: 'Scheduled 90-day content calendar across 4 platforms',
  },
  {
    id: 10,
    phase: 'Phase 5: Marketing',
    phaseIcon: Megaphone,
    title: 'Paid Advertising Setup',
    description: 'Configuring and launching targeted ad campaigns',
    agent: 'Paid Ads Specialist',
    mcpServers: ['Google Ads', 'Facebook Ads', 'Stripe'],
    duration: 3500,
    output: 'Launched $5K test budget across Google & Meta. CPA target: $12',
  },
  {
    id: 11,
    phase: 'Phase 6: Sales',
    phaseIcon: DollarSign,
    title: 'Sales Funnel Activation',
    description: 'Setting up automated sales sequences and lead nurturing',
    agent: 'Sales Development Agent',
    mcpServers: ['Stripe', 'WhatsApp', 'Call Center', 'Vapi'],
    duration: 4000,
    output: 'Activated 5-stage funnel with automated follow-ups',
  },
  {
    id: 12,
    phase: 'Phase 6: Sales',
    phaseIcon: DollarSign,
    title: 'Go Live!',
    description: 'Business is now fully operational and generating revenue',
    agent: 'CEO Agent',
    mcpServers: ['All Systems'],
    duration: 2000,
    output: 'EcoThread launched! First 48 hours: $4,250 revenue, 89 customers',
  },
];

const LiveDemoPage = () => {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  const currentDemo = demoSteps[currentStep];
  const totalDuration = demoSteps.reduce((acc, step) => acc + step.duration, 0);
  const completedDuration = demoSteps
    .slice(0, currentStep)
    .reduce((acc, step) => acc + step.duration, 0);
  const overallProgress = ((completedDuration + (progress / 100) * (currentDemo?.duration || 0)) / totalDuration) * 100;

  useEffect(() => {
    if (isPlaying && currentStep < demoSteps.length) {
      const step = demoSteps[currentStep];
      const increment = 100 / (step.duration / 50);
      
      progressInterval.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setCompletedSteps((prev) => [...prev, currentStep]);
            setCurrentStep((prev) => prev + 1);
            return 0;
          }
          return prev + increment;
        });
      }, 50);

      return () => {
        if (progressInterval.current) clearInterval(progressInterval.current);
      };
    } else if (currentStep >= demoSteps.length) {
      setIsPlaying(false);
    }
  }, [isPlaying, currentStep]);

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
    setProgress(0);
    setCompletedSteps([]);
  };

  const handleTogglePlay = () => {
    if (currentStep >= demoSteps.length) {
      handleReset();
      setTimeout(() => setIsPlaying(true), 100);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Live Demo - ShelVey | Watch AI Build a Business</title>
        <meta name="description" content="Watch ShelVey's AI agents build a complete business in real-time. See the full 6-phase workflow in action." />
      </Helmet>
      
      <Navbar />
      
      <main className="pt-24 pb-20">
        {/* Header */}
        <section className="container mx-auto px-4 text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Badge variant="outline" className="mb-6 px-4 py-2">
              <Sparkles className="w-4 h-4 mr-2" />
              Interactive Demo
            </Badge>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-foreground">Watch AI Build a</span>
              <span className="text-gradient"> Business Live</span>
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Experience ShelVey's autonomous business building pipeline. 
              25 AI agents, 27 MCP servers, 6 phases - all working together.
            </p>
          </motion.div>
        </section>

        {/* Demo Controls */}
        <section className="container mx-auto px-4 mb-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-4 mb-6">
              <Button
                size="lg"
                onClick={handleTogglePlay}
                className="px-8"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-5 h-5 mr-2" />
                    Pause Demo
                  </>
                ) : currentStep >= demoSteps.length ? (
                  <>
                    <RotateCcw className="w-5 h-5 mr-2" />
                    Restart Demo
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    {currentStep === 0 ? 'Start Demo' : 'Resume Demo'}
                  </>
                )}
              </Button>
              
              <Button variant="outline" size="lg" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>

            {/* Overall Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-medium">{Math.round(overallProgress)}%</span>
              </div>
              <Progress value={overallProgress} className="h-3" />
            </div>
          </div>
        </section>

        {/* Main Demo Area */}
        <section className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-8">
            {/* Current Activity */}
            <div className="lg:col-span-2 space-y-6">
              <AnimatePresence mode="wait">
                {currentDemo && currentStep < demoSteps.length && (
                  <motion.div
                    key={currentDemo.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card className="border-primary/50 bg-card/80 backdrop-blur">
                      <CardHeader>
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <currentDemo.phaseIcon className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <Badge variant="secondary">{currentDemo.phase}</Badge>
                            <CardTitle className="text-xl mt-1">{currentDemo.title}</CardTitle>
                          </div>
                        </div>
                        <p className="text-muted-foreground">{currentDemo.description}</p>
                      </CardHeader>
                      
                      <CardContent className="space-y-6">
                        {/* Agent Info */}
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                          <Bot className="w-8 h-8 text-primary" />
                          <div>
                            <p className="text-sm text-muted-foreground">Active Agent</p>
                            <p className="font-semibold">{currentDemo.agent}</p>
                          </div>
                          <div className="ml-auto flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-sm text-emerald-500">Processing</span>
                          </div>
                        </div>

                        {/* MCP Servers */}
                        <div>
                          <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
                            <Server className="w-4 h-4" />
                            Active MCP Servers
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {currentDemo.mcpServers.map((server) => (
                              <Badge key={server} variant="outline" className="animate-pulse">
                                {server}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Task Progress</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>

                        {/* Output Preview */}
                        {progress > 60 && currentDemo.output && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-4 rounded-xl bg-primary/5 border border-primary/20"
                          >
                            <p className="text-sm text-muted-foreground mb-1">Output Preview</p>
                            <p className="text-sm font-medium">{currentDemo.output}</p>
                          </motion.div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Completion State */}
              {currentStep >= demoSteps.length && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Card className="border-emerald-500/50 bg-emerald-500/5">
                    <CardContent className="pt-8 text-center">
                      <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                      </div>
                      <h2 className="text-2xl font-bold mb-2">Business Successfully Launched!</h2>
                      <p className="text-muted-foreground mb-6">
                        EcoThread is now live and generating revenue. All 6 phases completed in under 3 minutes.
                      </p>
                      <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="p-4 rounded-xl bg-card">
                          <p className="text-2xl font-bold text-emerald-500">$4,250</p>
                          <p className="text-sm text-muted-foreground">First 48h Revenue</p>
                        </div>
                        <div className="p-4 rounded-xl bg-card">
                          <p className="text-2xl font-bold text-primary">89</p>
                          <p className="text-sm text-muted-foreground">Customers</p>
                        </div>
                        <div className="p-4 rounded-xl bg-card">
                          <p className="text-2xl font-bold">12</p>
                          <p className="text-sm text-muted-foreground">Pages Built</p>
                        </div>
                      </div>
                      <Button size="lg" onClick={() => navigate('/auth')}>
                        Build Your Business Now
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>

            {/* Timeline */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Activity Timeline
              </h3>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {demoSteps.map((step, index) => {
                  const isCompleted = completedSteps.includes(index);
                  const isCurrent = index === currentStep;
                  
                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-3 rounded-xl border transition-all ${
                        isCurrent 
                          ? 'border-primary bg-primary/5' 
                          : isCompleted 
                            ? 'border-emerald-500/50 bg-emerald-500/5' 
                            : 'border-border/50 bg-card/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isCompleted 
                            ? 'bg-emerald-500' 
                            : isCurrent 
                              ? 'bg-primary animate-pulse' 
                              : 'bg-muted'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          ) : (
                            <span className="text-xs font-medium text-white">{index + 1}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${
                            isCurrent ? 'text-primary' : isCompleted ? 'text-emerald-400' : 'text-muted-foreground'
                          }`}>
                            {step.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {step.agent}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 mt-20">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="max-w-3xl mx-auto text-center p-8 rounded-3xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Ready to Build Your Autonomous Business?
            </h2>
            <p className="text-muted-foreground mb-6">
              Join hundreds of entrepreneurs using ShelVey to launch profitable businesses on autopilot.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate('/auth')}>
                <Zap className="w-5 h-5 mr-2" />
                Get Started Now
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/pricing')}>
                View Pricing
              </Button>
            </div>
          </motion.div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default LiveDemoPage;
