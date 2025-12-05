import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { OrgChart } from '@/components/OrgChart';
import { PhaseTimeline } from '@/components/PhaseTimeline';
import { TeamDashboard } from '@/components/TeamDashboard';
import { DeliverableTracker } from '@/components/DeliverableTracker';
import { RealTimeActivityFeed } from '@/components/RealTimeActivityFeed';
import { CEOAgentChat } from '@/components/CEOAgentChat';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { SubscriptionGate } from '@/components/SubscriptionGate';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Building2, Users, Clock, FileText, Play, 
  Plus, Loader2, Briefcase, Activity, Bot, BarChart3
} from 'lucide-react';
import { toast } from 'sonner';

interface BusinessProject {
  id: string;
  name: string;
  stage: string;
  status: string;
}

export default function OrganizationPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<BusinessProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('business_projects')
      .select('id, name, stage, status')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (data) {
      setProjects(data);
      if (data.length > 0 && !selectedProject) {
        setSelectedProject(data[0].id);
      }
    }
    setIsLoading(false);
  };

  const handleInitializeProject = async () => {
    if (!selectedProject || !user) return;

    setInitializing(true);
    try {
      const response = await supabase.functions.invoke('coo-coordinator', {
        body: {
          action: 'initialize_project',
          projectId: selectedProject,
          userId: user.id
        }
      });

      if (response.error) throw response.error;
      toast.success('Project phases initialized! Research team is now active.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to initialize project');
    } finally {
      setInitializing(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Organization | ShelVey AI</title>
        <meta name="description" content="View and manage your AI business organization structure" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="container mx-auto px-4 pt-24 pb-16">
          <SubscriptionGate>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-7xl mx-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Building2 className="w-8 h-8 text-primary" />
                    Organization Hub
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Manage your AI business teams and track progress
                  </p>
                </div>

                {/* Project Selector */}
                <div className="flex items-center gap-3">
                  <select
                    value={selectedProject || ''}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  >
                    <option value="" disabled>Select Project</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>

                  {selectedProject && (
                    <Button 
                      onClick={handleInitializeProject}
                      disabled={initializing}
                      className="gap-2"
                    >
                      {initializing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      Start Business
                    </Button>
                  )}
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : projects.length === 0 ? (
                <Card className="bg-card/50 backdrop-blur border-primary/20">
                  <CardContent className="p-12 text-center">
                    <Briefcase className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h2 className="text-xl font-semibold mb-2">No Projects Yet</h2>
                    <p className="text-muted-foreground mb-4">
                      Create a business project from the Pipeline page to get started
                    </p>
                    <Button onClick={() => window.location.href = '/pipeline'}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Project
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Tabs defaultValue="timeline" className="space-y-6">
                  <TabsList className="grid w-full max-w-3xl grid-cols-7">
                    <TabsTrigger value="timeline" className="gap-2">
                      <Clock className="w-4 h-4" />
                      Timeline
                    </TabsTrigger>
                    <TabsTrigger value="ceo" className="gap-2">
                      <Bot className="w-4 h-4" />
                      CEO
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="gap-2">
                      <Activity className="w-4 h-4" />
                      Activity
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Analytics
                    </TabsTrigger>
                    <TabsTrigger value="org" className="gap-2">
                      <Users className="w-4 h-4" />
                      Org
                    </TabsTrigger>
                    <TabsTrigger value="teams" className="gap-2">
                      <Building2 className="w-4 h-4" />
                      Teams
                    </TabsTrigger>
                    <TabsTrigger value="deliverables" className="gap-2">
                      <FileText className="w-4 h-4" />
                      Work
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="timeline">
                    {selectedProject && <PhaseTimeline projectId={selectedProject} />}
                  </TabsContent>

                  <TabsContent value="ceo">
                    <CEOAgentChat projectId={selectedProject || undefined} showDelegation={true} />
                  </TabsContent>

                  <TabsContent value="activity">
                    <RealTimeActivityFeed userId={user?.id} projectId={selectedProject || undefined} />
                  </TabsContent>

                  <TabsContent value="analytics">
                    <AnalyticsDashboard />
                  </TabsContent>

                  <TabsContent value="org">
                    <OrgChart />
                  </TabsContent>

                  <TabsContent value="teams">
                    <TeamDashboard />
                  </TabsContent>

                  <TabsContent value="deliverables">
                    {selectedProject && <DeliverableTracker projectId={selectedProject} />}
                  </TabsContent>
                </Tabs>
              )}
            </motion.div>
          </SubscriptionGate>
        </main>

        <Footer />
      </div>
    </>
  );
}
