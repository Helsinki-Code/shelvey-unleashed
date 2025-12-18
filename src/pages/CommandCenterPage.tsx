import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  Building2, TrendingUp, DollarSign, Activity, Plus, 
  Zap, AlertTriangle, CheckCircle2, Clock, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { COMPANY_CONFIGS, CompanyType, getCompanyConfig } from '@/lib/company-types';
import { formatDistanceToNow } from 'date-fns';

interface AICompany {
  id: string;
  company_type: CompanyType;
  name: string;
  status: string;
  total_revenue: number;
  total_clients: number;
  created_at: string;
}

interface CompanyCEO {
  id: string;
  company_id: string;
  name: string;
  avatar_url: string | null;
  persona_type: string;
}

interface ActivityLog {
  id: string;
  company_type: CompanyType;
  ceo_name: string;
  action: string;
  status: string;
  created_at: string;
}

const CommandCenterPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [companies, setCompanies] = useState<AICompany[]>([]);
  const [ceos, setCeos] = useState<CompanyCEO[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
      subscribeToUpdates();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [companiesRes, ceosRes, activitiesRes] = await Promise.all([
        supabase.from('ai_companies').select('*').eq('user_id', user!.id),
        supabase.from('company_ceos').select('*').eq('user_id', user!.id),
        supabase.from('company_activity_logs')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(20)
      ]);

      setCompanies((companiesRes.data as AICompany[]) || []);
      setCeos((ceosRes.data as CompanyCEO[]) || []);
      setActivities((activitiesRes.data as ActivityLog[]) || []);
    } catch (error) {
      console.error('Error fetching command center data:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel('command-center-updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'company_activity_logs',
        filter: `user_id=eq.${user!.id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setActivities(prev => [payload.new as ActivityLog, ...prev].slice(0, 20));
        }
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'ai_companies',
        filter: `user_id=eq.${user!.id}`
      }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const totalRevenue = companies.reduce((sum, c) => sum + Number(c.total_revenue || 0), 0);
  const activeCompanies = companies.filter(c => c.status === 'active').length;
  const totalClients = companies.reduce((sum, c) => sum + (c.total_clients || 0), 0);

  const getCEOForCompany = (companyId: string) => {
    return ceos.find(c => c.company_id === companyId);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-3 w-3 text-emerald-500" />;
      case 'working': return <Activity className="h-3 w-3 text-amber-500 animate-pulse" />;
      case 'alert': return <AlertTriangle className="h-3 w-3 text-destructive" />;
      default: return <Clock className="h-3 w-3 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8 mt-16">
          <Skeleton className="h-10 w-64 mb-6" />
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} className="h-48" />)}
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Command Center | ShelVey AI Conglomerate</title>
        <meta name="description" content="Monitor all your AI companies from one unified dashboard" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="container mx-auto px-4 py-8 mt-16">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Building2 className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold">AI Conglomerate</h1>
              </div>
              <p className="text-muted-foreground">
                Your empire of AI-powered companies, all running autonomously
              </p>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              <Users className="h-4 w-4 mr-2" />
              Human Chairman
            </Badge>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  Total Revenue
                </div>
                <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}/mo</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Building2 className="h-4 w-4" />
                  Active Companies
                </div>
                <p className="text-2xl font-bold">{activeCompanies}/8</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Users className="h-4 w-4" />
                  Total Clients
                </div>
                <p className="text-2xl font-bold">{totalClients}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Zap className="h-4 w-4" />
                  AI CEOs Online
                </div>
                <p className="text-2xl font-bold">{ceos.length}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* CEO Cards Grid */}
            <div className="lg:col-span-2">
              <h2 className="text-xl font-semibold mb-4">Your AI Companies</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.values(COMPANY_CONFIGS).map((config) => {
                  const company = companies.find(c => c.company_type === config.type);
                  const ceo = company ? getCEOForCompany(company.id) : null;
                  const isActive = !!company;
                  const isBuilt = config.status === 'built' || config.status === 'building';

                  return (
                    <Card 
                      key={config.type}
                      className={`transition-all ${isBuilt ? 'hover:border-primary/50 cursor-pointer' : 'opacity-50'}`}
                      onClick={() => isBuilt && navigate(config.route)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{config.icon}</span>
                            <div>
                              <CardTitle className="text-base">{config.name}</CardTitle>
                              <p className="text-xs text-muted-foreground">{config.ceoRole}</p>
                            </div>
                          </div>
                          <Badge 
                            variant={isActive ? 'default' : config.status === 'planned' ? 'outline' : 'secondary'}
                            className="text-xs"
                          >
                            {isActive ? 'Active' : config.status === 'planned' ? 'Coming Soon' : 'Setup'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {isActive && company ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Revenue</span>
                              <span className="font-medium text-emerald-500">
                                ${Number(company.total_revenue || 0).toLocaleString()}/mo
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Clients/Projects</span>
                              <span className="font-medium">{company.total_clients || 0}</span>
                            </div>
                            {ceo && (
                              <div className="flex items-center gap-2 pt-2 border-t">
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs">
                                  {ceo.name.charAt(0)}
                                </div>
                                <span className="text-sm">{ceo.name}</span>
                                <Badge variant="outline" className="text-xs ml-auto">
                                  {ceo.persona_type}
                                </Badge>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">{config.description}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>{config.agentCount} Agents</span>
                              <span>{config.phaseCount} Phases</span>
                            </div>
                            {isBuilt && !isActive && (
                              <Button 
                                size="sm" 
                                className="w-full mt-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(config.route);
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Activate Company
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Activity Feed */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Live Activity Feed</h2>
              <Card className="h-[600px]">
                <CardContent className="p-0">
                  <ScrollArea className="h-full p-4">
                    {activities.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No activity yet</p>
                        <p className="text-sm">Your AI CEOs will appear here</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activities.map((activity) => {
                          const config = getCompanyConfig(activity.company_type);
                          return (
                            <div 
                              key={activity.id}
                              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                            >
                              <span className="text-lg">{config.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{activity.ceo_name}</span>
                                  {getStatusIcon(activity.status)}
                                </div>
                                <p className="text-sm text-muted-foreground truncate">
                                  {activity.action}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default CommandCenterPage;
