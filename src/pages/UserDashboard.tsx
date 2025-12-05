import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Bot, Settings, MessageSquare, Briefcase, Server, Key, 
  TrendingUp, Loader2, Plus, LogOut, Crown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { CEOAgentChat } from '@/components/CEOAgentChat';
import { UserAPIKeys } from '@/components/UserAPIKeys';
import { UserMCPServers } from '@/components/UserMCPServers';
import { UserProjects } from '@/components/UserProjects';

const UserDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, isLoading, isSubscribed, signOut } = useAuth();
  const [activityCount, setActivityCount] = useState(0);
  const [projectCount, setProjectCount] = useState(0);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (user) {
      // Fetch activity count
      supabase
        .from('user_agent_activity')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .then(({ count }) => setActivityCount(count || 0));

      // Fetch project count
      supabase
        .from('business_projects')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .then(({ count }) => setProjectCount(count || 0));
    }
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    toast({ title: 'Signed out', description: 'You have been signed out successfully.' });
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const trialDaysLeft = profile?.subscription_expires_at 
    ? Math.max(0, Math.ceil((new Date(profile.subscription_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4"
        >
          <div>
            <h1 className="cyber-text text-3xl font-bold text-gradient">
              Welcome, {profile?.full_name || 'Business Builder'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Your AI-powered business command center
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {profile?.subscription_status === 'trial' && (
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                <Crown className="w-3 h-3 mr-1" />
                {trialDaysLeft} days left in trial
              </Badge>
            )}
            {profile?.subscription_status === 'active' && (
              <Badge className="bg-primary/10 text-primary border-primary/20">
                <Crown className="w-3 h-3 mr-1" />
                Pro Member
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { title: 'Business Projects', value: projectCount, icon: Briefcase, color: 'text-primary' },
            { title: 'Agent Actions', value: activityCount, icon: Bot, color: 'text-accent' },
            { title: 'MCP Servers', value: '10', icon: Server, color: 'text-chart-3' },
            { title: 'Revenue Generated', value: '$0', icon: TrendingUp, color: 'text-chart-4' },
          ].map((stat, i) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="glass-morphism cyber-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <stat.icon className={`w-8 h-8 ${stat.color}`} />
                    <div>
                      <p className="text-2xl font-bold cyber-text">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.title}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="ceo" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="ceo" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              CEO Agent
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-2">
              <Briefcase className="w-4 h-4" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="servers" className="gap-2">
              <Server className="w-4 h-4" />
              MCP Servers
            </TabsTrigger>
            <TabsTrigger value="keys" className="gap-2">
              <Key className="w-4 h-4" />
              API Keys
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ceo">
            <CEOAgentChat />
          </TabsContent>

          <TabsContent value="projects">
            <UserProjects />
          </TabsContent>

          <TabsContent value="servers">
            <UserMCPServers />
          </TabsContent>

          <TabsContent value="keys">
            <UserAPIKeys />
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default UserDashboard;
