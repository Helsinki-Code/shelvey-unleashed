import { useState } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { TeamMeetingView } from '@/components/TeamMeetingView';
import { AgentMessagesPanel } from '@/components/AgentMessagesPanel';
import { EscalationTracker } from '@/components/EscalationTracker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, MessageSquare, AlertTriangle, Calendar, Activity, Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function TeamCollaborationPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalMeetings: 0,
    totalMessages: 0,
    activeEscalations: 0,
    activeTeams: 0,
  });

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;

    try {
      const [meetingsRes, messagesRes, escalationsRes, teamsRes] = await Promise.all([
        supabase.from('team_meetings').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('agent_messages').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('escalations').select('id', { count: 'exact' }).eq('user_id', user.id).eq('status', 'pending'),
        supabase.from('teams').select('id', { count: 'exact' }).eq('status', 'active'),
      ]);

      setStats({
        totalMeetings: meetingsRes.count || 0,
        totalMessages: messagesRes.count || 0,
        activeEscalations: escalationsRes.count || 0,
        activeTeams: teamsRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Helmet>
        <title>Team Collaboration | ShelVey</title>
        <meta name="description" content="Monitor agent team collaboration, meetings, messages, and escalations in real-time." />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />

        <main className="flex-1 container mx-auto px-4 py-8 pt-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Team Collaboration</h1>
              <p className="text-muted-foreground">
                Monitor agent team activities, communications, and escalation workflows
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card className="border-border/50 bg-card/50 backdrop-blur">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.activeTeams}</p>
                      <p className="text-sm text-muted-foreground">Active Teams</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50 backdrop-blur">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Calendar className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.totalMeetings}</p>
                      <p className="text-sm text-muted-foreground">Team Meetings</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50 backdrop-blur">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <MessageSquare className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.totalMessages}</p>
                      <p className="text-sm text-muted-foreground">Agent Messages</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50 backdrop-blur">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10">
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.activeEscalations}</p>
                      <p className="text-sm text-muted-foreground">Active Escalations</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="meetings" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
                <TabsTrigger value="meetings" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  Meetings
                </TabsTrigger>
                <TabsTrigger value="messages" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Messages
                </TabsTrigger>
                <TabsTrigger value="escalations" className="gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Escalations
                </TabsTrigger>
              </TabsList>

              <TabsContent value="meetings">
                <TeamMeetingView />
              </TabsContent>

              <TabsContent value="messages">
                <AgentMessagesPanel />
              </TabsContent>

              <TabsContent value="escalations">
                <EscalationTracker />
              </TabsContent>
            </Tabs>
          </motion.div>
        </main>

        <Footer />
      </div>
    </>
  );
}
