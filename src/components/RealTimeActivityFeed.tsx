import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { 
  Activity, Bot, Zap, CheckCircle, Clock, 
  AlertCircle, Server, ArrowRight, Loader2 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityLog {
  id: string;
  agent_id: string;
  agent_name: string;
  action: string;
  status: string;
  created_at: string;
  metadata: any;
}

interface AgentTask {
  id: string;
  assigned_agent_id: string;
  task_type: string;
  task_description: string;
  status: string;
  priority: string;
  delegated_by: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

interface RealTimeActivityFeedProps {
  userId?: string;
  projectId?: string;
  maxItems?: number;
}

export function RealTimeActivityFeed({ 
  userId, 
  projectId, 
  maxItems = 20 
}: RealTimeActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();

    // Real-time subscription for agent activity logs
    const activityChannel = supabase
      .channel('realtime-activity')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'agent_activity_logs' 
      }, (payload) => {
        const newActivity = payload.new as ActivityLog;
        setActivities(prev => [newActivity, ...prev].slice(0, maxItems));
      })
      .subscribe();

    // Real-time subscription for agent tasks
    const tasksChannel = supabase
      .channel('realtime-tasks')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'agent_tasks',
        ...(userId && { filter: `user_id=eq.${userId}` })
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTasks(prev => [payload.new as AgentTask, ...prev].slice(0, maxItems));
        } else if (payload.eventType === 'UPDATE') {
          setTasks(prev => prev.map(t => 
            t.id === (payload.new as AgentTask).id ? payload.new as AgentTask : t
          ));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(activityChannel);
      supabase.removeChannel(tasksChannel);
    };
  }, [userId, projectId, maxItems]);

  const fetchInitialData = async () => {
    // Fetch recent activity logs
    const { data: activityData } = await supabase
      .from('agent_activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(maxItems);

    if (activityData) setActivities(activityData);

    // Fetch recent tasks
    let tasksQuery = supabase
      .from('agent_tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(maxItems);

    if (userId) {
      tasksQuery = tasksQuery.eq('user_id', userId);
    }

    const { data: tasksData } = await tasksQuery;
    if (tasksData) setTasks(tasksData);

    setIsLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in_progress': return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'pending': return <Clock className="w-4 h-4 text-muted-foreground" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-primary" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'in_progress': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'pending': return 'bg-muted text-muted-foreground';
      case 'failed': return 'bg-red-500/20 text-red-500 border-red-500/30';
      default: return 'bg-primary/20 text-primary border-primary/30';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-500';
      case 'medium': return 'bg-yellow-500/20 text-yellow-500';
      case 'low': return 'bg-green-500/20 text-green-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Activity Stream */}
      <Card className="bg-card/50 backdrop-blur border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            Live Agent Activity
            <span className="relative flex h-2 w-2 ml-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <AnimatePresence mode="popLayout">
              {activities.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No agent activity yet
                </p>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.02 }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">{activity.agent_name}</span>
                          {getStatusIcon(activity.status)}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {activity.action}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Active Tasks */}
      <Card className="bg-card/50 backdrop-blur border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5 text-primary" />
            Delegated Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <AnimatePresence mode="popLayout">
              {tasks.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No tasks delegated yet
                </p>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task, index) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: index * 0.02 }}
                      className={`p-3 rounded-lg border ${getStatusColor(task.status)}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(task.status)}
                          <span className="font-medium text-sm">{task.task_type}</span>
                        </div>
                        <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {task.task_description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">{task.delegated_by}</span>
                        <ArrowRight className="w-3 h-3" />
                        <span>{task.assigned_agent_id}</span>
                      </div>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}