import { useState } from 'react';
import { BlogEmpireEntry } from '@/components/BlogEmpireEntry';
import { AgentWarRoom } from '@/components/seo/AgentWarRoom';
import { RealTimeBlogAgentExecutor } from '@/components/blog/RealTimeBlogAgentExecutor';
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
    setMode('war-room');
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
      // Create blog project record
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
      
      // Create autopilot schedule
      const { error: scheduleError } = await supabase
        .from('blog_autopilot_schedules')
        .insert({
          user_id: user.id,
          blog_project_id: project.id,
          enabled: true,
          frequency_hours: 6,
          next_run: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // First run in 6 hours
          phases_config: {
            content_creation: true,
            seo_optimization: true,
            social_distribution: true,
            website_building: true
          }
        });

      if (scheduleError) {
        console.error('Error creating autopilot schedule:', scheduleError);
        // Don't fail the whole process for this
      }

      setMode('auto-build');
      toast.success('Blog empire building initiated!');
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

  if (mode === 'war-room') {
    // For now, redirect back to entry - we'll enhance this with proper war room integration
    toast.info('SEO War Room integration coming soon! Use existing SEO page for now.');
    setMode('entry');
    return null;
  }

  if (mode === 'auto-build' && buildProjectId) {
    // For auto-build mode, show the blog agent executor
    return (
      <div className="min-h-screen bg-background">
        <RealTimeBlogAgentExecutor 
          projectId={buildProjectId}
          projectName={`Auto-Built Blog Empire`}
          currentPhase={1}
          niche=""
          platform="custom"
          onPhaseChange={() => {}}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <BlogEmpireEntry 
        onStartAnalysis={handleStartAnalysis}
        onStartAutoBuild={handleStartAutoBuild}
      />
    </div>
  );
};

export default BlogEmpirePage;
