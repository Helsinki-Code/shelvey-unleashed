import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Bot, MessageSquare, Briefcase, Server, Key, 
  TrendingUp, Plus, Building2, Globe, Users
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CEOAgentChat } from '@/components/CEOAgentChat';
import { UserAPIKeys } from '@/components/UserAPIKeys';
import { UserMCPServers } from '@/components/UserMCPServers';
import { UserProjects } from '@/components/UserProjects';
import { TeamMeetingView } from '@/components/TeamMeetingView';
import { AgentMessagesPanel } from '@/components/AgentMessagesPanel';
import { EscalationTracker } from '@/components/EscalationTracker';
import { ProgressReportsPanel } from '@/components/ProgressReportsPanel';
import { useExperienceMode } from '@/contexts/ExperienceModeContext';
import { getTerm } from '@/lib/terminology';

const UserDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const { mode, isBeginner } = useExperienceMode();
  const [activityCount, setActivityCount] = useState(0);
  const [projectCount, setProjectCount] = useState(0);
  const [activeTab, setActiveTab] = useState('ceo');

  // Handle tab from navigation state
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  useEffect(() => {
    if (user) {
      supabase
        .from('user_agent_activity')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .then(({ count }) => setActivityCount(count || 0));

      supabase
        .from('business_projects')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .then(({ count }) => setProjectCount(count || 0));
    }
  }, [user]);

  return (
    <DashboardLayout title={isBeginner ? `Welcome back, ${profile?.full_name || 'Builder'}!` : 'Dashboard'}>
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { title: isBeginner ? 'Projects' : 'Business Projects', value: projectCount, icon: Briefcase, color: 'text-primary' },
          { title: isBeginner ? 'AI Actions' : 'Agent Actions', value: activityCount, icon: Bot, color: 'text-accent' },
          { title: getTerm('MCP Servers', mode), value: '10', icon: Server, color: 'text-chart-3' },
          { title: 'Revenue', value: '$0', icon: TrendingUp, color: 'text-chart-4' },
        ].map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.title}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card 
          className="cursor-pointer hover:border-primary/50 transition-all"
          onClick={() => navigate('/organization')}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{isBeginner ? 'Your AI Team' : 'Organization'}</h3>
              <p className="text-sm text-muted-foreground">
                {isBeginner ? 'See who is working on your business' : 'View your AI agent workforce structure'}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className="cursor-pointer hover:border-primary/50 transition-all"
          onClick={() => navigate('/websites')}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-accent/10">
              <Globe className="w-8 h-8 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Websites</h3>
              <p className="text-sm text-muted-foreground">
                {isBeginner ? 'View and manage your business websites' : 'Manage your generated business websites'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="ceo" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            {isBeginner ? 'Talk to CEO' : 'CEO Agent'}
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-2">
            <Briefcase className="w-4 h-4" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="w-4 h-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="servers" className="gap-2">
            <Server className="w-4 h-4" />
            {getTerm('MCP Servers', mode)}
          </TabsTrigger>
          <TabsTrigger value="keys" className="gap-2">
            <Key className="w-4 h-4" />
            {getTerm('API Keys', mode)}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ceo">
          <CEOAgentChat />
        </TabsContent>

        <TabsContent value="projects">
          <UserProjects />
        </TabsContent>

        <TabsContent value="team">
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TeamMeetingView />
              <AgentMessagesPanel />
            </div>
            <ProgressReportsPanel />
            <EscalationTracker />
          </div>
        </TabsContent>

        <TabsContent value="servers">
          <UserMCPServers />
        </TabsContent>

        <TabsContent value="keys">
          <UserAPIKeys />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default UserDashboard;
