import { motion } from 'framer-motion';
import { ChevronLeft, Sparkles, MessageSquare, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OnboardingGoal } from './OnboardingWizard';

interface MeetCEOStepProps {
  name: string;
  goal: OnboardingGoal | null;
  onComplete: () => void;
  onBack: () => void;
}

const goalLabels: Record<OnboardingGoal, string> = {
  store: 'online store',
  saas: 'SaaS product',
  service: 'service business',
  content: 'content brand',
  other: 'business idea',
};

export const MeetCEOStep = ({ name, goal, onComplete, onBack }: MeetCEOStepProps) => {
  const displayName = name || 'there';
  const goalLabel = goal ? goalLabels[goal] : 'business';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center"
        >
          <Sparkles className="w-10 h-10 text-primary-foreground" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">You're all set! 🚀</h2>
        <p className="text-muted-foreground">
          Hey {displayName}! I'm Ava, your AI CEO, and I'm ready to help you build your {goalLabel}.
        </p>
      </div>

      <div className="bg-muted/50 rounded-xl p-4 space-y-3">
        <p className="font-medium text-sm">What happens next:</p>
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <MessageSquare className="w-3 h-3 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Tell me about your {goalLabel} idea in chat
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-3 h-3 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              I'll coordinate with our 25-member AI team to research, design, build, and market it
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Rocket className="w-3 h-3 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Watch your business come to life in days, not months!
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>
        <Button onClick={onComplete} className="flex-1 gap-2" size="lg">
          <MessageSquare className="w-4 h-4" />
          Start My First Project
        </Button>
      </div>
    </motion.div>
  );
};
