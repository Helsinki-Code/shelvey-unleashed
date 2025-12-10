import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Briefcase, Plus, TrendingUp, Target, Loader2, MoreVertical, Trash2, Eye, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Project {
  id: string;
  name: string;
  description: string | object | null;
  stage: string;
  industry: string | null;
  revenue: number;
  status: string;
  created_at: string;
}

// Helper to safely render description (can be string or object)
const safeRenderDescription = (desc: string | object | null): string => {
  if (!desc) return '';
  if (typeof desc === 'string') return desc;
  if (typeof desc === 'object') {
    // Handle object with known keys
    const obj = desc as Record<string, any>;
    return obj.summary || obj.description || obj.project_name || JSON.stringify(obj);
  }
  return String(desc);
};

const stageColors: Record<string, string> = {
  research: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  building: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  marketing: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  launching: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  scaling: 'bg-primary/10 text-primary border-primary/20',
};

export const UserProjects = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    industry: '',
  });

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('business_projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
    } else {
      setProjects(data || []);
    }
    
    setIsLoading(false);
  };

  const createProject = async () => {
    if (!user || !newProject.name) return;
    
    setIsCreating(true);
    
    const { error } = await supabase
      .from('business_projects')
      .insert({
        user_id: user.id,
        name: newProject.name,
        description: newProject.description || null,
        industry: newProject.industry || null,
        stage: 'research',
        status: 'active',
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create project',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Project created!',
        description: 'Start chatting with your CEO Agent to develop this business.',
      });
      setNewProject({ name: '', description: '', industry: '' });
      setShowDialog(false);
      fetchProjects();
    }
    
    setIsCreating(false);
  };

  const deleteProject = async (projectId: string) => {
    const { error } = await supabase
      .from('business_projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete project',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Project deleted',
      });
      fetchProjects();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalRevenue = projects.reduce((acc, p) => acc + (p.revenue || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold cyber-text">Business Projects</h2>
          <p className="text-muted-foreground">
            {projects.length} project{projects.length !== 1 ? 's' : ''} • ${totalRevenue.toLocaleString()} total revenue
          </p>
        </div>
        
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Business Project</DialogTitle>
              <DialogDescription>
                Start a new business venture. Your CEO Agent will help you research, plan, and build it.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Project Name</Label>
                <Input
                  placeholder="e.g., AI Content Agency"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Industry (optional)</Label>
                <Input
                  placeholder="e.g., Marketing, SaaS, E-commerce"
                  value={newProject.industry}
                  onChange={(e) => setNewProject({ ...newProject, industry: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea
                  placeholder="Brief description of your business idea..."
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                />
              </div>
              <Button 
                className="w-full" 
                onClick={createProject}
                disabled={!newProject.name || isCreating}
              >
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Project
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Projects Grid */}
      {projects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card 
                className="glass-morphism cyber-border h-full cursor-pointer hover:border-primary/50 transition-all"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      {project.description && (
                        <CardDescription className="mt-1 line-clamp-2">
                          {safeRenderDescription(project.description)}
                        </CardDescription>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/projects/${project.id}`);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteProject(project.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-4">
                    <Badge className={stageColors[project.stage] || stageColors.research}>
                      <Target className="w-3 h-3 mr-1" />
                      {project.stage.charAt(0).toUpperCase() + project.stage.slice(1)}
                    </Badge>
                    {project.industry && (
                      <Badge variant="outline">{project.industry}</Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm mb-3">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <TrendingUp className="w-4 h-4" />
                      Revenue
                    </div>
                    <span className="font-bold text-primary">
                      ${(project.revenue || 0).toLocaleString()}
                    </span>
                  </div>

                  <Button variant="outline" size="sm" className="w-full gap-2">
                    View Journey
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="glass-morphism cyber-border">
          <CardContent className="py-12 text-center">
            <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first business project and let your CEO Agent help you build it.
            </p>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Project
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
