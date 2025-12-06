import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft,
  Megaphone,
  Users,
  Share2,
  Target,
  TrendingUp,
  BarChart3,
  MessageSquare,
  CheckCircle,
  Clock,
  Loader2,
  Sparkles
} from "lucide-react";
import { SimpleDashboardSidebar } from "@/components/SimpleDashboardSidebar";
import { PageHeader } from "@/components/PageHeader";
import { ProceedToNextPhaseButton } from "@/components/ProceedToNextPhaseButton";
import { StartPhaseButton } from "@/components/StartPhaseButton";
import { SocialCommandCenter } from "@/components/SocialCommandCenter";
import { PaidAdsHub } from "@/components/PaidAdsHub";
import { InfluencerPipeline } from "@/components/InfluencerPipeline";
import { MarketingAnalytics } from "@/components/MarketingAnalytics";
import { AgentChatSheet } from "@/components/AgentChatSheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const marketingAgents = [
  { 
    id: 'marketing-head', 
    name: 'Marketing Director', 
    role: 'Division Manager',
    description: 'Orchestrates all marketing activities and strategy',
    icon: Megaphone
  },
  { 
    id: 'seo-agent', 
    name: 'SEO Specialist', 
    role: 'Team Member',
    description: 'Optimizes content for search engines',
    icon: TrendingUp
  },
  { 
    id: 'social-media-agent', 
    name: 'Social Media Manager', 
    role: 'Team Member',
    description: 'Manages all social media channels',
    icon: Share2
  },
  { 
    id: 'paid-ads-agent', 
    name: 'Paid Ads Specialist', 
    role: 'Team Member',
    description: 'Creates and manages paid advertising campaigns',
    icon: Target
  },
  { 
    id: 'influencer-agent', 
    name: 'Influencer Outreach', 
    role: 'Team Member',
    description: 'Discovers and manages influencer partnerships',
    icon: Users
  },
];

