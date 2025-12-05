import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { WelcomeStep } from './WelcomeStep';
import { GoalStep } from './GoalStep';
import { ConnectStep } from './ConnectStep';
import { MeetCEOStep } from './MeetCEOStep';

export type OnboardingGoal = 'store' | 'saas' | 'service' | 'content' | 'other';

interface OnboardingData {
  name: string;
  goal: OnboardingGoal | null;
  goalDescription?: string;
  connectedApps: string[];
}

export const OnboardingWizard = () => {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    name: '',
    goal: null,
    connectedApps: [],
  });

  const totalSteps = 4;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    // Save onboarding data
    await supabase
      .from('profiles')
      .update({
        full_name: data.name || undefined,
        onboarding_completed: true,
        onboarding_goal: data.goal,
      })
      .eq('id', user.id);

    await refreshProfile();
    navigate('/dashboard');
  };

  const updateData = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-lg"
      >
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Step {step} of {totalSteps}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-accent"
              initial={{ width: 0 }}
              animate={{ width: `${(step / totalSteps) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="bg-card border rounded-2xl p-8 shadow-xl">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <WelcomeStep
                key="welcome"
                name={data.name}
                onNameChange={(name) => updateData({ name })}
                onNext={handleNext}
              />
            )}
            {step === 2 && (
              <GoalStep
                key="goal"
                selectedGoal={data.goal}
                goalDescription={data.goalDescription}
                onSelect={(goal, description) => updateData({ goal, goalDescription: description })}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}
            {step === 3 && (
              <ConnectStep
                key="connect"
                connectedApps={data.connectedApps}
                onToggle={(app) => {
                  const apps = data.connectedApps.includes(app)
                    ? data.connectedApps.filter(a => a !== app)
                    : [...data.connectedApps, app];
                  updateData({ connectedApps: apps });
                }}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}
            {step === 4 && (
              <MeetCEOStep
                key="meet-ceo"
                name={data.name}
                goal={data.goal}
                onComplete={handleComplete}
                onBack={handleBack}
              />
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
