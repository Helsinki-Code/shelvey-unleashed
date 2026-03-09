import { useState } from 'react';
import { BlogEmpireEntry } from '@/components/BlogEmpireEntry';
import { RealTimeBlogAgentExecutor } from '@/components/blog/RealTimeBlogAgentExecutor';
import { SimpleDashboardSidebar } from '@/components/SimpleDashboardSidebar';
import { PageHeader } from '@/components/PageHeader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const BlogEmpirePage = () => {
  const { user } = useAuth();
  const [mode, setMode] = useState<'entry' | 'war-room' | 'auto-build'>('entry');
  const [currentUrl, setCurrentUrl] = useState('');
  const [currentGoals, setCurrentGoals] = useState('');
  const [buildProjectId, setBuildProjectId] = useState<string | null>(null);

  const handleStartAnalysis = (url: string, goals: string) => {
    setCurrentUrl(url);
    setCurrentGoals(goals);
    toast.info('SEO War Room integration coming soon! Use existing SEO page for now.');
    setMode('entry');
  };

  const handleStartAutoBuild = async (data: {
    topic: string;
    niche: string;
    platform: string;
    goals: string;
  }) => {
    if (!user) {
      toast.error('Please sign in to start building your blog empire');
      return;
    }

    try {
      const { data: project, error: projectError } = await supabase
        .from('blog_projects')
        .insert({
          user_id: user.id,
          name: `${data.topic} Blog Empire`,
          niche: data.niche,
          platform: data.platform,
          status: 'building',
          auto_generated: true,
          metadata: {
            topic: data.topic,
            goals: data.goals,
            creation_date: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (projectError) {
        console.error('Error creating blog project:', projectError);
        toast.error('Failed to create blog project');
        return;
      }

      setBuildProjectId(project.id);

      await supabase
        .from('blog_autopilot_schedules')
        .insert({
          user_id: user.id,
          blog_project_id: project.id,
          enabled: true,
          frequency_hours: 6,
          next_run: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
          phases_config: {
            content_creation: true,
            seo_optimization: true,
            social_distribution: true,
            website_building: true
          }
        });

      toast.info('Starting blog empire construction...');

      const buildResponse = await supabase.functions.invoke('blog-website-builder', {
        body: {
          topic: data.topic,
          niche: data.niche,
          platform: data.platform,
          goals: data.goals,
          projectId: project.id,
          userId: user.id
        }
      });

      if (buildResponse.error) {
        console.error('Auto-build failed:', buildResponse.error);
        toast.error('Failed to start auto-build process');
        return;
      }

      setMode('auto-build');
      toast.success('Blog empire building initiated! Your site is being deployed...');
    } catch (error) {
      console.error('Error starting auto-build:', error);
      toast.error('Failed to start blog empire building');
    }
  };

  const handleBack = () => {
    setMode('entry');
    setCurrentUrl('');
    setCurrentGoals('');
    setBuildProjectId(null);
  };

  return (
    <div className="min-h-screen bg-background flex">
      <SimpleDashboardSidebar />

      <main className="flex-1 ml-[260px] p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Blog Empire</h1>
          <PageHeader />
        </div>

        {mode === 'auto-build' && buildProjectId ? (
          <RealTimeBlogAgentExecutor
            projectId={buildProjectId}
            projectName="Auto-Built Blog Empire"
            currentPhase={1}
            niche=""
            platform="custom"
            onPhaseChange={() => {}}
          />
        ) : (
          <BlogEmpireEntry
            onStartAnalysis={handleStartAnalysis}
            onStartAutoBuild={handleStartAutoBuild}
          />
        )}
      </main>
    </div>
  );
};

export default BlogEmpirePage;
