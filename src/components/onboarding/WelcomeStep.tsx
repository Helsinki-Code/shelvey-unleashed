import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface WelcomeStepProps {
  name: string;
  onNameChange: (name: string) => void;
  onNext: () => void;
}

export const WelcomeStep = ({ name, onNameChange, onNext }: WelcomeStepProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Welcome to ShelVey! 🎉</h1>
        <p className="text-muted-foreground">
          I'm Ava, your AI CEO. I'll guide you through setting up your AI business team.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">What should I call you?</label>
        <Input
          placeholder="Enter your name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="text-lg"
          autoFocus
        />
      </div>

      <Button 
        onClick={onNext} 
        className="w-full"
        size="lg"
      >
        Continue →
      </Button>
    </motion.div>
  );
};
