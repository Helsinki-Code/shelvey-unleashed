import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Zap, Clock, Activity, Users, ChevronRight, Volume2, VolumeX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

// Sound notification utility
const createNotificationSound = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  return {
    playActivitySound: () => {
      // Create a pleasant "pop" sound for new activity
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
      oscillator.frequency.exponentialRampToValueAtTime(1760, audioContext.currentTime + 0.05);
      oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    },
    playCompletionSound: () => {
      // Create a pleasant "ding" for completed tasks
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
      
      gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.4);
    },
    resume: () => {
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
    }
  };
};

interface AgentActivity {
  id: string;
  agent_id: string;
  agent_name: string;
  action: string;
  status: string;
  created_at: string;
  metadata: {
    deliverable_id?: string;
    deliverable_name?: string;
    phase_name?: string;
    mcp_server?: string;
    project_name?: string;
    [key: string]: any;
  };
}

export const GlobalAgentActivityPanel = () => {
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [activeAgents, setActiveAgents] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundRef = useRef<ReturnType<typeof createNotificationSound> | null>(null);
  const isInitialLoad = useRef(true);

  // Initialize sound system
  useEffect(() => {
    soundRef.current = createNotificationSound();
  }, []);

  // Play notification sound
  const playSound = useCallback((type: 'activity' | 'completion') => {
    if (!soundEnabled || !soundRef.current) return;
    soundRef.current.resume();
    if (type === 'completion') {
      soundRef.current.playCompletionSound();
    } else {
      soundRef.current.playActivitySound();
    }
  }, [soundEnabled]);

  useEffect(() => {
    // Fetch recent activities
    const fetchActivities = async () => {
      const { data, error } = await supabase
        .from('agent_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setActivities(data as AgentActivity[]);
        // Determine which agents are currently working (activity in last 2 minutes)
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        const working = new Set<string>();
        data.forEach((activity) => {
          if (new Date(activity.created_at) > twoMinutesAgo && 
              (activity.status === 'working' || activity.status === 'in_progress')) {
            working.add(activity.agent_id);
          }
        });
        setActiveAgents(working);
      }
      setIsLoading(false);
      isInitialLoad.current = false;
    };

    fetchActivities();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('global-agent-activity')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_activity_logs',
        },
        (payload) => {
          const newActivity = payload.new as AgentActivity;
          setActivities((prev) => [newActivity, ...prev.slice(0, 19)]);
          
          // Play sound notification (only if not initial load)
          if (!isInitialLoad.current) {
            if (newActivity.status === 'completed') {
              playSound('completion');
            } else {
              playSound('activity');
            }
          }
          
          // Update active agents
          if (newActivity.status === 'working' || newActivity.status === 'in_progress') {
            setActiveAgents((prev) => new Set([...prev, newActivity.agent_id]));
          } else if (newActivity.status === 'completed') {
            setActiveAgents((prev) => {
              const next = new Set(prev);
              next.delete(newActivity.agent_id);
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playSound]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working':
      case 'in_progress':
        return 'bg-primary/20 text-primary border-primary/30';
      case 'completed':
        return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-500 border-red-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const getAgentIcon = (agentName: string) => {
    // Map agent names to emoji icons
    const iconMap: Record<string, string> = {
      'Market Research Agent': '🔍',
      'Trend Prediction Agent': '📈',
      'Brand Identity Agent': '🎨',
      'Content Creator Agent': '✍️',
      'SEO Optimization Agent': '🔎',
      'Social Media Manager': '📱',
      'Sales Development Agent': '💼',
      'CEO Agent': '👔',
      'COO Agent': '📊',
    };
    return iconMap[agentName] || '🤖';
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Agent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Agent Activity
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute notifications' : 'Enable notifications'}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-primary" />
              ) : (
                <VolumeX className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
            <Badge variant="outline" className="gap-1">
              <Users className="w-3 h-3" />
              {activeAgents.size} Active
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Bot className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">No recent agent activity</p>
            <p className="text-xs">Agents will appear here when working</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] px-4">
            <div className="space-y-2 pb-4">
              <AnimatePresence mode="popLayout">
                {activities.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="group"
                  >
                    <div className="p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors">
                      <div className="flex items-start gap-3">
                        {/* Agent Avatar */}
                        <div className="relative flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                            {getAgentIcon(activity.agent_name)}
                          </div>
                          {activeAgents.has(activity.agent_id) && (
                            <motion.div
                              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-background"
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ repeat: Infinity, duration: 1.5 }}
                            />
                          )}
                        </div>

                        {/* Activity Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">
                              {activity.agent_name}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] px-1.5 py-0 ${getStatusColor(activity.status)}`}
                            >
                              {activity.status}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            <Zap className="w-3 h-3 inline mr-1 text-amber-500" />
                            {activity.action}
                          </p>

                          {/* Metadata */}
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>{formatTimeAgo(activity.created_at)}</span>
                            
                            {activity.metadata?.deliverable_name && (
                              <>
                                <ChevronRight className="w-3 h-3" />
                                <span className="truncate max-w-[120px]">
                                  {activity.metadata.deliverable_name}
                                </span>
                              </>
                            )}
                            
                            {activity.metadata?.mcp_server && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                {activity.metadata.mcp_server}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Active Agents Summary Bar */}
      {activeAgents.size > 0 && (
        <div className="border-t p-3 bg-primary/5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Currently working:</span>
            <div className="flex -space-x-2">
              {Array.from(activeAgents).slice(0, 5).map((agentId, i) => {
                const activity = activities.find(a => a.agent_id === agentId);
                return (
                  <motion.div
                    key={agentId}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-6 h-6 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-xs"
                    title={activity?.agent_name}
                  >
                    {getAgentIcon(activity?.agent_name || '')}
                  </motion.div>
                );
              })}
              {activeAgents.size > 5 && (
                <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                  +{activeAgents.size - 5}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
