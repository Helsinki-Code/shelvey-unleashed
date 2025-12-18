import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Plus, TrendingUp, TrendingDown, Activity, AlertTriangle, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

interface TradingProject {
  id: string;
  name: string;
  exchange: string;
  mode: string;
  status: string;
  capital: number;
  total_pnl: number;
  risk_level: string;
  current_phase: number;
  created_at: string;
}

const TradingProjectsPage = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [projects, setProjects] = useState<TradingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalCapital: 0, totalPnL: 0, activeProjects: 0 });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('trading_projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProjects(data || []);
      
      // Calculate stats
      const totalCapital = data?.reduce((sum, p) => sum + Number(p.capital), 0) || 0;
      const totalPnL = data?.reduce((sum, p) => sum + Number(p.total_pnl), 0) || 0;
      const activeProjects = data?.filter(p => p.status === 'active').length || 0;
      
      setStats({ totalCapital, totalPnL, activeProjects });
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'paused': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'stopped': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'completed': return 'bg-primary/10 text-primary border-primary/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getExchangeLabel = (exchange: string) => {
    switch (exchange) {
      case 'alpaca': return 'Alpaca (Stocks)';
      case 'binance': return 'Binance (Crypto)';
      case 'coinbase': return 'Coinbase (Crypto)';
      default: return exchange;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Activity className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Trading Terminal | ShelVey</title>
        <meta name="description" content="AI-powered autonomous trading automation" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="container mx-auto px-4 py-8 mt-16">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold">Trading Terminal</h1>
              <p className="text-muted-foreground mt-1">AI-powered autonomous trading automation</p>
            </div>
            <Button onClick={() => navigate('/trading/new')} size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              New Trading Project
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Capital</p>
                    <p className="text-2xl font-bold">${stats.totalCapital.toLocaleString()}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total P&L</p>
                    <p className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                      {stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toLocaleString()}
                    </p>
                  </div>
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${stats.totalPnL >= 0 ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
                    {stats.totalPnL >= 0 ? (
                      <TrendingUp className="h-6 w-6 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-6 w-6 text-destructive" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Projects</p>
                    <p className="text-2xl font-bold">{stats.activeProjects}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Activity className="h-6 w-6 text-emerald-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Projects Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-1/2 mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <BarChart3 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Trading Projects Yet</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-sm">
                  Create your first automated trading project to get started with AI-powered trading.
                </p>
                <Button onClick={() => navigate('/trading/new')} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create First Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map(project => (
                <Card 
                  key={project.id} 
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => navigate(`/trading/${project.id}`)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <Badge variant="outline" className={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Exchange</span>
                        <span>{getExchangeLabel(project.exchange)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Mode</span>
                        <Badge variant={project.mode === 'live' ? 'default' : 'secondary'}>
                          {project.mode === 'live' ? 'Live' : 'Paper'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Capital</span>
                        <span>${Number(project.capital).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">P&L</span>
                        <span className={Number(project.total_pnl) >= 0 ? 'text-emerald-500' : 'text-destructive'}>
                          {Number(project.total_pnl) >= 0 ? '+' : ''}${Number(project.total_pnl).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Phase</span>
                        <span>{project.current_phase}/6</span>
                      </div>
                      
                      {project.status === 'stopped' && (
                        <div className="flex items-center gap-2 text-destructive text-sm mt-2 p-2 bg-destructive/10 rounded">
                          <AlertTriangle className="h-4 w-4" />
                          <span>Kill switch activated</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>

        <Footer />
      </div>
    </>
  );
};

export default TradingProjectsPage;
