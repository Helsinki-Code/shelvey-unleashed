import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import {
  Users,
  CreditCard,
  Building2,
  Key,
  Server,
  FolderKanban,
  BarChart3,
  Crown,
  Loader2,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { SuperAdminAPIKeys } from '@/components/SuperAdminAPIKeys';
import { UserMCPServers } from '@/components/UserMCPServers';
import { UserProjects } from '@/components/UserProjects';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const SuperAdminDashboard = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { isSuperAdmin, isLoading: adminLoading, allUsers } = useSuperAdmin();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    dfySubscriptions: 0,
    totalProjects: 0,
    totalRevenue: 0,
  });
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      // Count active subscriptions
      const activeCount = allUsers.filter(
        (u) => u.subscription_status === 'active' || u.subscription_status === 'trial'
      ).length;

      const dfyCount = allUsers.filter((u) => u.subscription_tier === 'dfy').length;

      // Fetch all projects
      const { data: projectsData } = await supabase
        .from('business_projects')
        .select('*')
        .order('created_at', { ascending: false });

      setProjects(projectsData || []);

      setStats({
        totalUsers: allUsers.length,
        activeSubscriptions: activeCount,
        dfySubscriptions: dfyCount,
        totalProjects: projectsData?.length || 0,
        totalRevenue: activeCount * 2999 + dfyCount * 4999, // Simplified revenue calculation
      });
    };

    if (isSuperAdmin && allUsers.length > 0) {
      fetchStats();
    }
  }, [isSuperAdmin, allUsers]);

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold flex items-center gap-3">
                <Crown className="h-10 w-10 text-yellow-500" />
                Super Admin Dashboard
              </h1>
              <p className="text-muted-foreground mt-2">
                Complete oversight of ShelVey platform
              </p>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2 border-yellow-500 text-yellow-500">
              <Crown className="h-4 w-4 mr-2" />
              Super Admin
            </Badge>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Users</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <Users className="h-6 w-6 text-blue-500" />
                  {stats.totalUsers}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active Subscriptions</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <CreditCard className="h-6 w-6 text-green-500" />
                  {stats.activeSubscriptions}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>DFY Plan Users</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <Crown className="h-6 w-6 text-yellow-500" />
                  {stats.dfySubscriptions}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Projects</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-purple-500" />
                  {stats.totalProjects}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Est. Monthly Revenue</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <DollarSign className="h-6 w-6 text-emerald-500" />
                  ${stats.totalRevenue.toLocaleString()}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
              <TabsTrigger value="overview" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="businesses" className="gap-2">
                <Building2 className="h-4 w-4" />
                Businesses
              </TabsTrigger>
              <TabsTrigger value="api-keys" className="gap-2">
                <Key className="h-4 w-4" />
                Admin API Keys
              </TabsTrigger>
              <TabsTrigger value="mcp" className="gap-2">
                <Server className="h-4 w-4" />
                My MCP Servers
              </TabsTrigger>
              <TabsTrigger value="projects" className="gap-2">
                <FolderKanban className="h-4 w-4" />
                My Projects
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Subscription Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span>Standard Plan ($2,999/mo)</span>
                          <Badge variant="outline">
                            {stats.activeSubscriptions - stats.dfySubscriptions}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>DFY Plan ($4,999/mo)</span>
                          <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                            {stats.dfySubscriptions}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Trial/Free</span>
                          <Badge variant="secondary">
                            {stats.totalUsers - stats.activeSubscriptions}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Revenue Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span>Standard Subscriptions</span>
                          <span className="font-mono">
                            ${((stats.activeSubscriptions - stats.dfySubscriptions) * 2999).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>DFY Subscriptions</span>
                          <span className="font-mono">
                            ${(stats.dfySubscriptions * 4999).toLocaleString()}
                          </span>
                        </div>
                        <div className="border-t pt-4 flex items-center justify-between font-bold">
                          <span>Total Monthly</span>
                          <span className="font-mono text-green-500">
                            ${stats.totalRevenue.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Analytics Dashboard */}
                <div className="mt-8">
                  <h3 className="text-xl font-semibold mb-4">Agent & Task Analytics</h3>
                  <AnalyticsDashboard />
                </div>
              </div>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>All Users ({allUsers.length})</CardTitle>
                  <CardDescription>
                    Complete list of registered users and their subscription status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-mono">{u.email}</TableCell>
                          <TableCell>{u.full_name || '-'}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                u.subscription_status === 'active'
                                  ? 'default'
                                  : u.subscription_status === 'trial'
                                  ? 'secondary'
                                  : 'outline'
                              }
                            >
                              {u.subscription_status || 'none'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                u.subscription_tier === 'dfy'
                                  ? 'border-yellow-500 text-yellow-500'
                                  : ''
                              }
                            >
                              {u.subscription_tier || 'standard'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {u.subscription_expires_at
                              ? format(new Date(u.subscription_expires_at), 'MMM d, yyyy')
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {u.created_at
                              ? format(new Date(u.created_at), 'MMM d, yyyy')
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Businesses Tab */}
            <TabsContent value="businesses">
              <Card>
                <CardHeader>
                  <CardTitle>All Business Projects ({projects.length})</CardTitle>
                  <CardDescription>
                    All business projects created across the platform
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Industry</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projects.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell>{p.industry || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{p.stage || 'research'}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={p.status === 'active' ? 'default' : 'secondary'}
                            >
                              {p.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">
                            ${(p.revenue || 0).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {p.created_at
                              ? format(new Date(p.created_at), 'MMM d, yyyy')
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Admin API Keys Tab */}
            <TabsContent value="api-keys">
              <SuperAdminAPIKeys />
            </TabsContent>

            {/* My MCP Servers Tab */}
            <TabsContent value="mcp">
              <UserMCPServers />
            </TabsContent>

            {/* My Projects Tab */}
            <TabsContent value="projects">
              <UserProjects />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default SuperAdminDashboard;
