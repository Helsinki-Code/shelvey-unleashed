import { useEffect, useState } from 'react';
import { Activity, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';

interface ActivityLog {
  id: string;
  agent_id: string;
  agent_name: string;
  action: string;
  status: string;
  details: unknown;
  created_at: string;
}

interface TradingActivityFeedProps {
  projectId: string;
  maxItems?: number;
}

const TradingActivityFeed = ({ projectId, maxItems = 20 }: TradingActivityFeedProps) => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
    
    const channel = supabase
      .channel(`trading-activity-${projectId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'trading_activity_logs', filter: `project_id=eq.${projectId}` },
        (payload) => {
          setActivities(prev => [payload.new as ActivityLog, ...prev].slice(0, maxItems));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, maxItems]);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('trading_activity_logs')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(maxItems);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'alert':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-500" />;
      default:
        return <Activity className="h-4 w-4 text-primary" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Activity className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No activity yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-3">
        {activities.map((activity) => (
          <div 
            key={activity.id}
            className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="mt-0.5">{getStatusIcon(activity.status)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm">{activity.agent_name}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{activity.action}</p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default TradingActivityFeed;
