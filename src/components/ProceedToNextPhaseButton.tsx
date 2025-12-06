import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProceedToNextPhaseButtonProps {
  projectId: string;
  currentPhaseNumber: number;
  isPhaseApproved: boolean;
  onProceed?: () => void;
}

const PHASE_NAMES = [
  'Research & Discovery',
  'Branding & Identity',
  'Development',
  'Content Creation',
  'Marketing & Ads',
  'Sales & Growth',
];

export const ProceedToNextPhaseButton = ({
  projectId,
  currentPhaseNumber,
  isPhaseApproved,
  onProceed,
}: ProceedToNextPhaseButtonProps) => {
  const navigate = useNavigate();
  const [isProceeding, setIsProceeding] = useState(false);

  const handleProceedToNextPhase = async () => {
    if (!isPhaseApproved) {
      toast.error('All deliverables must be approved before proceeding');
      return;
    }

    setIsProceeding(true);

    try {
      // Call phase-manager to advance to next phase
      const { data, error } = await supabase.functions.invoke('phase-manager', {
        body: {
          action: 'advance_phase',
          projectId,
          currentPhaseNumber,
        },
      });

      if (error) throw error;

      toast.success(`Proceeding to Phase ${currentPhaseNumber + 1}: ${PHASE_NAMES[currentPhaseNumber]}`);
      
      // Navigate to next phase page
      navigate(`/projects/${projectId}/phase/${currentPhaseNumber + 1}`);
      
      if (onProceed) onProceed();
    } catch (error) {
      console.error('Error advancing phase:', error);
      toast.error('Failed to advance to next phase');
    } finally {
      setIsProceeding(false);
    }
  };

  // Don't show button on phase 6 (final phase)
  if (currentPhaseNumber >= 6) {
    return isPhaseApproved ? (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8"
      >
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold text-primary mb-2">
              Congratulations! All Phases Complete!
            </h3>
            <p className="text-muted-foreground">
              Your business is fully set up and ready for launch.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    ) : null;
  }

  if (!isPhaseApproved) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8"
    >
      <Card className="border-primary/50 bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Phase {currentPhaseNumber} Complete!</h3>
                <p className="text-muted-foreground">
                  All deliverables approved. Ready for Phase {currentPhaseNumber + 1}: {PHASE_NAMES[currentPhaseNumber]}
                </p>
              </div>
            </div>
            
            <Button
              size="lg"
              onClick={handleProceedToNextPhase}
              disabled={isProceeding}
              className="gap-2 px-8"
            >
              {isProceeding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Proceeding...
                </>
              ) : (
                <>
                  Proceed to Phase {currentPhaseNumber + 1}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
