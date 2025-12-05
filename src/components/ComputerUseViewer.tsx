import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Play, Square, RefreshCw, MousePointer, Keyboard, ArrowUp, ArrowDown, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Action {
  step: number;
  action: string;
  selector?: string;
  value?: string;
  reasoning: string;
  screenshot?: string;
  timestamp: string;
}

interface ComputerUseViewerProps {
  agentId?: string;
  onComplete?: (result: any) => void;
}

const ComputerUseViewer: React.FC<ComputerUseViewerProps> = ({
  agentId = 'research-agent',
  onComplete,
}) => {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [objective, setObjective] = useState('');
  const [startUrl, setStartUrl] = useState('https://google.com');
  const [currentScreenshot, setCurrentScreenshot] = useState<string | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  const startTask = async () => {
    if (!objective.trim()) {
      toast({
        title: "Objective Required",
        description: "Please enter an objective for the browser automation",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    setActions([]);
    setCurrentStep(0);

    try {
      const { data, error } = await supabase.functions.invoke('computer-use-agent', {
        body: {
          action: 'run_automated_task',
          task: {
            taskId: crypto.randomUUID(),
            userId: 'current-user',
            agentId,
            objective,
            startUrl,
            maxSteps: 15,
          },
        },
      });

      if (error) throw error;

      if (data?.success) {
        setActions(data.actions || []);
        if (data.actions?.length > 0) {
          setCurrentScreenshot(data.actions[data.actions.length - 1].screenshot);
        }
        toast({
          title: data.completed ? "Task Completed" : "Max Steps Reached",
          description: `Completed ${data.stepsTaken} steps`,
        });
        onComplete?.(data);
      } else {
        throw new Error(data?.error || 'Task failed');
      }
    } catch (error) {
      console.error('Computer use error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to run task',
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const stopTask = () => {
    setIsRunning(false);
    toast({
      title: "Task Stopped",
      description: "Browser automation has been stopped",
    });
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'click': return <MousePointer className="w-4 h-4" />;
      case 'type': return <Keyboard className="w-4 h-4" />;
      case 'scroll': return <ArrowUp className="w-4 h-4" />;
      case 'navigate': return <RefreshCw className="w-4 h-4" />;
      case 'screenshot': return <Camera className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Viewer */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5 text-primary" />
              Browser View
              {isRunning && (
                <Badge variant="secondary" className="ml-auto animate-pulse">
                  Running...
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Screenshot Display */}
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border border-border">
              {currentScreenshot ? (
                <img
                  src={currentScreenshot}
                  alt="Browser screenshot"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Monitor className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No screenshot available</p>
                    <p className="text-sm">Start a task to see browser activity</p>
                  </div>
                </div>
              )}
              
              {/* Loading overlay */}
              <AnimatePresence>
                {isRunning && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-background/80 flex items-center justify-center"
                  >
                    <div className="text-center">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                      <p className="text-sm">Step {currentStep + 1} in progress...</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Controls */}
            <div className="mt-4 space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Start URL"
                  value={startUrl}
                  onChange={(e) => setStartUrl(e.target.value)}
                  className="flex-1"
                />
              </div>
              <Textarea
                placeholder="Enter objective (e.g., 'Search for AI business trends and summarize the top 5 results')"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                {!isRunning ? (
                  <Button onClick={startTask} className="flex-1">
                    <Play className="w-4 h-4 mr-2" />
                    Start Task
                  </Button>
                ) : (
                  <Button onClick={stopTask} variant="destructive" className="flex-1">
                    <Square className="w-4 h-4 mr-2" />
                    Stop
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action History */}
      <div className="space-y-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Action History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              <AnimatePresence>
                {actions.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">
                    No actions yet. Start a task to see the action history.
                  </p>
                ) : (
                  actions.map((action, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        index === currentStep
                          ? 'bg-primary/10 border-primary/50'
                          : 'bg-muted/50 border-border/50 hover:bg-muted'
                      }`}
                      onClick={() => {
                        setCurrentStep(index);
                        if (action.screenshot) {
                          setCurrentScreenshot(action.screenshot);
                        }
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          Step {action.step + 1}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {getActionIcon(action.action)}
                          <span className="capitalize">{action.action}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {action.reasoning}
                      </p>
                      {action.selector && (
                        <code className="text-xs text-primary/70 block mt-1 truncate">
                          {action.selector}
                        </code>
                      )}
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{actions.length}</p>
                <p className="text-xs text-muted-foreground">Total Steps</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{currentStep + 1}</p>
                <p className="text-xs text-muted-foreground">Current Step</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ComputerUseViewer;
