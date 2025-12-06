import { motion } from 'framer-motion';
import { Check, Lock, Play } from 'lucide-react';

interface PhaseProgressIndicatorProps {
  currentPhase: number;
  totalPhases?: number;
  compact?: boolean;
}

const PHASES = [
  { number: 1, name: 'Research' },
  { number: 2, name: 'Branding' },
  { number: 3, name: 'Development' },
  { number: 4, name: 'Content' },
  { number: 5, name: 'Marketing' },
  { number: 6, name: 'Sales' },
];

export const PhaseProgressIndicator = ({ 
  currentPhase, 
  totalPhases = 6,
  compact = false 
}: PhaseProgressIndicatorProps) => {
  const phases = PHASES.slice(0, totalPhases);
  
  return (
    <div className={`w-full ${compact ? 'py-2' : 'py-4'}`}>
      <div className="relative">
        {/* Progress Track */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-muted -translate-y-1/2 rounded-full" />
        
        {/* Filled Progress */}
        <motion.div 
          className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${((currentPhase - 1) / (totalPhases - 1)) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
        
        {/* Phase Dots */}
        <div className="relative flex justify-between">
          {phases.map((phase) => {
            const isCompleted = phase.number < currentPhase;
            const isActive = phase.number === currentPhase;
            const isLocked = phase.number > currentPhase;
            
            return (
              <div key={phase.number} className="flex flex-col items-center">
                <motion.div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center z-10 border-2 transition-colors
                    ${isCompleted ? 'bg-primary border-primary text-primary-foreground' : ''}
                    ${isActive ? 'bg-primary/20 border-primary text-primary animate-pulse' : ''}
                    ${isLocked ? 'bg-muted border-muted-foreground/30 text-muted-foreground' : ''}
                  `}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: isActive ? 1.1 : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : isActive ? (
                    <Play className="w-3 h-3 fill-current" />
                  ) : (
                    <Lock className="w-3 h-3" />
                  )}
                </motion.div>
                
                {!compact && (
                  <span className={`
                    text-xs mt-2 font-medium
                    ${isCompleted || isActive ? 'text-primary' : 'text-muted-foreground'}
                  `}>
                    {phase.name}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
