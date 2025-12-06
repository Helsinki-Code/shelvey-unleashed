import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Bot, MessageSquare, Briefcase, Plus, Loader2, ChevronRight,
  Sparkles, Users, HelpCircle, BookOpen, Mic
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import { FeatureGuide } from '@/components/FeatureGuide';
import { FeatureTour, useTour } from '@/components/FeatureTour';
import { QuickActivityFeed } from '@/components/QuickActivityFeed';
import { AllAgentVoiceCall } from '@/components/AllAgentVoiceCall';
import { CEOAgentChat } from '@/components/CEOAgentChat';
import { UserAPIKeys } from '@/components/UserAPIKeys';
import { UserMCPServers } from '@/components/UserMCPServers';
import { UserProjects } from '@/components/UserProjects';
import { TeamMeetingView } from '@/components/TeamMeetingView';
import { AgentMessagesPanel } from '@/components/AgentMessagesPanel';
import { EscalationTracker } from '@/components/EscalationTracker';
import { ProgressReportsPanel } from '@/components/ProgressReportsPanel';
import { HelpTooltip, HELP_CONTENT } from '@/components/HelpTooltip';
import { GlobalAgentActivityPanel } from '@/components/GlobalAgentActivityPanel';

const UserDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, isLoading, signOut } = useAuth();
  const [activeSection, setActiveSection] = useState('home');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showFeatureGuide, setShowFeatureGuide] = useState(false);
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  
  // Feature tour
  const { showTour, completeTour, skipTour } = useTour('dashboard');

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    // Check if onboarding is needed (simplified check)
    if (profile && !profile.full_name) {
      setShowOnboarding(true);
    }
  }, [profile]);

  useEffect(() => {
    if (user) {
      supabase
        .from('business_projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)
        .then(({ data }) => {
          setProjects(data || []);
          setProjectsLoading(false);
        });
    }
  }, [user]);

  const handleNavigation = (section: string) => {
    if (section === 'help') {
      setShowFeatureGuide(true);
    } else if (section === 'features') {
      setShowFeatureGuide(true);
    } else {
      setActiveSection(section);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <DashboardSidebar onNavigate={handleNavigation} activeSection={activeSection} />

      {/* Main Content */}
      <main className="flex-1 ml-[260px] p-6">
        {activeSection === 'home' && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Greeting Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between"
            >
              <div>
                <h1 className="text-3xl font-bold">
                  {greeting}, {firstName}! 👋
                </h1>
                <p className="text-muted-foreground">
                  Here's what's happening with your AI team
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowFeatureGuide(true)}>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Features Guide
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowVoiceCall(true)}
                  data-tour="voice"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  Voice Call
                </Button>
              </div>
            </motion.div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Chat */}
              <Card className="lg:col-span-2 row-span-2" data-tour="ceo-chat">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    Quick Chat with CEO
                    <HelpTooltip
                      title="CEO Agent"
                      description="Chat with Ava, your AI CEO. She can help plan projects, delegate tasks to your AI team, and answer any business questions."
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] overflow-hidden">
                    <CEOAgentChat />
                  </div>
                </CardContent>
              </Card>

              {/* Projects */}
              <Card data-tour="projects">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    📋 Your Projects
                    <HelpTooltip
                      title={HELP_CONTENT.phase.title}
                      description={HELP_CONTENT.phase.description}
                    />
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setActiveSection('projects')}>
                    View All <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {projectsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="text-center py-8">
                      <Briefcase className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground mb-4">No projects yet</p>
                      <Button onClick={() => setActiveSection('ceo')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Start New Project
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {projects.slice(0, 3).map((project) => (
                        <div
                          key={project.id}
                          className="p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                          onClick={() => navigate(`/projects/${project.id}`)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{project.name}</span>
                            <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                              {project.stage || 'Research'}
                            </Badge>
                          </div>
                          <Progress value={45} className="h-2" />
                        </div>
                      ))}
                      <Button variant="outline" className="w-full" onClick={() => setActiveSection('ceo')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Start New Project
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Global Agent Activity Panel */}
              <div className="row-span-2" data-tour="activity">
                <GlobalAgentActivityPanel />
              </div>

              {/* Projects - Moved to span 2 cols */}
            </div>
            
            {/* Activity Feed - Full Width */}
            <QuickActivityFeed onViewAll={() => setActiveSection('team')} />
          </div>
        )}

        {activeSection === 'ceo' && (
          <div className="max-w-4xl mx-auto">
            <CEOAgentChat />
          </div>
        )}

        {activeSection === 'projects' && <UserProjects />}

        {activeSection === 'team' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <TeamMeetingView />
                  <AgentMessagesPanel />
                </div>
                <ProgressReportsPanel />
              </div>
              <GlobalAgentActivityPanel />
            </div>
            <EscalationTracker />
          </div>
        )}

        {activeSection === 'servers' && <UserMCPServers />}
        {activeSection === 'keys' && <UserAPIKeys />}
      </main>

      {/* Modals */}
      {showOnboarding && (
        <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
      )}

      <FeatureGuide isOpen={showFeatureGuide} onClose={() => setShowFeatureGuide(false)} />

      <AllAgentVoiceCall
        isOpen={showVoiceCall}
        onClose={() => setShowVoiceCall(false)}
      />

      {/* Feature Tour */}
      {showTour && !showOnboarding && (
        <FeatureTour
          tourId="dashboard"
          steps={[]}
          onComplete={completeTour}
          onSkip={skipTour}
        />
      )}
    </div>
  );
};

export default UserDashboard;
