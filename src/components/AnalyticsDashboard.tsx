import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  CheckCircle2,
  Clock,
  TrendingUp,
  Activity,
  Target,
  Users,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AnalyticsData {
  taskCompletionRate: number;
  averageReviewTime: number;
  totalTasksCompleted: number;
  totalTasksPending: number;
  phaseCompletionRates: { name: string; completed: number; total: number; rate: number }[];
  agentPerformance: { agent: string; completed: number; avgTime: number }[];
  weeklyActivity: { day: string; tasks: number; approvals: number }[];
  deliverablesByType: { type: string; count: number }[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

export const AnalyticsDashboard = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    if (!user) return;

    try {
      // Fetch all tasks
      const { data: tasks } = await supabase
        .from('agent_tasks')
        .select('*')
        .eq('user_id', user.id);

      // Fetch all deliverables
      const { data: deliverables } = await supabase
        .from('phase_deliverables')
        .select('*, business_phases!inner(phase_name, phase_number)')
        .eq('user_id', user.id);

      // Fetch agent activity
      const { data: activity } = await supabase
        .from('user_agent_activity')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Calculate metrics
      const completedTasks = tasks?.filter(t => t.status === 'completed') || [];
      const pendingTasks = tasks?.filter(t => t.status === 'pending' || t.status === 'in_progress') || [];
      const taskCompletionRate = tasks?.length ? (completedTasks.length / tasks.length) * 100 : 0;

      // Calculate average review time (from started to completed)
      const reviewTimes = completedTasks
        .filter(t => t.started_at && t.completed_at)
        .map(t => {
          const start = new Date(t.started_at!).getTime();
          const end = new Date(t.completed_at!).getTime();
          return (end - start) / (1000 * 60 * 60); // hours
        });
      const averageReviewTime = reviewTimes.length 
        ? reviewTimes.reduce((a, b) => a + b, 0) / reviewTimes.length 
        : 0;

      // Phase completion rates
      const phaseGroups: Record<string, { completed: number; total: number }> = {};
      deliverables?.forEach((d: any) => {
        const phaseName = d.business_phases?.phase_name || 'Unknown';
        if (!phaseGroups[phaseName]) {
          phaseGroups[phaseName] = { completed: 0, total: 0 };
        }
        phaseGroups[phaseName].total++;
        if (d.status === 'approved') {
          phaseGroups[phaseName].completed++;
        }
      });
      const phaseCompletionRates = Object.entries(phaseGroups).map(([name, data]) => ({
        name,
        completed: data.completed,
        total: data.total,
        rate: data.total ? Math.round((data.completed / data.total) * 100) : 0,
      }));

      // Agent performance
      const agentGroups: Record<string, { completed: number; totalTime: number; count: number }> = {};
      activity?.forEach((a: any) => {
        if (!agentGroups[a.agent_name]) {
          agentGroups[a.agent_name] = { completed: 0, totalTime: 0, count: 0 };
        }
        if (a.status === 'completed') {
          agentGroups[a.agent_name].completed++;
        }
        agentGroups[a.agent_name].count++;
      });
      const agentPerformance = Object.entries(agentGroups)
        .map(([agent, data]) => ({
          agent: agent.replace(' Agent', ''),
          completed: data.completed,
          avgTime: data.count ? Math.round((data.totalTime / data.count) * 10) / 10 : 0,
        }))
        .slice(0, 8);

      // Weekly activity
      const now = new Date();
      const weeklyActivity = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dayStart = new Date(date.setHours(0, 0, 0, 0));
        const dayEnd = new Date(date.setHours(23, 59, 59, 999));
        
        const dayTasks = tasks?.filter(t => {
          const created = new Date(t.created_at);
          return created >= dayStart && created <= dayEnd;
        }).length || 0;
        
        const dayApprovals = deliverables?.filter((d: any) => {
          if (!d.approved_at) return false;
          const approved = new Date(d.approved_at);
          return approved >= dayStart && approved <= dayEnd;
        }).length || 0;

        weeklyActivity.push({ day: dayName, tasks: dayTasks, approvals: dayApprovals });
      }

      // Deliverables by type
      const typeGroups: Record<string, number> = {};
      deliverables?.forEach((d: any) => {
        const type = d.deliverable_type || 'Other';
        typeGroups[type] = (typeGroups[type] || 0) + 1;
      });
      const deliverablesByType = Object.entries(typeGroups)
        .map(([type, count]) => ({ type, count }))
        .slice(0, 6);

      setAnalytics({
        taskCompletionRate: Math.round(taskCompletionRate),
        averageReviewTime: Math.round(averageReviewTime * 10) / 10,
        totalTasksCompleted: completedTasks.length,
        totalTasksPending: pendingTasks.length,
        phaseCompletionRates,
        agentPerformance,
        weeklyActivity,
        deliverablesByType,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [user]);

  // Real-time subscriptions for live updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('analytics-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_tasks', filter: `user_id=eq.${user.id}` }, () => fetchAnalytics())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'phase_deliverables', filter: `user_id=eq.${user.id}` }, () => fetchAnalytics())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_agent_activity', filter: `user_id=eq.${user.id}` }, () => fetchAnalytics())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No analytics data available yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Task Completion Rate
              </CardDescription>
              <CardTitle className="text-3xl text-primary">{analytics.taskCompletionRate}%</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all" 
                  style={{ width: `${analytics.taskCompletionRate}%` }} 
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Avg Review Time
              </CardDescription>
              <CardTitle className="text-3xl">{analytics.averageReviewTime}h</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">From task start to completion</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Tasks Completed
              </CardDescription>
              <CardTitle className="text-3xl text-primary">{analytics.totalTasksCompleted}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{analytics.totalTasksPending} pending</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Business Success
              </CardDescription>
              <CardTitle className="text-3xl">
                {analytics.phaseCompletionRates.filter(p => p.rate === 100).length}/6
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Phases fully completed</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Activity */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Weekly Activity
              </CardTitle>
              <CardDescription>Tasks and approvals over the past week</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics.weeklyActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }} 
                  />
                  <Bar dataKey="tasks" fill="hsl(var(--primary))" name="Tasks" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="approvals" fill="hsl(var(--secondary))" name="Approvals" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Phase Completion Rates */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Phase Completion Rates
              </CardTitle>
              <CardDescription>Progress across business phases</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics.phaseCompletionRates} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="name" type="category" width={80} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: number) => [`${value}%`, 'Completion']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }} 
                  />
                  <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Agent Performance */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Agent Performance
              </CardTitle>
              <CardDescription>Tasks completed by each agent</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics.agentPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="agent" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }} 
                  />
                  <Bar dataKey="completed" fill="hsl(var(--primary))" name="Completed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Deliverables by Type */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Deliverables by Type
              </CardTitle>
              <CardDescription>Distribution of deliverable types</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.deliverablesByType.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={analytics.deliverablesByType}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ type, percent }) => `${type} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {analytics.deliverablesByType.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>No deliverables yet</p>
                    <p className="text-sm">Create a project to see data</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
