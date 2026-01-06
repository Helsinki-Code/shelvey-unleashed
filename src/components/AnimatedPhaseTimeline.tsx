import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check, Play, Lock, Sparkles, Zap, Palette, Code, Megaphone, Rocket, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Phase {
  id: string;
  phase_number: number;
  phase_name: string;
  status: string | null;
  started_at: string | null;
  completed_at: string | null;
}

interface AnimatedPhaseTimelineProps {
  phases: Phase[];
  projectId: string;
  currentPhase: number;
}

const PHASE_CONFIG = [
  { icon: Sparkles, label: 'Research', color: 'from-blue-500 to-cyan-500' },
  { icon: Palette, label: 'Branding', color: 'from-purple-500 to-pink-500' },
  { icon: Code, label: 'Development', color: 'from-green-500 to-emerald-500' },
  { icon: Megaphone, label: 'Marketing', color: 'from-orange-500 to-amber-500' },
  { icon: Rocket, label: 'Launch', color: 'from-red-500 to-rose-500' },
  { icon: TrendingUp, label: 'Growth', color: 'from-indigo-500 to-violet-500' },
];

export const AnimatedPhaseTimeline = ({ phases, projectId, currentPhase }: AnimatedPhaseTimelineProps) => {
  const navigate = useNavigate();
  const [hoveredPhase, setHoveredPhase] = useState<number | null>(null);

  const getPhaseStatus = (phaseNumber: number) => {
    const phase = phases.find(p => p.phase_number === phaseNumber);
    if (!phase) return 'locked';
    if (phase.status === 'completed') return 'completed';
    if (phase.status === 'active') return 'active';
    return 'locked';
  };

  const isClickable = (phaseNumber: number) => {
    const status = getPhaseStatus(phaseNumber);
    return status === 'completed' || status === 'active';
  };

  const handlePhaseClick = (phaseNumber: number) => {
    if (isClickable(phaseNumber)) {
      navigate(`/projects/${projectId}/phase/${phaseNumber}`);
    }
  };

  return (
    <div className="relative py-8">
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-2xl" />
      
      {/* Connection line */}
      <div className="absolute top-1/2 left-8 right-8 h-1 bg-muted rounded-full transform -translate-y-1/2 z-0">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-primary/50 rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: `${((currentPhase - 1) / 5) * 100}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
        />
      </div>

      {/* Phase nodes */}
      <div className="relative flex justify-between items-center px-4 z-10">
        {PHASE_CONFIG.map((config, index) => {
          const phaseNumber = index + 1;
          const status = getPhaseStatus(phaseNumber);
          const clickable = isClickable(phaseNumber);
          const Icon = config.icon;
          const isHovered = hoveredPhase === phaseNumber;
          const isActive = status === 'active';
          const isCompleted = status === 'completed';

          return (
            <motion.div
              key={phaseNumber}
              className="flex flex-col items-center gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {/* Phase node */}
              <motion.button
                onClick={() => handlePhaseClick(phaseNumber)}
                onMouseEnter={() => setHoveredPhase(phaseNumber)}
                onMouseLeave={() => setHoveredPhase(null)}
                disabled={!clickable}
                className={cn(
                  'relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300',
                  clickable ? 'cursor-pointer' : 'cursor-not-allowed',
                  isCompleted && 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30',
                  isActive && `bg-gradient-to-br ${config.color} shadow-lg animate-pulse`,
                  status === 'locked' && 'bg-muted/50 border-2 border-dashed border-muted-foreground/30'
                )}
                whileHover={clickable ? { scale: 1.1, rotate: 5 } : {}}
                whileTap={clickable ? { scale: 0.95 } : {}}
              >
                {/* Glow ring for active phase */}
                {isActive && (
                  <motion.div
                    className={cn('absolute inset-0 rounded-2xl bg-gradient-to-br', config.color)}
                    initial={{ opacity: 0.5, scale: 1 }}
                    animate={{ opacity: [0.5, 0.2, 0.5], scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}

                {/* Icon */}
                {isCompleted ? (
                  <Check className="w-7 h-7 text-white" />
                ) : isActive ? (
                  <Icon className="w-7 h-7 text-white" />
                ) : (
                  <Lock className="w-5 h-5 text-muted-foreground/50" />
                )}

                {/* Sparkle effects for active */}
                {isActive && (
                  <>
                    <motion.div
                      className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full"
                      animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <motion.div
                      className="absolute -bottom-1 -left-1 w-2 h-2 bg-white rounded-full"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0.3, 0.8] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: 0.3 }}
                    />
                  </>
                )}
              </motion.button>

              {/* Phase label */}
              <div className="text-center">
                <motion.p
                  className={cn(
                    'text-sm font-medium transition-colors',
                    isActive && 'text-primary',
                    isCompleted && 'text-green-500',
                    status === 'locked' && 'text-muted-foreground/50'
                  )}
                  animate={isHovered && clickable ? { scale: 1.05 } : { scale: 1 }}
                >
                  Phase {phaseNumber}
                </motion.p>
                <p className={cn(
                  'text-xs',
                  isActive || isCompleted ? 'text-muted-foreground' : 'text-muted-foreground/40'
                )}>
                  {config.label}
                </p>
              </div>

              {/* Tooltip on hover */}
              {isHovered && clickable && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 bg-popover border border-border rounded-lg px-3 py-2 shadow-xl z-20 whitespace-nowrap"
                >
                  <p className="text-sm font-medium">
                    {isActive ? 'Currently Active' : 'Completed'} - Click to enter
                  </p>
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-border" />
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Current phase indicator */}
      <motion.div
        className="mt-8 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">
            Currently on Phase {currentPhase}: {PHASE_CONFIG[currentPhase - 1]?.label || 'Unknown'}
          </span>
        </div>
      </motion.div>
    </div>
  );
};
