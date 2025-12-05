import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle, XCircle, Clock, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ALL_AGENTS, getAgentById } from "@/lib/all-agents";

interface AgentTask {
  id: string;
  assigned_agent_id: string;
  task_type: string;
  task_description: string;
  priority: string;
  status: string;
  mcp_servers_used: string[];
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

const statusIcons = {
  pending: Clock,
  processing: Loader2,
  completed: CheckCircle,
  failed: XCircle,
};

const statusColors = {
  pending: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
  processing: "bg-blue-500/20 text-blue-500 border-blue-500/30",
  completed: "bg-green-500/20 text-green-500 border-green-500/30",
  failed: "bg-red-500/20 text-red-500 border-red-500/30",
};

const priorityColors = {
  low: "bg-gray-500/20 text-gray-400",
  medium: "bg-blue-500/20 text-blue-400",
  high: "bg-orange-500/20 text-orange-400",
  urgent: "bg-red-500/20 text-red-400",
};

export const AgentTaskBoard = () => {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('agent-tasks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_tasks'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTasks(prev => [payload.new as AgentTask, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev => 
              prev.map(task => 
                task.id === payload.new.id ? payload.new as AgentTask : task
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(task => task.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAgentInfo = (agentId: string) => {
    const agent = getAgentById(agentId);
    return agent || { name: 'Unknown Agent', icon: Zap };
  };

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5 text-primary" />
          Real-Time Task Board
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <AnimatePresence mode="popLayout">
            {tasks.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 text-muted-foreground"
              >
                No tasks yet. Delegate tasks from the CEO Agent to see them here.
              </motion.div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => {
                  const agent = getAgentInfo(task.assigned_agent_id);
                  const StatusIcon = statusIcons[task.status as keyof typeof statusIcons] || Clock;
                  const AgentIcon = agent.icon;
                  
                  return (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="p-4 rounded-lg bg-background/50 border border-border/50 hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <AgentIcon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{agent.name}</span>
                              <Badge variant="outline" className={priorityColors[task.priority as keyof typeof priorityColors]}>
                                {task.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {task.task_description}
                            </p>
                            {task.mcp_servers_used && task.mcp_servers_used.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {task.mcp_servers_used.slice(0, 3).map((server) => (
                                  <Badge key={server} variant="secondary" className="text-xs">
                                    {server}
                                  </Badge>
                                ))}
                                {task.mcp_servers_used.length > 3 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{task.mcp_servers_used.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge className={statusColors[task.status as keyof typeof statusColors]}>
                          <StatusIcon className={`h-3 w-3 mr-1 ${task.status === 'processing' ? 'animate-spin' : ''}`} />
                          {task.status}
                        </Badge>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
