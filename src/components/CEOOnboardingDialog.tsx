import { useState, useEffect, useCallback } from 'react';
import { Bot, Send, Loader2, ArrowRight, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface CEOOnboardingDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  projectDescription: string;
}

const ONBOARDING_QUESTIONS = [
  "What's your primary goal with this business? (e.g., generate passive income, build a brand, create a side hustle)",
  "Who is your ideal customer? Describe them briefly.",
  "What makes your business unique compared to competitors?",
];

export const CEOOnboardingDialog = ({
  open,
  onClose,
  projectId,
  projectName,
  projectDescription,
}: CEOOnboardingDialogProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [collectedAnswers, setCollectedAnswers] = useState<string[]>([]);

  useEffect(() => {
    if (open && messages.length === 0) {
      // Initial greeting from CEO
      setMessages([
        {
          role: 'assistant',
          content: `Excellent! I'm thrilled to start working on "${projectName}" with you! 🎯\n\nBefore we dive into Phase 1, I'd like to ask you a few quick questions to ensure our AI agents can deliver the best results.\n\n${ONBOARDING_QUESTIONS[0]}`,
        },
      ]);
    }
  }, [open, projectName, messages.length]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading || !user) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setCollectedAnswers(prev => [...prev, userMessage]);
    setIsLoading(true);

    const nextIndex = currentQuestionIndex + 1;

    // If we have more questions, ask the next one
    if (nextIndex < ONBOARDING_QUESTIONS.length) {
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: `Great insight! Here's my next question:\n\n${ONBOARDING_QUESTIONS[nextIndex]}` },
        ]);
        setCurrentQuestionIndex(nextIndex);
        setIsLoading(false);
      }, 800);
    } else {
      // All questions answered - save to project and close
      try {
        const enhancedDescription = {
          original: projectDescription,
          businessGoal: collectedAnswers[0] || userMessage,
          idealCustomer: collectedAnswers[1] || '',
          uniqueValue: collectedAnswers.length >= 2 ? userMessage : '',
        };

        await supabase
          .from('business_projects')
          .update({
            description: JSON.stringify(enhancedDescription),
            updated_at: new Date().toISOString(),
          })
          .eq('id', projectId);

        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: `Perfect! I've gathered all the insights I need. 🚀\n\nOur AI agents will now use this information to:\n• Conduct targeted market research\n• Create a brand identity that resonates with your ideal customers\n• Develop messaging that highlights your unique value\n\nLet's begin! Click "Start Phase 1" to activate the research agents.`,
          },
        ]);

        toast.success('Project insights saved!');
      } catch (error) {
        console.error('Failed to save onboarding data:', error);
        toast.error('Failed to save insights');
      } finally {
        setIsLoading(false);
      }
    }
  }, [input, isLoading, user, currentQuestionIndex, collectedAnswers, projectId, projectDescription]);

  const progress = ((currentQuestionIndex + (collectedAnswers.length > currentQuestionIndex ? 1 : 0)) / ONBOARDING_QUESTIONS.length) * 100;
  const isComplete = collectedAnswers.length >= ONBOARDING_QUESTIONS.length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl h-[70vh] flex flex-col" aria-describedby="ceo-onboarding-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            Quick Chat with Your CEO
          </DialogTitle>
          <DialogDescription id="ceo-onboarding-description">
            Answer a few questions to help your AI team understand your vision.
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-1 text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-4 border-t">
          {isComplete ? (
            <Button onClick={onClose} className="w-full gap-2">
              Start Phase 1
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                placeholder="Type your answer..."
                className="min-h-[50px] resize-none"
                disabled={isLoading}
              />
              <Button onClick={sendMessage} disabled={isLoading || !input.trim()} size="icon">
                <Send className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
