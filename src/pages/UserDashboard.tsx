import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, TrendingUp, Store, Bot, DollarSign, ShoppingCart, BarChart3, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { SimpleDashboardSidebar } from '@/components/SimpleDashboardSidebar';
import { NotificationBell } from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UserProjects } from '@/components/UserProjects';
import { CEOChatSheet } from '@/components/CEOChatSheet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const UserDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, isLoading, isSubscribed, isSuperAdmin } = useAuth();
  const [ceoChecked, setCeoChecked] = useState(false);
  const [userCeo, setUserCeo] = useState<any>(null);
  const [automationStats, setAutomationStats] = useState({
    activeStrategies: 0,
    totalProfit: 0,
    storeOrders: 0,
    podProducts: 0,
  });

  const section = searchParams.get('section') || 'home';

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
      return;
    }
    
    if (!isLoading && user && !isSubscribed && !isSuperAdmin) {
      navigate('/pricing');
      return;
    }
  }, [user, isLoading, isSubscribed, isSuperAdmin, navigate]);

  useEffect(() => {
    const checkCeo = async () => {
      if (!user || (!isSubscribed && !isSuperAdmin)) return;
      
      const { data, error } = await supabase
        .from('user_ceos')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setCeoChecked(true);
      
      if (!data && !error) {
        navigate('/create-ceo');
        return;
      }
      
      if (data) {
        setUserCeo(data);
      }
    };

    if (user && (isSubscribed || isSuperAdmin) && !isLoading) {
      checkCeo();
    }
  }, [user, isSubscribed, isSuperAdmin, isLoading, navigate]);

  useEffect(() => {
    const fetchAutomationStats = async () => {
      if (!user) return;

      // Fetch active trading strategies
      const { data: strategies } = await supabase
        .from('trading_strategies')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      // Fetch total profit from executions
      const { data: executions } = await supabase
        .from('trading_executions')
        .select('profit_loss')
        .eq('user_id', user.id);

      // Fetch store automation jobs
      const { data: storeJobs } = await supabase
        .from('store_automation_jobs')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      // Fetch POD products
      const { data: podProducts } = await supabase
        .from('pod_products')
        .select('*')
        .eq('user_id', user.id);

      const totalProfit = executions?.reduce((sum, e) => sum + (e.profit_loss || 0), 0) || 0;

      setAutomationStats({
        activeStrategies: strategies?.length || 0,
        totalProfit,
        storeOrders: storeJobs?.length || 0,
        podProducts: podProducts?.length || 0,
      });
    };

    if (user) {
      fetchAutomationStats();
    }
  }, [user]);

  if (isLoading || !ceoChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const ceoName = userCeo?.ceo_name || 'Ava';
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <SimpleDashboardSidebar />

      {/* Main Content */}
      <main className="flex-1 ml-[260px] p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold">
              {greeting}, {firstName}!
            </h1>
            <p className="text-muted-foreground">
              {ceoName} and your AI team are working 24/7
            </p>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <ThemeToggle />
          </div>
        </motion.div>

        {/* Automation Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active AI Strategies</CardTitle>
              <Bot className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{automationStats.activeStrategies}</div>
              <p className="text-xs text-muted-foreground">Trading 24/7 on autopilot</p>
            </CardContent>
          </Card>

          <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">
                ${automationStats.totalProfit.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">From automated trades</p>
            </CardContent>
          </Card>

          <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Store Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{automationStats.storeOrders}</div>
              <p className="text-xs text-muted-foreground">Auto-fulfilled orders</p>
            </CardContent>
          </Card>

          <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">POD Products</CardTitle>
              <Zap className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{automationStats.podProducts}</div>
              <p className="text-xs text-muted-foreground">Active products</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        >
          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/trading')}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="h-12 w-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-cyan-500" />
              </div>
              <div>
                <h3 className="font-semibold">Trading AI</h3>
                <p className="text-sm text-muted-foreground">Manage trading strategies</p>
              </div>
              <Badge variant="secondary" className="ml-auto">
                {automationStats.activeStrategies} Active
              </Badge>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/online-stores')}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="h-12 w-12 rounded-xl bg-lime-500/10 flex items-center justify-center">
                <Store className="h-6 w-6 text-lime-500" />
              </div>
              <div>
                <h3 className="font-semibold">Store Automation</h3>
                <p className="text-sm text-muted-foreground">E-commerce & POD</p>
              </div>
              <Badge variant="secondary" className="ml-auto">
                {automationStats.podProducts} Products
              </Badge>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/settings?tab=apikeys')}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold">Connect More</h3>
                <p className="text-sm text-muted-foreground">Add API integrations</p>
              </div>
              <Badge variant="outline" className="ml-auto">
                50+ MCPs
              </Badge>
            </CardContent>
          </Card>
        </motion.div>

        {/* Content based on section - Projects accessible via sidebar */}
      </main>

      {/* Floating CEO Chat Button + Sheet */}
      <CEOChatSheet />
    </div>
  );
};

export default UserDashboard;
