import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Code, 
  Globe, 
  Loader2, 
  Bot, 
  CheckCircle2, 
  Eye, 
  MessageSquare, 
  Rocket, 
  RefreshCw, 
  ExternalLink, 
  Shield,
  Sparkles,
  FileText,
  Layers,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SimpleDashboardSidebar } from '@/components/SimpleDashboardSidebar';
import { AgentChatSheet } from '@/components/AgentChatSheet';
import { PageHeader } from '@/components/PageHeader';
import { StartPhaseButton } from '@/components/StartPhaseButton';
import { V0Builder } from '@/components/v0-builder';
import { WebsiteSpecsAgent } from '@/components/WebsiteSpecsAgent';
import { LiveAgentWorkPreview } from '@/components/LiveAgentWorkPreview';
import { PhaseAgentCard } from '@/components/PhaseAgentCard';
import { DeliverableCard } from '@/components/DeliverableCard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getPhaseAgent } from '@/lib/phase-agents';

interface GeneratedWebsite {
  id: string;
  name: string;
  html_content: string;
  css_content: string | null;
  js_content: string | null;
  status: string;
  deployed_url: string | null;
  domain_name: string | null;
  custom_domain: string | null;
  hosting_type: string | null;
  dns_records: any | null;
  ssl_status: string | null;
  ceo_approved: boolean | null;
  user_approved: boolean | null;
}

interface Deliverable {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  deliverable_type: string;
  ceo_approved: boolean | null;
  user_approved: boolean | null;
  feedback: string | null;
  generated_content: any;
  screenshots: any;
  citations: any;
  assigned_agent_id: string | null;
}

interface ActivityLog {
  id: string;
  action: string;
  status: string;
  created_at: string;
  agent_name: string;
}

const PHASE_AGENT = getPhaseAgent(3)!;

