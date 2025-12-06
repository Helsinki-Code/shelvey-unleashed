import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, FileText, Target, Type, Newspaper, Search, 
  Share2, Users, Loader2, CheckCircle2, Clock, Bot
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { SimpleDashboardSidebar } from "@/components/SimpleDashboardSidebar";
import { PageHeader } from "@/components/PageHeader";
import { ProceedToNextPhaseButton } from "@/components/ProceedToNextPhaseButton";
import { StartPhaseButton } from "@/components/StartPhaseButton";
import ContentStrategyBuilder from "@/components/ContentStrategyBuilder";
import WebsiteCopyGenerator from "@/components/WebsiteCopyGenerator";
import BlogArticleGenerator from "@/components/BlogArticleGenerator";
import SEODashboard from "@/components/SEODashboard";
import SocialContentFactory from "@/components/SocialContentFactory";

export default function Phase4Page() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [phase, setPhase] = useState<any>(null);
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("strategy");

  useEffect(() => {
    if (projectId && user) {
      fetchPhaseData();
    }
  }, [projectId, user]);

  const fetchPhaseData = async () => {
    try {
      // Fetch project
      const { data: projectData } = await supabase
        .from('business_projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      setProject(projectData);

      // Fetch Phase 4
      const { data: phaseData } = await supabase
        .from('business_phases')
        .select('*')
        .eq('project_id', projectId)
        .eq('phase_number', 4)
        .single();

      setPhase(phaseData);

      // Fetch deliverables
      if (phaseData) {
        const { data: deliverablesData } = await supabase
          .from('phase_deliverables')
          .select('*')
          .eq('phase_id', phaseData.id);

        setDeliverables(deliverablesData || []);
      }
    } catch (error) {
      console.error('Error fetching phase data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCompletionPercentage = () => {
    if (deliverables.length === 0) return 0;
    const completed = deliverables.filter(d => d.status === 'approved' || d.status === 'completed').length;
    return Math.round((completed / deliverables.length) * 100);
  };

  const isPhaseFullyApproved = () => {
    if (deliverables.length === 0) return false;
    return deliverables.every(d => d.ceo_approved && d.user_approved);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <SimpleDashboardSidebar />
        <main className="flex-1 p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <SimpleDashboardSidebar />
      <main className="flex-1 p-8 overflow-auto">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/projects/${projectId}`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Project
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                Phase 4: Content Creation
              </h1>
              <p className="text-muted-foreground mt-1">
                {project?.name} - Create compelling content for your business
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge 
                variant={phase?.status === 'completed' ? 'default' : phase?.status === 'active' ? 'secondary' : 'outline'}
                className="text-sm"
              >
                {phase?.status || 'pending'}
              </Badge>
              <PageHeader showNotifications={true} showLogout={true} />
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Phase Progress</span>
              <span className="text-sm text-muted-foreground">{getCompletionPercentage()}%</span>
            </div>
            <Progress value={getCompletionPercentage()} className="h-2" />
          </div>
        </div>

        {/* Start Phase Button */}
        <StartPhaseButton
          projectId={projectId!}
          phaseNumber={4}
          phaseStatus={phase?.status || 'pending'}
          onStart={fetchPhaseData}
        />

        {/* Deliverables Overview */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {deliverables.slice(0, 4).map((deliverable) => (
            <Card key={deliverable.id} className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{deliverable.name}</span>
                  {deliverable.status === 'approved' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : deliverable.status === 'in_progress' ? (
                    <Clock className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                  )}
                </div>
                <Badge variant="outline" className="text-xs">{deliverable.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="strategy" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden md:inline">Strategy</span>
            </TabsTrigger>
            <TabsTrigger value="copy" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              <span className="hidden md:inline">Website Copy</span>
            </TabsTrigger>
            <TabsTrigger value="blog" className="flex items-center gap-2">
              <Newspaper className="h-4 w-4" />
              <span className="hidden md:inline">Blog</span>
            </TabsTrigger>
            <TabsTrigger value="social" className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              <span className="hidden md:inline">Social</span>
            </TabsTrigger>
            <TabsTrigger value="seo" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span className="hidden md:inline">SEO</span>
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden md:inline">AI Team</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="strategy">
            <ContentStrategyBuilder 
              projectId={projectId!}
              businessName={project?.name}
              industry={project?.industry}
            />
          </TabsContent>

          <TabsContent value="copy">
            <WebsiteCopyGenerator 
              projectId={projectId!}
              businessName={project?.name}
              industry={project?.industry}
            />
          </TabsContent>

          <TabsContent value="blog">
            <BlogArticleGenerator 
              projectId={projectId!}
              businessName={project?.name}
              industry={project?.industry}
            />
          </TabsContent>

          <TabsContent value="social">
            <SocialContentFactory 
              projectId={projectId!}
              businessName={project?.name}
              industry={project?.industry}
            />
          </TabsContent>

          <TabsContent value="seo">
            <SEODashboard 
              projectId={projectId!}
            />
          </TabsContent>

          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Content Division AI Team
                </CardTitle>
                <CardDescription>
                  Meet the AI agents working on your content creation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { name: 'Content Creator Agent', role: 'Creates compelling content', status: 'active' },
                    { name: 'SEO Optimization Agent', role: 'Optimizes for search engines', status: 'active' },
                    { name: 'Social Media Agent', role: 'Creates social content', status: 'idle' },
                    { name: 'Content Editor Agent', role: 'Reviews and edits content', status: 'idle' },
                  ].map((agent, idx) => (
                    <Card key={idx} className="bg-muted/50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            agent.status === 'active' ? 'bg-green-500/20' : 'bg-muted'
                          }`}>
                            <Bot className={`h-5 w-5 ${agent.status === 'active' ? 'text-green-500' : 'text-muted-foreground'}`} />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{agent.name}</div>
                            <div className="text-xs text-muted-foreground">{agent.role}</div>
                          </div>
                        </div>
                        <Badge 
                          variant={agent.status === 'active' ? 'default' : 'secondary'}
                          className="mt-3"
                        >
                          {agent.status}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Proceed to Next Phase Button */}
        <ProceedToNextPhaseButton
          projectId={projectId || ''}
          currentPhaseNumber={4}
          isPhaseApproved={isPhaseFullyApproved()}
        />
      </main>
    </div>
  );
}
