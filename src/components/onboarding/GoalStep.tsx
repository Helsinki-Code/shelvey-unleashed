import { motion } from 'framer-motion';
import { Store, Laptop, Briefcase, PenTool, Lightbulb, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { OnboardingGoal } from './OnboardingWizard';

interface GoalStepProps {
  selectedGoal: OnboardingGoal | null;
  goalDescription?: string;
  onSelect: (goal: OnboardingGoal, description?: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const goals = [
  { id: 'store' as OnboardingGoal, icon: Store, label: 'An online store', description: 'Sell products online' },
  { id: 'saas' as OnboardingGoal, icon: Laptop, label: 'A SaaS product', description: 'Build software as a service' },
  { id: 'service' as OnboardingGoal, icon: Briefcase, label: 'A service business', description: 'Offer professional services' },
  { id: 'content' as OnboardingGoal, icon: PenTool, label: 'A content brand', description: 'Create content & media' },
  { id: 'other' as OnboardingGoal, icon: Lightbulb, label: 'Something else', description: 'Describe your idea' },
];

export const GoalStep = ({ selectedGoal, goalDescription, onSelect, onNext, onBack }: GoalStepProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">What would you like to build?</h2>
        <p className="text-muted-foreground">
          This helps us customize your AI team for your specific needs.
        </p>
      </div>

      <div className="space-y-3">
        {goals.map((goal) => (
          <button
            key={goal.id}
            onClick={() => onSelect(goal.id)}
            className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4 ${
              selectedGoal === goal.id
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
            }`}
          >
            <div className={`p-2 rounded-lg ${
              selectedGoal === goal.id ? 'bg-primary/10' : 'bg-muted'
            }`}>
              <goal.icon className={`w-5 h-5 ${
                selectedGoal === goal.id ? 'text-primary' : 'text-muted-foreground'
              }`} />
            </div>
            <div>
              <p className="font-medium">{goal.label}</p>
              <p className="text-sm text-muted-foreground">{goal.description}</p>
            </div>
          </button>
        ))}
      </div>

      {selectedGoal === 'other' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-2"
        >
          <label className="text-sm font-medium">Describe your idea</label>
          <Textarea
            placeholder="Tell us about what you want to build..."
            value={goalDescription || ''}
            onChange={(e) => onSelect('other', e.target.value)}
            rows={3}
          />
        </motion.div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>
        <Button 
          onClick={onNext} 
          className="flex-1"
          disabled={!selectedGoal || (selectedGoal === 'other' && !goalDescription)}
        >
          Continue →
        </Button>
      </div>
    </motion.div>
  );
};