export default function Phase5Page() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [phase, setPhase] = useState<any>(null);
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<typeof marketingAgents[0] | null>(null);

  useEffect(() => {
    if (projectId && user) {
      loadPhaseData();
      loadCampaigns();
    }
  }, [projectId, user]);

  const loadPhaseData = async () => {
    try {
      // Get phase 5 data
      const { data: phaseData } = await supabase
        .from('business_phases')
        .select('*')
        .eq('project_id', projectId)
        .eq('phase_number', 5)
        .single();

      if (phaseData) {
        setPhase(phaseData);

        // Get deliverables
        const { data: deliverablesData } = await supabase
          .from('phase_deliverables')
          .select('*')
          .eq('phase_id', phaseData.id)
          .order('created_at');

        setDeliverables(deliverablesData || []);
      }
    } catch (error) {
      console.error('Failed to load phase data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isPhaseFullyApproved = () => {
    if (deliverables.length === 0) return false;
    return deliverables.every((d: any) => d.ceo_approved && d.user_approved);
  };

  const loadCampaigns = async () => {
    try {
      const { data } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      setCampaigns(data || []);
      if (data && data.length > 0) {
        setSelectedCampaign(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    }
  };

  const createCampaign = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('marketing-campaign-manager', {
        body: {
          action: 'create_campaign',
          userId: user?.id,
          projectId,
          campaignData: {
            name: `Marketing Campaign ${campaigns.length + 1}`,
            type: 'social',
            budget: 1000,
            platforms: ['instagram', 'facebook']
          }
        }
      });

      if (error) throw error;
      toast.success("Campaign created!");
      loadCampaigns();
    } catch (error) {
      console.error('Failed to create campaign:', error);
      toast.error("Failed to create campaign");
    }
  };

  const completedDeliverables = deliverables.filter(d => d.status === 'approved').length;
  const progressPercent = deliverables.length > 0 
    ? (completedDeliverables / deliverables.length) * 100 
    : 0;

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <SimpleDashboardSidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <SimpleDashboardSidebar />
      
      <main className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate(`/projects/${projectId}`)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500">
                      <Megaphone className="h-5 w-5 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold">Phase 5: Marketing Launch</h1>
                    <Badge variant={phase?.status === 'active' ? 'default' : 'secondary'}>
                      {phase?.status || 'pending'}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-1">
                    Launch your marketing campaigns across all channels
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={createCampaign}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  New Campaign
                </Button>
                <PageHeader showNotifications={true} showLogout={true} />
              </div>
            </div>

            {/* Progress Overview */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">Phase Progress</h3>
                    <p className="text-sm text-muted-foreground">
                      {completedDeliverables} of {deliverables.length} deliverables completed
                    </p>
                  </div>
                  <Badge variant="outline" className="text-lg px-4 py-1">
                    {progressPercent.toFixed(0)}%
                  </Badge>
                </div>
                <Progress value={progressPercent} className="h-3" />
              </CardContent>
            </Card>

            {/* Start Phase Button */}
            <StartPhaseButton
              projectId={projectId!}
              phaseNumber={5}
              phaseStatus={phase?.status || 'pending'}
              onStart={loadPhaseData}
            />

            {/* Main Content Tabs */}
            <Tabs defaultValue="social" className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="social" className="flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  Social Media
                </TabsTrigger>
                <TabsTrigger value="ads" className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Paid Ads
                </TabsTrigger>
                <TabsTrigger value="influencers" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Influencers
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="team" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  AI Team
                </TabsTrigger>
              </TabsList>

              <TabsContent value="social">
                <SocialCommandCenter 
                  projectId={projectId!} 
                  campaignId={selectedCampaign}
                />
              </TabsContent>

              <TabsContent value="ads">
                <PaidAdsHub 
                  projectId={projectId!}
                  campaignId={selectedCampaign}
                />
              </TabsContent>

              <TabsContent value="influencers">
                <InfluencerPipeline projectId={projectId!} />
              </TabsContent>

              <TabsContent value="analytics">
                <MarketingAnalytics projectId={projectId!} />
              </TabsContent>

              <TabsContent value="team">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {marketingAgents.map((agent) => {
                    const Icon = agent.icon;
                    return (
                      <Card 
                        key={agent.id} 
                        className="cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => setSelectedAgent(agent)}
                      >
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500">
                              <Icon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{agent.name}</CardTitle>
                              <Badge variant="outline" className="mt-1">{agent.role}</Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-4">
                            {agent.description}
                          </p>
                          <Button variant="outline" className="w-full">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Chat with Agent
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>

            {/* Deliverables Section */}
            <Card>
              <CardHeader>
                <CardTitle>Phase 5 Deliverables</CardTitle>
                <CardDescription>
                  Required outputs for Marketing Launch phase
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {deliverables.map((deliverable) => (
                    <Card key={deliverable.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{deliverable.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {deliverable.description}
                          </p>
                        </div>
                        <Badge 
                          variant={
                            deliverable.status === 'approved' ? 'default' :
                            deliverable.status === 'in_progress' ? 'secondary' : 'outline'
                          }
                        >
                          {deliverable.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {deliverable.status === 'in_progress' && <Clock className="h-3 w-3 mr-1" />}
                          {deliverable.status}
                        </Badge>
                      </div>
                    </Card>
                  ))}

                  {deliverables.length === 0 && (
                    <div className="col-span-2 text-center py-8 text-muted-foreground">
                      <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No deliverables created yet</p>
                      <p className="text-sm">Deliverables will appear when the phase is activated</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Proceed to Next Phase Button */}
          <ProceedToNextPhaseButton
            projectId={projectId || ''}
            currentPhaseNumber={5}
            isPhaseApproved={isPhaseFullyApproved()}
          />
        </ScrollArea>
      </main>

      {/* Agent Chat Sheet */}
      <AgentChatSheet
        isOpen={!!selectedAgent}
        onClose={() => setSelectedAgent(null)}
        agentId={selectedAgent?.id || ''}
        agentName={selectedAgent?.name || ''}
        agentRole={selectedAgent?.role || ''}
      />
    </div>
  );
}
