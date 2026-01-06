import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Loader2, Zap, Palette, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StartPhaseButtonProps {
  projectId: string;
  phaseNumber: number;
  phaseStatus: string;
  onStart?: () => void;
  triggerImageGeneration?: () => void;
}

export const StartPhaseButton = ({
  projectId,
  phaseNumber,
  phaseStatus,
  onStart,
  triggerImageGeneration,
}: StartPhaseButtonProps) => {
  const [isStarting, setIsStarting] = useState(false);

  const handleStartPhase = async () => {
    setIsStarting(true);

    try {
      // For Phase 2, trigger image generation directly
      if (phaseNumber === 2 && triggerImageGeneration) {
        // Activate phase (server-side) then start generation
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;

        const { error: activateError } = await supabase.functions.invoke('coo-coordinator', {
          body: {
            action: 'activate_phase',
            projectId,
            phaseNumber,
            userId,
          },
        });

        if (activateError) throw activateError;

        toast.success('Phase 2 activated! Starting image generation...');
        triggerImageGeneration();
        if (onStart) onStart();
        setIsStarting(false);
        return;
      }

      // For other phases, use phase-auto-worker
      const { data, error } = await supabase.functions.invoke('phase-auto-worker', {
        body: {
          projectId,
          phaseNumber,
          action: 'start_phase',
        },
      });

      if (error) throw error;

      toast.success(`Phase ${phaseNumber} agents are now working!`);
      
      if (onStart) onStart();
    } catch (error) {
      console.error('Error starting phase:', error);
      toast.error('Failed to start phase agents');
    } finally {
      setIsStarting(false);
    }
  };

  // Don't show if phase is already completed
  if (phaseStatus === 'completed') return null;

  const isPhase2 = phaseNumber === 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Card className="border-primary/50 bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                {isPhase2 ? <Palette className="w-6 h-6 text-primary" /> : <Zap className="w-6 h-6 text-primary" />}
              </div>
              <div>
                <h3 className="font-bold text-lg">
                  {isPhase2 ? 'Generate Brand Assets' : `Start Phase ${phaseNumber} Agents`}
                </h3>
                <p className="text-muted-foreground">
                  {isPhase2 
                    ? 'Generate logos, icons, banners, and color palettes with AI'
                    : 'Click to activate AI agents and begin working on deliverables'
                  }
                </p>
              </div>
            </div>
            
            <Button
              size="lg"
              onClick={handleStartPhase}
              disabled={isStarting}
              className="gap-2 px-8"
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isPhase2 ? 'Starting Generation...' : 'Starting Agents...'}
                </>
              ) : (
                <>
                  {isPhase2 ? <Image className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPhase2 ? 'Generate Brand Assets' : `Start Phase ${phaseNumber}`}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
