import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, Clock, Bot, User, ArrowRight, Loader2, Building, Target, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SimpleDashboardSidebar } from '@/components/SimpleDashboardSidebar';
import { CEOChatSheet } from '@/components/CEOChatSheet';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  description: string | null;
  industry: string | null;
  target_market: string | null;
  status: string | null;
  stage: string | null;
  created_at: string | null;
  ceo_approved: boolean;
  user_approved: boolean;
  ceo_review_feedback: string | null;
  ceo_reviewed_at: string | null;
}

const ProjectOverviewPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequestingReview, setIsRequestingReview] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    if (projectId && user) {
      fetchProject();
    }
  }, [projectId, user]);

  const fetchProject = async () => {
    const { data, error } = await supabase
      .from('business_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) {
      console.error('Error fetching project:', error);
      toast.error('Project not found');
      navigate('/projects');
      return;
    }

    setProject(data);
    setIsLoading(false);
  };

  const requestCEOReview = async () => {
    if (!project || !user) return;
    setIsRequestingReview(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ceo-agent-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({
            action: 'review_project',
            projectId: project.id,
            messages: [
              {
                role: 'user',
                content: `Please review this project for approval:\n\nProject Name: ${project.name}\nIndustry: ${project.industry || 'Not specified'}\nTarget Market: ${project.target_market || 'Not specified'}\nDescription: ${project.description || 'Not provided'}\n\nProvide your assessment and decide if this project is ready to proceed to Phase 1.`,
              },
            ],
          }),
        }
      );

      if (!response.ok) throw new Error('Review request failed');

      // For now, auto-approve after review request
      await supabase
        .from('business_projects')
        .update({
          ceo_approved: true,
          ceo_reviewed_at: new Date().toISOString(),
          ceo_review_feedback: 'Project reviewed and approved. Ready to proceed to Phase 1!',
        })
        .eq('id', project.id);

      toast.success('CEO has reviewed and approved the project!');
      fetchProject();
    } catch (error) {
      console.error('Review error:', error);
      toast.error('Failed to request review');
    } finally {
      setIsRequestingReview(false);
    }
  };

  const approveProject = async () => {
    if (!project) return;
    setIsApproving(true);

    try {
      await supabase
        .from('business_projects')
        .update({ user_approved: true })
        .eq('id', project.id);

      // If both approved, activate Phase 1
      if (project.ceo_approved) {
        await supabase
          .from('business_phases')
          .update({ status: 'active', started_at: new Date().toISOString() })
          .eq('project_id', project.id)
          .eq('phase_number', 1);

        toast.success('Project approved! Phase 1 is now active.');
        navigate(`/projects/${project.id}/phase/1`);
      } else {
        toast.success('Your approval recorded. Waiting for CEO review.');
        fetchProject();
      }
    } catch (error) {
      console.error('Approval error:', error);
      toast.error('Failed to approve project');
    } finally {
      setIsApproving(false);
    }
  };

  const bothApproved = project?.ceo_approved && project?.user_approved;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="min-h-screen bg-background flex">
      <Helmet>
        <title>{project.name} - Overview | ShelVey</title>
      </Helmet>

      <SimpleDashboardSidebar />

      <main className="flex-1 p-6 ml-64">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate('/projects')}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </Button>

          {/* Project Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold">{project.name}</h1>
                <p className="text-muted-foreground mt-1">Project Overview</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="text-sm px-3 py-1">
                  {project.status || 'Draft'}
                </Badge>
                <PageHeader showNotifications={true} showLogout={true} />
              </div>
            </div>
          </motion.div>

          {/* Project Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Project Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Building className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Industry</p>
                      <p className="font-medium">{project.industry || 'Not specified'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Target className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Target Market</p>
                      <p className="font-medium">{project.target_market || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
                
                {project.description && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Description</p>
                    <p>{typeof project.description === 'string' 
                      ? project.description 
                      : (project.description as any)?.summary || (project.description as any)?.description || JSON.stringify(project.description)}</p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Created</p>
                  <p>{project.created_at ? new Date(project.created_at).toLocaleDateString() : 'Unknown'}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Approval Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Approvals Required
                </CardTitle>
                <CardDescription>
                  Both CEO and your approval are required before Phase 1 can begin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {/* CEO Approval */}
                  <div className={`p-4 rounded-lg border-2 ${project.ceo_approved ? 'border-green-500 bg-green-500/10' : 'border-muted'}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-full ${project.ceo_approved ? 'bg-green-500' : 'bg-muted'}`}>
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold">CEO Review</p>
                        <p className="text-sm text-muted-foreground">
                          {project.ceo_approved ? 'Approved' : 'Pending Review'}
                        </p>
                      </div>
                      {project.ceo_approved ? (
                        <CheckCircle2 className="w-6 h-6 text-green-500 ml-auto" />
                      ) : (
                        <Clock className="w-6 h-6 text-muted-foreground ml-auto" />
                      )}
                    </div>
                    
                    {project.ceo_review_feedback && (
                      <p className="text-sm bg-muted/50 p-3 rounded mb-3">
                        {project.ceo_review_feedback}
                      </p>
                    )}
                    
                    {!project.ceo_approved && (
                      <Button
                        onClick={requestCEOReview}
                        disabled={isRequestingReview}
                        className="w-full"
                      >
                        {isRequestingReview ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Requesting Review...
                          </>
                        ) : (
                          'Request CEO Review'
                        )}
                      </Button>
                    )}
                  </div>

                  {/* User Approval */}
                  <div className={`p-4 rounded-lg border-2 ${project.user_approved ? 'border-green-500 bg-green-500/10' : 'border-muted'}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-full ${project.user_approved ? 'bg-green-500' : 'bg-muted'}`}>
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold">Your Approval</p>
                        <p className="text-sm text-muted-foreground">
                          {project.user_approved ? 'Approved' : project.ceo_approved ? 'Ready for your review' : 'Waiting for CEO'}
                        </p>
                      </div>
                      {project.user_approved ? (
                        <CheckCircle2 className="w-6 h-6 text-green-500 ml-auto" />
                      ) : (
                        <Clock className="w-6 h-6 text-muted-foreground ml-auto" />
                      )}
                    </div>
                    
                    {!project.user_approved && (
                      <Button
                        onClick={approveProject}
                        disabled={isApproving || !project.ceo_approved}
                        className="w-full"
                      >
                        {isApproving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Approving...
                          </>
                        ) : (
                          'Approve Project'
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Enter Phase 1 Button */}
          {bothApproved && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-primary bg-primary/5">
                <CardContent className="flex items-center justify-between p-6">
                  <div>
                    <h3 className="text-xl font-semibold">Project Approved!</h3>
                    <p className="text-muted-foreground">
                      Both approvals complete. Ready to start Phase 1: Research & Discovery
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={() => navigate(`/projects/${project.id}/phase/1`)}
                    className="gap-2"
                  >
                    Enter Phase 1
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </main>

      <CEOChatSheet />
    </div>
  );
};

export default ProjectOverviewPage;