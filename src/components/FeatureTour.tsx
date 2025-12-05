import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface TourStep {
  title: string;
  description: string;
  target?: string; // CSS selector
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface FeatureTourProps {
  tourId: string;
  steps: TourStep[];
  onComplete: () => void;
  onSkip: () => void;
}

const TOUR_STEPS: Record<string, TourStep[]> = {
  dashboard: [
    {
      title: '👋 Welcome to Your Dashboard!',
      description: 'This is your command center. From here you can manage your AI team, projects, and watch your business grow.',
      position: 'center',
    },
    {
      title: '💬 Chat with Your CEO',
      description: 'The Quick Chat lets you talk to Ava, your AI CEO. Describe your business idea and she\'ll help make it happen.',
      target: '[data-tour="ceo-chat"]',
      position: 'right',
    },
    {
      title: '📋 Track Your Projects',
      description: 'See all your business projects here. Each project goes through 6 phases: Research → Branding → Building → Content → Marketing → Launch.',
      target: '[data-tour="projects"]',
      position: 'left',
    },
    {
      title: '📊 Team Activity Feed',
      description: 'Watch your AI team work in real-time! See completed tasks, work in progress, and items that need your attention.',
      target: '[data-tour="activity"]',
      position: 'top',
    },
    {
      title: '🎤 Voice Calls',
      description: 'You can have real-time voice conversations with any of your 25 AI agents. Perfect for brainstorming or quick updates!',
      target: '[data-tour="voice"]',
      position: 'bottom',
    },
  ],
  organization: [
    {
      title: '🏢 Your AI Organization',
      description: 'Meet your 25 AI agents! They\'re organized into departments just like a real company.',
      position: 'center',
    },
    {
      title: '📊 Department Structure',
      description: 'Each department has specialized agents: Research, Development, Marketing, Sales, and Operations.',
      position: 'center',
    },
    {
      title: '👥 Agent Collaboration',
      description: 'Agents work together automatically. The CEO delegates tasks and managers coordinate their teams.',
      position: 'center',
    },
  ],
  projects: [
    {
      title: '📁 Your Business Projects',
      description: 'Each project represents a business your AI team is building for you.',
      position: 'center',
    },
    {
      title: '🚀 Project Phases',
      description: 'Projects progress through 6 phases. Each phase must be completed before the next begins.',
      position: 'center',
    },
    {
      title: '✅ Deliverables',
      description: 'At each phase, your team creates deliverables (logos, websites, content). You review and approve them.',
      position: 'center',
    },
  ],
};

export const FeatureTour = ({ tourId, steps, onComplete, onSkip }: FeatureTourProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const tourSteps = steps.length > 0 ? steps : TOUR_STEPS[tourId] || [];
  const step = tourSteps[currentStep];

  useEffect(() => {
    if (step?.target) {
      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        // Calculate position based on step.position
        setPosition({
          top: rect.top + rect.height / 2,
          left: rect.left + rect.width / 2,
        });
      }
    }
  }, [currentStep, step]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!step) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100]"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

        {/* Tour Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className={`absolute ${
            step.position === 'center' 
              ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' 
              : ''
          }`}
          style={step.position !== 'center' ? {
            top: position.top,
            left: position.left,
          } : undefined}
        >
          <Card className="w-[400px] shadow-2xl border-primary/20">
            <CardContent className="p-6">
              {/* Progress */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-1">
                  {tourSteps.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 w-8 rounded-full transition-colors ${
                        i <= currentStep ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
                <Button variant="ghost" size="icon" onClick={onSkip}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Content */}
              <div className="space-y-3">
                <h3 className="text-xl font-bold">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6">
                <Button
                  variant="ghost"
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>

                <span className="text-sm text-muted-foreground">
                  {currentStep + 1} of {tourSteps.length}
                </span>

                <Button onClick={handleNext}>
                  {currentStep === tourSteps.length - 1 ? (
                    <>
                      Get Started
                      <Sparkles className="w-4 h-4 ml-1" />
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Hook to manage tour state
export const useTour = (tourId: string) => {
  const [showTour, setShowTour] = useState(false);
  const storageKey = `tour_completed_${tourId}`;

  useEffect(() => {
    const completed = localStorage.getItem(storageKey);
    if (!completed) {
      // Small delay to let page render first
      setTimeout(() => setShowTour(true), 500);
    }
  }, [storageKey]);

  const completeTour = () => {
    localStorage.setItem(storageKey, 'true');
    setShowTour(false);
  };

  const skipTour = () => {
    localStorage.setItem(storageKey, 'true');
    setShowTour(false);
  };

  const resetTour = () => {
    localStorage.removeItem(storageKey);
    setShowTour(true);
  };

  return { showTour, completeTour, skipTour, resetTour };
};
