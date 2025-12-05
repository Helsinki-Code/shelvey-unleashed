import { motion } from 'framer-motion';
import { ChevronLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConnectStepProps {
  connectedApps: string[];
  onToggle: (app: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const apps = [
  { 
    id: 'google', 
    name: 'Google', 
    description: 'Gmail, Calendar, Drive',
    icon: '🔵',
    color: 'from-blue-500/20 to-red-500/20'
  },
  { 
    id: 'social', 
    name: 'Social Media', 
    description: 'Twitter, LinkedIn, Instagram',
    icon: '📱',
    color: 'from-pink-500/20 to-purple-500/20'
  },
  { 
    id: 'stripe', 
    name: 'Stripe', 
    description: 'Accept payments',
    icon: '💳',
    color: 'from-indigo-500/20 to-violet-500/20'
  },
  { 
    id: 'github', 
    name: 'GitHub', 
    description: 'Code repositories',
    icon: '⚡',
    color: 'from-gray-500/20 to-slate-500/20'
  },
];

export const ConnectStep = ({ connectedApps, onToggle, onNext, onBack }: ConnectStepProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Supercharge your AI team?</h2>
        <p className="text-muted-foreground">
          Connect apps you already use to give your AI team more power. You can do this later too.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {apps.map((app) => {
          const isConnected = connectedApps.includes(app.id);
          return (
            <button
              key={app.id}
              onClick={() => onToggle(app.id)}
              className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                isConnected
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {isConnected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${app.color} flex items-center justify-center text-xl mb-2`}>
                {app.icon}
              </div>
              <p className="font-medium text-sm">{app.name}</p>
              <p className="text-xs text-muted-foreground">{app.description}</p>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>
        <Button variant="ghost" onClick={onNext} className="flex-1">
          Skip for now
        </Button>
        <Button onClick={onNext} disabled={connectedApps.length === 0}>
          Connect Apps
        </Button>
      </div>
    </motion.div>
  );
};
