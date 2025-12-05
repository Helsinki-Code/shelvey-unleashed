import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Store, Laptop, Briefcase, FileText, ArrowRight, 
  ArrowLeft, Check, User, Target, Plug, Bot
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface OnboardingWizardProps {
  onComplete: () => void;
}

const GOALS = [
  { id: 'store', label: 'An online store', icon: Store, description: 'Sell products online with automated marketing' },
  { id: 'saas', label: 'A SaaS product', icon: Laptop, description: 'Build and launch a software service' },
  { id: 'service', label: 'A service business', icon: Briefcase, description: 'Offer professional services to clients' },
  { id: 'content', label: 'A content brand', icon: FileText, description: 'Create content and build an audience' },
];

export const OnboardingWizard = ({ onComplete }: OnboardingWizardProps) => {
  const { user, profile } = useAuth();
  const [step, setStep] = useState(1);
  const [name, setName] = useState(profile?.full_name || '');
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = () => {
    if (step < 4) {
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
    
    setIsLoading(true);
    try {
      await supabase
        .from('profiles')
        .update({
          full_name: name,
          onboarding_completed: true,
          onboarding_goal: selectedGoal,
        })
        .eq('id', user.id);
      
      onComplete();
    } catch (error) {
      console.error('Onboarding error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Welcome to ShelVey! 🎉</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                I'm <span className="text-primary font-semibold">Ava</span>, your AI CEO. 
                I'll guide you through setting up your AI business team.
              </p>
            </div>
            
            <div className="space-y-4 max-w-sm mx-auto">
              <label className="block text-sm font-medium">What should I call you?</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="text-center text-lg"
              />
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <Target className="w-12 h-12 mx-auto text-primary" />
              <h2 className="text-2xl font-bold">What would you like to build?</h2>
              <p className="text-muted-foreground">Choose your business type - we'll customize your experience</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {GOALS.map((goal) => (
                <Card
                  key={goal.id}
                  className={`cursor-pointer transition-all hover:border-primary/50 ${
                    selectedGoal === goal.id ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => setSelectedGoal(goal.id)}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${selectedGoal === goal.id ? 'bg-primary/20' : 'bg-muted'}`}>
                      <goal.icon className={`w-6 h-6 ${selectedGoal === goal.id ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{goal.label}</h3>
                      <p className="text-sm text-muted-foreground">{goal.description}</p>
                    </div>
                    {selectedGoal === goal.id && (
                      <Check className="w-5 h-5 text-primary ml-auto" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <Plug className="w-12 h-12 mx-auto text-primary" />
              <h2 className="text-2xl font-bold">Supercharge Your AI Team</h2>
              <p className="text-muted-foreground">Connect apps you already use (optional - you can do this later)</p>
            </div>
            
            <div className="max-w-md mx-auto space-y-3">
              {[
                { name: 'Google', desc: 'Gmail, Calendar, Drive', connected: false },
                { name: 'Social Media', desc: 'Twitter, LinkedIn', connected: false },
                { name: 'Stripe', desc: 'Payments & Invoicing', connected: false },
              ].map((app) => (
                <Card key={app.name} className="hover:border-primary/30 transition-all">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{app.name}</h3>
                      <p className="text-sm text-muted-foreground">{app.desc}</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Connect
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <p className="text-center text-sm text-muted-foreground">
              Don't worry, you can always connect these later from Settings
            </p>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6 text-center"
          >
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Bot className="w-12 h-12 text-primary-foreground" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">You're All Set! 🚀</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Hi <span className="text-primary font-semibold">{name || 'there'}</span>! 
                Your AI CEO Ava and 24 specialist agents are ready to help you build your{' '}
                {GOALS.find(g => g.id === selectedGoal)?.label.toLowerCase() || 'business'}.
              </p>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 max-w-md mx-auto">
              <h3 className="font-semibold mb-2">What happens next?</h3>
              <ul className="text-sm text-muted-foreground space-y-2 text-left">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>Describe your business idea to Ava</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>Your AI team researches and validates the market</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>They build branding, website, content & more</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>Launch and grow with AI-powered marketing</span>
                </li>
              </ul>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl">
        <CardContent className="p-8">
          {/* Progress */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-2 w-12 rounded-full transition-all ${
                  s <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 1}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <span className="text-sm text-muted-foreground">Step {step} of 4</span>

            {step < 4 ? (
              <Button
                onClick={handleNext}
                disabled={(step === 1 && !name) || (step === 2 && !selectedGoal)}
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={isLoading}>
                {isLoading ? 'Setting up...' : 'Start My First Project'}
                <Sparkles className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
