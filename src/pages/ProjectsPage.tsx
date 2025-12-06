import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Bot, Folder, ArrowRight, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { SimpleDashboardSidebar } from '@/components/SimpleDashboardSidebar';
import { CEOChatSheet } from '@/components/CEOChatSheet';
import { ProjectCreationCEOChat } from '@/components/ProjectCreationCEOChat';
import { PageHeader } from '@/components/PageHeader';
import { PhaseProgressIndicator } from '@/components/PhaseProgressIndicator';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Project {
  id: string;
  name: string;
  description: string | null;
  industry: string | null;
  status: string | null;
  stage: string | null;
  created_at: string | null;
  ceo_approved: boolean;
  user_approved: boolean;
  currentPhase?: number;
  progress?: number;
}

const ProjectsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCEOCreation, setShowCEOCreation] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    if (!user) return;

    const { data: projectsData, error } = await supabase
      .from('business_projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      return;
    }

    // Fetch phase info for each project
    const projectsWithPhases = await Promise.all(
      (projectsData || []).map(async (project) => {
        const { data: phases } = await supabase
          .from('business_phases')
          .select('phase_number, status')
          .eq('project_id', project.id)
          .order('phase_number');

        const activePhase = phases?.find(p => p.status === 'active')?.phase_number || 1;
        const completedPhases = phases?.filter(p => p.status === 'completed').length || 0;
        const progress = Math.round((completedPhases / 6) * 100);

        return {
          ...project,
          currentPhase: activePhase,
          progress,
        };
      })
    );

    setProjects(projectsWithPhases);
    setIsLoading(false);
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'active': return 'bg-primary/20 text-primary';
      case 'completed': return 'bg-green-500/20 text-green-500';
      case 'paused': return 'bg-yellow-500/20 text-yellow-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleProjectCreated = () => {
    setShowCEOCreation(false);
    fetchProjects();
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Helmet>
        <title>Projects | ShelVey</title>
      </Helmet>

      <SimpleDashboardSidebar />

      <main className="flex-1 p-6 ml-64">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">My Projects</h1>
              <p className="text-muted-foreground mt-1">
                Create and manage your business projects
              </p>
            </div>
            <PageHeader showNotifications={true} showLogout={true} />
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-3 mb-8">
            <Button
              variant="outline"
              onClick={() => setShowCEOCreation(true)}
              className="gap-2"
            >
              <Bot className="w-4 h-4" />
              Create with CEO
            </Button>
            <Button onClick={() => navigate('/projects/new')} className="gap-2">
              <Plus className="w-4 h-4" />
              New Project
            </Button>
          </div>

          {/* Projects Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="h-24 bg-muted/50" />
                  <CardContent className="h-32" />
                </Card>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Folder className="w-16 h-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-md">
                  Start your first business project! Chat with your CEO to brainstorm ideas
                  or create a project directly.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowCEOCreation(true)}
                    className="gap-2"
                  >
                    <Bot className="w-4 h-4" />
                    Chat with CEO
                  </Button>
                  <Button onClick={() => navigate('/projects/new')} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create Project
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    className="cursor-pointer hover:border-primary/50 transition-colors group"
                    onClick={() => navigate(`/projects/${project.id}/overview`)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg line-clamp-1">
                          {project.name}
                        </CardTitle>
                        <Badge className={getStatusColor(project.status)}>
                          {project.status || 'draft'}
                        </Badge>
                      </div>
                      {project.industry && (
                        <p className="text-sm text-muted-foreground">
                          {project.industry}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent>
                      {project.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {project.description}
                        </p>
                      )}

                      {/* Phase Progress Indicator */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="font-medium text-primary">
                            Phase {project.currentPhase}: {['Research', 'Branding', 'Development', 'Content', 'Marketing', 'Sales'][project.currentPhase - 1]}
                          </span>
                          <span className="text-muted-foreground">{project.progress}% complete</span>
                        </div>
                        <PhaseProgressIndicator 
                          currentPhase={project.currentPhase || 1} 
                          compact={true}
                        />
                      </div>

                      {/* Approval Status */}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          {project.ceo_approved ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <Clock className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className={project.ceo_approved ? 'text-green-500' : 'text-muted-foreground'}>
                            CEO
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {project.user_approved ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <Clock className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className={project.user_approved ? 'text-green-500' : 'text-muted-foreground'}>
                            You
                          </span>
                        </div>
                      </div>

                      {/* View Project Link */}
                      <div className="flex items-center justify-end mt-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-sm font-medium">View Project</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* CEO Chat Sheet */}
      <CEOChatSheet />

      {/* CEO Project Creation Modal */}
      <ProjectCreationCEOChat
        open={showCEOCreation}
        onClose={() => setShowCEOCreation(false)}
        onProjectCreated={handleProjectCreated}
      />
    </div>
  );
};

export default ProjectsPage;