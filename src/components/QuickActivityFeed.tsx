import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, AlertCircle, Bell, ChevronRight, Bot } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'completed' | 'in_progress' | 'needs_attention' | 'notification';
  agentName: string;
  action: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

interface QuickActivityFeedProps {
  onViewAll?: () => void;
  maxItems?: number;
}

export const QuickActivityFeed = ({ onViewAll, maxItems = 5 }: QuickActivityFeedProps) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        // Fetch from agent_activity_logs (real agent work) - publicly readable
        const { data: activityData } = await supabase
          .from('agent_activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(maxItems);

        const formattedActivities: ActivityItem[] = [];

        // Add agent activities
        activityData?.forEach((activity) => {
          formattedActivities.push({
            id: activity.id,
            type: activity.status === 'completed' ? 'completed' : 'in_progress',
            agentName: activity.agent_name,
            action: activity.action,
            timestamp: new Date(activity.created_at || Date.now()),
            metadata: activity.metadata as Record<string, unknown> | undefined,
          });
        });

        // Sort by timestamp
        formattedActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setActivities(formattedActivities.slice(0, maxItems));
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();

    // Subscribe to real-time updates on agent_activity_logs
    const channel = supabase
      .channel('activity-feed-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_activity_logs',
        },
        (payload) => {
          const newActivity: ActivityItem = {
            id: payload.new.id,
            type: payload.new.status === 'completed' ? 'completed' : 'in_progress',
            agentName: payload.new.agent_name,
            action: payload.new.action,
            timestamp: new Date(payload.new.created_at || Date.now()),
            metadata: payload.new.metadata as Record<string, unknown> | undefined,
          };
          setActivities((prev) => [newActivity, ...prev].slice(0, maxItems));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [maxItems]);

  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'completed':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'in_progress':
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case 'needs_attention':
        return <Bell className="w-4 h-4 text-amber-500" />;
      case 'notification':
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  const getBadge = (type: ActivityItem['type']) => {
    switch (type) {
      case 'completed':
        return <Badge variant="secondary" className="bg-green-500/10 text-green-500">Done</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="bg-primary/10 text-primary">Working</Badge>;
      case 'needs_attention':
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-500">Action Needed</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          📊 What Your Team Did Today
        </CardTitle>
        {onViewAll && (
          <Button variant="ghost" size="sm" onClick={onViewAll}>
            View All
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bot className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>Your AI team is ready to work!</p>
            <p className="text-sm">Start a project to see activity here</p>
          </div>
        ) : (
          <ScrollArea className="h-[280px]">
            <AnimatePresence>
              <div className="space-y-3">
                {activities.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                      activity.type === 'needs_attention'
                        ? 'bg-amber-500/5 border border-amber-500/20'
                        : 'bg-muted/50 hover:bg-muted'
                    }`}
                  >
                    <div className="mt-0.5">{getIcon(activity.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{activity.agentName}</span>
                        {getBadge(activity.type)}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{activity.action}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                      </p>
                    </div>
                    {activity.type === 'needs_attention' && (
                      <Button size="sm" variant="outline">
                        Review
                      </Button>
                    )}
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