const Phase3Page = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [phase, setPhase] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('builder');
  const [chatOpen, setChatOpen] = useState(false);
  
  // Website generation state
  const [generatedWebsite, setGeneratedWebsite] = useState<GeneratedWebsite | null>(null);
  
  // Branding state from Phase 2
  const [branding, setBranding] = useState<any>(null);

  // Website specs approval state
  const [specsApproved, setSpecsApproved] = useState(false);
  const [approvedSpecs, setApprovedSpecs] = useState<any>(null);

  // Deliverables and activity
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (projectId && user) {
      fetchData();
    }
  }, [projectId, user]);

  // Real-time subscription for deliverables
  useEffect(() => {
    if (!phase?.id) return;

    const channel = supabase
      .channel(`phase3-deliverables-${phase.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'phase_deliverables',
          filter: `phase_id=eq.${phase.id}`
        },
        () => {
          fetchDeliverables();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [phase?.id]);

  // Real-time subscription for activity logs
  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`phase3-activity-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_activity_logs',
          filter: `agent_id=eq.${PHASE_AGENT.id}`
        },
        (payload) => {
          const newLog = payload.new as any;
          setActivityLogs((prev) => [
            {
              id: newLog.id,
              action: newLog.action,
              status: newLog.status,
              created_at: newLog.created_at,
              agent_name: newLog.agent_name,
            },
            ...prev.slice(0, 19),
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch project
      const { data: projectData } = await supabase
        .from('business_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectData) setProject(projectData);

      // Fetch phase
      const { data: phaseData } = await supabase
        .from('business_phases')
        .select('*')
        .eq('project_id', projectId)
        .eq('phase_number', 3)
        .single();

      if (phaseData) {
        setPhase(phaseData);
        
        // Check if specs are already approved
        const { data: specsDeliverable } = await supabase
          .from('phase_deliverables')
          .select('*')
          .eq('phase_id', phaseData.id)
          .eq('deliverable_type', 'website_specs')
          .maybeSingle();

        if (specsDeliverable?.ceo_approved && specsDeliverable?.user_approved) {
          setSpecsApproved(true);
          setApprovedSpecs((specsDeliverable.generated_content as any)?.specs);
        }

        // Fetch deliverables
        const { data: deliverablesData } = await supabase
          .from('phase_deliverables')
          .select('*')
          .eq('phase_id', phaseData.id)
          .order('created_at', { ascending: false });

        if (deliverablesData) {
          setDeliverables(deliverablesData as Deliverable[]);
        }
      }

      // Fetch branding from Phase 2
      const { data: brandingPhase } = await supabase
        .from('business_phases')
        .select('id')
        .eq('project_id', projectId)
        .eq('phase_number', 2)
        .single();

      if (brandingPhase) {
        const { data: brandDeliverables } = await supabase
          .from('phase_deliverables')
          .select('*')
          .eq('phase_id', brandingPhase.id)
          .eq('deliverable_type', 'brand_assets')
          .eq('user_approved', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (brandDeliverables?.generated_content) {
          const content = brandDeliverables.generated_content as any;
          const assets = Array.isArray(content.assets) ? content.assets : [];

          const paletteAsset = assets.find((a: any) => a.type === 'color_palette');
          const palette = paletteAsset?.colorData || content.colorPalette || content.colors;

          const logoAsset = assets.find((a: any) => a.type === 'logo');
          const logoUrl = logoAsset?.imageUrl || logoAsset?.url;

          setBranding({
            primaryColor: palette?.primary || palette?.[0]?.hex || palette?.[0],
            secondaryColor: palette?.secondary || palette?.[1]?.hex || palette?.[1],
            accentColor: palette?.accent || palette?.[2]?.hex || palette?.[2],
            logo: logoUrl,
            headingFont: content.typography?.headingFont,
            bodyFont: content.typography?.bodyFont,
          });
        }
      }

      // Check for existing generated website
      const { data: websiteData } = await supabase
        .from('generated_websites')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (websiteData) {
        setGeneratedWebsite(websiteData);
      }

      // Fetch activity logs
      const { data: logsData } = await supabase
        .from('agent_activity_logs')
        .select('*')
        .eq('agent_id', PHASE_AGENT.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (logsData) {
        setActivityLogs(logsData.map((log: any) => ({
          id: log.id,
          action: log.action,
          status: log.status,
          created_at: log.created_at,
          agent_name: log.agent_name,
        })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDeliverables = async () => {
    if (!phase?.id) return;
    const { data } = await supabase
      .from('phase_deliverables')
      .select('*')
      .eq('phase_id', phase.id)
      .order('created_at', { ascending: false });
    if (data) {
      setDeliverables(data as Deliverable[]);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
    toast.success('Data refreshed');
  };

  const handleSpecsApproved = (specs: any) => {
    setApprovedSpecs(specs);
    setSpecsApproved(true);
    setActiveTab('builder');
    toast.success('Specifications approved! You can now build your website.');
  };

  const getPhaseProgress = () => {
    const total = deliverables.length || 1;
    const approved = deliverables.filter(d => d.ceo_approved && d.user_approved).length;
    return Math.round((approved / total) * 100);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return date.toLocaleTimeString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Helmet>
        <title>Phase 3: Development & Build | {project?.name} | ShelVey</title>
      </Helmet>

      <SimpleDashboardSidebar />

      <main className="flex-1 p-6 ml-64">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate(`/projects/${projectId}`)}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Project
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Code className="w-6 h-6 text-primary" />
                  Phase 3: Development & Build
                </h1>
                <p className="text-muted-foreground">{project?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Badge className={phase?.status === 'active' ? 'bg-green-500' : phase?.status === 'completed' ? 'bg-blue-500' : 'bg-muted'}>
                {phase?.status || 'pending'}
              </Badge>
              <PageHeader showNotifications={true} showLogout={true} />
            </div>
          </div>

          {/* Progress Card */}
          <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Code className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Phase Progress</p>
                    <p className="text-sm text-muted-foreground">
                      {deliverables.filter(d => d.ceo_approved && d.user_approved).length} of {deliverables.length} deliverables approved
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{getPhaseProgress()}%</p>
                </div>
              </div>
              <Progress value={getPhaseProgress()} className="h-2" />
            </CardContent>
          </Card>

          {/* Status Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <FileText className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Specs Status</p>
                    <p className="font-medium">
                      {specsApproved ? 'Approved' : 'Pending Approval'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Globe className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Deployment Status</p>
                    <p className="font-medium">
                      {generatedWebsite?.deployed_url ? 'Live' : 'Not Deployed'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Shield className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">SSL Status</p>
                    <p className="font-medium">
                      {generatedWebsite?.deployed_url ? 'Active' : 'Pending'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Start Phase Button */}
          <StartPhaseButton
            projectId={projectId!}
            phaseNumber={3}
            phaseStatus={phase?.status || 'pending'}
            onStart={fetchData}
          />

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="builder" className="gap-2">
                <Sparkles className="w-4 h-4" />
                Website Builder
              </TabsTrigger>
              <TabsTrigger value="specs" className="gap-2">
                <FileText className="w-4 h-4" />
                Specifications
                {specsApproved && <CheckCircle2 className="w-3 h-3 text-green-500" />}
              </TabsTrigger>
              <TabsTrigger value="agent" className="gap-2">
                <Bot className="w-4 h-4" />
                Agent
              </TabsTrigger>
              <TabsTrigger value="deliverables" className="gap-2">
                <Layers className="w-4 h-4" />
                Deliverables
                <Badge variant="secondary" className="ml-1">{deliverables.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2">
                <Activity className="w-4 h-4" />
                Live Activity
              </TabsTrigger>
            </TabsList>

            {/* Website Builder Tab */}
            <TabsContent value="builder">
              {!specsApproved ? (
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardContent className="py-12 text-center">
                    <FileText className="w-12 h-12 mx-auto text-amber-500 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Website Specifications Required</h3>
                    <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                      Before you can build your website, you need to approve the website specifications. 
                      This ensures the AI builder knows exactly what to create.
                    </p>
                    <Button onClick={() => setActiveTab('specs')} className="gap-2">
                      <FileText className="w-4 h-4" />
                      Go to Specifications
                    </Button>
                  </CardContent>
                </Card>
              ) : project && (
                <div className="space-y-4">
                  {/* Live deployment status */}
                  {generatedWebsite?.deployed_url && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-lg bg-green-500/10 border border-green-500/30"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-6 h-6 text-green-500" />
                          <div>
                            <p className="font-medium text-green-700 dark:text-green-300">Website is Live!</p>
                            <a 
                              href={generatedWebsite.deployed_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
                            >
                              {generatedWebsite.deployed_url}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a href={generatedWebsite.deployed_url} target="_blank" rel="noopener noreferrer">
                            <Globe className="w-4 h-4 mr-2" />
                            Visit Site
                          </a>
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* Domain marketplace CTA */}
                  <Card>
                    <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="font-medium">Want a custom domain?</p>
                        <p className="text-sm text-muted-foreground">
                          Search and buy a domain inside ShelVey, then connect it during hosting setup.
                        </p>
                      </div>
                      <Button variant="outline" onClick={() => navigate('/domains')} className="gap-2">
                        <Globe className="w-4 h-4" />
                        Buy a Domain
                      </Button>
                    </CardContent>
                  </Card>
                  
                  {/* V0 Builder */}
                  <V0Builder
                    projectId={projectId!}
                    project={{
                      name: project.name,
                      industry: project.industry || 'General',
                      description: project.description || '',
                    }}
                    branding={branding}
                    approvedSpecs={approvedSpecs}
                    onDeploymentComplete={(url) => {
                      setGeneratedWebsite(prev => prev ? { ...prev, deployed_url: url } : {
                        id: crypto.randomUUID(),
                        name: `${project.name} Website`,
                        html_content: '',
                        css_content: null,
                        js_content: null,
                        status: 'deployed',
                        deployed_url: url,
                        domain_name: null,
                        custom_domain: null,
                        hosting_type: 'vercel',
                        dns_records: null,
                        ssl_status: null,
                        ceo_approved: null,
                        user_approved: null,
                      });
                      fetchData();
                    }}
                  />
                </div>
              )}
            </TabsContent>

            {/* Specs Tab */}
            <TabsContent value="specs">
              {project && phase && (
                <WebsiteSpecsAgent
                  projectId={projectId!}
                  phaseId={phase.id}
                  project={{
                    name: project.name,
                    industry: project.industry || 'General',
                    description: project.description || '',
                  }}
                  onSpecsApproved={handleSpecsApproved}
                />
              )}
            </TabsContent>

            {/* Agent Tab */}
            <TabsContent value="agent">
              <div className="grid lg:grid-cols-2 gap-6">
                <PhaseAgentCard
                  phaseNumber={3}
                  onChat={() => setChatOpen(true)}
                  status="working"
                />
                
                <LiveAgentWorkPreview
                  projectId={projectId!}
                  agentId={PHASE_AGENT.id}
                  agentName={PHASE_AGENT.name}
                />
              </div>
            </TabsContent>

            {/* Deliverables Tab */}
            <TabsContent value="deliverables">
              <div className="space-y-4">
                {deliverables.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Layers className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No deliverables yet. Start the phase to begin work.</p>
                    </CardContent>
                  </Card>
                ) : (
                  deliverables.map((deliverable) => (
                    <DeliverableCard
                      key={deliverable.id}
                      deliverable={{
                        id: deliverable.id,
                        name: deliverable.name,
                        description: deliverable.description,
                        deliverable_type: deliverable.deliverable_type,
                        status: deliverable.status,
                        ceo_approved: deliverable.ceo_approved,
                        user_approved: deliverable.user_approved,
                        feedback: deliverable.feedback,
                        generated_content: deliverable.generated_content,
                        screenshots: deliverable.screenshots,
                        citations: deliverable.citations,
                        assigned_agent_id: deliverable.assigned_agent_id,
                      }}
                      onViewWork={() => {
                        // Navigate to view the deliverable
                        toast.info(`Viewing ${deliverable.name}`);
                      }}
                      onRefresh={fetchDeliverables}
                    />
                  ))
                )}
              </div>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Live Activity Feed
                  </CardTitle>
                  <CardDescription>
                    Real-time updates from the Development Agent
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {activityLogs.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No activity yet. Start the phase to see agent work.</p>
                      </div>
                    ) : (
                      activityLogs.map((log, index) => (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                        >
                          <div className={`mt-0.5 p-1.5 rounded-full ${
                            log.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                            log.status === 'in_progress' ? 'bg-primary/20 text-primary' :
                            log.status === 'error' ? 'bg-destructive/20 text-destructive' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {log.status === 'completed' ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : log.status === 'in_progress' ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Activity className="w-3 h-3" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{log.action}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <span>{log.agent_name}</span>
                              <span>•</span>
                              <span>{formatTime(log.created_at)}</span>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {log.status}
                          </Badge>
                        </motion.div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Agent Chat Sheet */}
      <AgentChatSheet
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        agentId={PHASE_AGENT.id}
        agentName={PHASE_AGENT.name}
        agentRole={PHASE_AGENT.role}
        projectId={projectId}
      />
    </div>
  );
};

export default Phase3Page;
