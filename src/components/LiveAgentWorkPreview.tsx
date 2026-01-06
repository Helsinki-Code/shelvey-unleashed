import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, CheckCircle2, Clock, Sparkles, Camera, ExternalLink, Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface WorkStep {
  id: string;
  action: string;
  status: string;
  timestamp: string;
  screenshotUrl?: string;
  url?: string;
}

interface LiveAgentWorkPreviewProps {
  agentId: string;
  agentName: string;
  projectId: string;
  className?: string;
}

export function LiveAgentWorkPreview({ agentId, agentName, projectId, className }: LiveAgentWorkPreviewProps) {
  const [workSteps, setWorkSteps] = useState<WorkStep[]>([]);
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [latestScreenshot, setLatestScreenshot] = useState<string | null>(null);

  useEffect(() => {
    // Fetch initial activities
    const fetchActivities = async () => {
      const { data } = await supabase
        .from('agent_activity_logs')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        const steps: WorkStep[] = data.map(a => ({
          id: a.id,
          action: a.action,
          status: a.status,
          timestamp: a.created_at,
          screenshotUrl: (a.metadata as any)?.screenshotUrl,
          url: (a.metadata as any)?.url,
        }));
        setWorkSteps(steps);
        
        const inProgress = data.find(a => a.status === 'in_progress');
        setCurrentAction(inProgress?.action || null);
        
        // Find latest screenshot
        const withScreenshot = data.find(a => (a.metadata as any)?.screenshotUrl);
        if (withScreenshot) {
          setLatestScreenshot((withScreenshot.metadata as any).screenshotUrl);
        }
      }
    };

    fetchActivities();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`agent-work-${agentId}-${projectId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'agent_activity_logs',
          filter: `agent_id=eq.${agentId}`
        },
        (payload) => {
          const newActivity = payload.new as any;
          const metadata = newActivity.metadata || {};
          
          setWorkSteps(prev => [{
            id: newActivity.id,
            action: newActivity.action,
            status: newActivity.status,
            timestamp: newActivity.created_at,
            screenshotUrl: metadata.screenshotUrl,
            url: metadata.url,
          }, ...prev.slice(0, 9)]);
          
          if (newActivity.status === 'in_progress') {
            setCurrentAction(newActivity.action);
          } else if (newActivity.status === 'completed') {
            setCurrentAction(null);
          }
          
          if (metadata.screenshotUrl) {
            setLatestScreenshot(metadata.screenshotUrl);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId, projectId]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return date.toLocaleTimeString();
  };

  return (
    <Card className={`border-primary/20 overflow-hidden ${className}`}>
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" />
          {agentName} - Live Work
          {currentAction && (
            <span className="ml-auto flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-normal text-muted-foreground">Working</span>
            </span>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Screenshot Preview */}
        <div className="aspect-video bg-muted/50 relative overflow-hidden border-b">
          <AnimatePresence mode="wait">
            {latestScreenshot ? (
              <motion.img
                key={latestScreenshot}
                src={latestScreenshot}
                alt="Agent work screenshot"
                className="w-full h-full object-cover"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              />
            ) : (
              <motion.div
                key="placeholder"
                className="w-full h-full flex flex-col items-center justify-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Camera className="w-8 h-8 text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground">Work preview will appear here</p>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Current Action Overlay */}
          {currentAction && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-3"
            >
              <div className="flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                <span className="text-xs font-medium truncate">{currentAction}</span>
              </div>
            </motion.div>
          )}
        </div>
        
        {/* Activity Timeline */}
        <ScrollArea className="h-[180px]">
          <div className="p-3 space-y-2">
            {workSteps.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Clock className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Waiting for agent to start work...</p>
              </div>
            ) : (
              workSteps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-2 text-xs"
                >
                  <div className={`mt-0.5 p-1 rounded-full ${
                    step.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                    step.status === 'in_progress' ? 'bg-primary/20 text-primary' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {step.status === 'completed' ? (
                      <CheckCircle2 className="w-2.5 h-2.5" />
                    ) : step.status === 'in_progress' ? (
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    ) : (
                      <Clock className="w-2.5 h-2.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-foreground">{step.action}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-muted-foreground">{formatTime(step.timestamp)}</span>
                      {step.url && (
                        <a 
                          href={step.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-0.5"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          Source
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
