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
  const [generatedWebsite, setGeneratedWebsite] = useState<GeneratedWebsite | null>(null);
  const [branding, setBranding] = useState<any>(null);
  const [specsApproved, setSpecsApproved] = useState(false);
  const [approvedSpecs, setApprovedSpecs] = useState<any>(null);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (projectId && user) fetchData();
  }, [projectId, user]);

  useEffect(() => {
    if (!phase?.id) return;
    const channel = supabase
      .channel(`phase3-deliverables-${phase.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'phase_deliverables', filter: `phase_id=eq.${phase.id}` }, () => fetchDeliverables())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [phase?.id]);

  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
      .channel(`phase3-activity-${projectId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agent_activity_logs', filter: `agent_id=eq.${PHASE_AGENT.id}` }, (payload) => {
        const newLog = payload.new as any;
        setActivityLogs(prev => [{ id: newLog.id, action: newLog.action, status: newLog.status, created_at: newLog.created_at, agent_name: newLog.agent_name }, ...prev.slice(0, 19)]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: projectData } = await supabase.from('business_projects').select('*').eq('id', projectId).single();
      if (projectData) setProject(projectData);

      const { data: phaseData } = await supabase.from('business_phases').select('*').eq('project_id', projectId).eq('phase_number', 3).single();
      if (phaseData) {
        setPhase(phaseData);
        const { data: specsDeliverable } = await supabase.from('phase_deliverables').select('*').eq('phase_id', phaseData.id).eq('deliverable_type', 'website_specs').maybeSingle();
        if (specsDeliverable?.ceo_approved && specsDeliverable?.user_approved) {
          setSpecsApproved(true);
          setApprovedSpecs((specsDeliverable.generated_content as any)?.specs);
        }
        const { data: deliverablesData } = await supabase.from('phase_deliverables').select('*').eq('phase_id', phaseData.id).order('created_at', { ascending: false });
        if (deliverablesData) setDeliverables(deliverablesData as Deliverable[]);
      }

      const { data: brandingPhase } = await supabase.from('business_phases').select('id').eq('project_id', projectId).eq('phase_number', 2).single();
      if (brandingPhase) {
        const { data: brandDeliverables } = await supabase.from('phase_deliverables').select('*').eq('phase_id', brandingPhase.id).eq('deliverable_type', 'brand_assets').eq('user_approved', true).order('created_at', { ascending: false }).limit(1).maybeSingle();
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

      const { data: websiteData } = await supabase.from('generated_websites').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (websiteData) setGeneratedWebsite(websiteData);

      const { data: logsData } = await supabase.from('agent_activity_logs').select('*').eq('agent_id', PHASE_AGENT.id).order('created_at', { ascending: false }).limit(20);
      if (logsData) setActivityLogs(logsData.map((log: any) => ({ id: log.id, action: log.action, status: log.status, created_at: log.created_at, agent_name: log.agent_name })));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDeliverables = async () => {
    if (!phase?.id) return;
    const { data } = await supabase.from('phase_deliverables').select('*').eq('phase_id', phase.id).order('created_at', { ascending: false });
    if (data) setDeliverables(data as Deliverable[]);
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

  // When builder tab is active and specs are approved, render full-screen builder
  const isBuilderFullscreen = activeTab === 'builder' && specsApproved && project;

  return (
    <div className="min-h-screen bg-background flex">
      <Helmet>
        <title>Phase 3: Development &amp; Build | {project?.name} | ShelVey</title>
      </Helmet>

      <SimpleDashboardSidebar />

      <main className="flex-1 flex flex-col ml-64">
        {/* Header - always visible */}
        <div className="shrink-0 p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${projectId}`)} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <Code className="w-5 h-5 text-primary" />
                Phase 3: Development
              </h1>
              <p className="text-xs text-muted-foreground">{project?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isBuilderFullscreen && (
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="h-8">
                <TabsTrigger value="builder" className="text-xs h-7 px-2.5 gap-1">
                  <Sparkles className="w-3 h-3" />
                  Builder
                </TabsTrigger>
                <TabsTrigger value="specs" className="text-xs h-7 px-2.5 gap-1">
                  <FileText className="w-3 h-3" />
                  Specs
                  {specsApproved && <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />}
                </TabsTrigger>
                <TabsTrigger value="agent" className="text-xs h-7 px-2.5 gap-1">
                  <Bot className="w-3 h-3" />
                  Agent
                </TabsTrigger>
                <TabsTrigger value="deliverables" className="text-xs h-7 px-2.5 gap-1">
                  <Layers className="w-3 h-3" />
                  Deliverables
                </TabsTrigger>
                <TabsTrigger value="activity" className="text-xs h-7 px-2.5 gap-1">
                  <Activity className="w-3 h-3" />
                  Activity
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Badge className={phase?.status === 'active' ? 'bg-green-500' : phase?.status === 'completed' ? 'bg-blue-500' : 'bg-muted'}>
              {phase?.status || 'pending'}
            </Badge>
            <PageHeader showNotifications={true} showLogout={true} />
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden">
          {/* Builder Tab - FULLSCREEN */}
          {activeTab === 'builder' && (
            <>
              {!specsApproved ? (
                <div className="p-6">
                  <Card className="border-amber-500/30 bg-amber-500/5 max-w-xl mx-auto">
                    <CardContent className="py-12 text-center">
                      <FileText className="w-12 h-12 mx-auto text-amber-500 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Website Specifications Required</h3>
                      <p className="text-muted-foreground mb-4 max-w-md mx-auto text-sm">
                        Before building, approve the website specifications so the AI knows what to create.
                      </p>
                      <Button onClick={() => setActiveTab('specs')} className="gap-2">
                        <FileText className="w-4 h-4" />
                        Go to Specifications
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ) : project && (
                <div className="h-full flex flex-col">
                  {/* Live deployment banner */}
                  {generatedWebsite?.deployed_url && (
                    <div className="shrink-0 px-4 py-2 bg-green-500/10 border-b border-green-500/20 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium">Live:</span>
                        <a href={generatedWebsite.deployed_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                          {generatedWebsite.deployed_url}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => navigate('/domains')} className="gap-1 text-xs">
                        <Globe className="w-3 h-3" />
                        Custom Domain
                      </Button>
                    </div>
                  )}

                  {/* Builder takes remaining space */}
                  <div className="flex-1 overflow-hidden">
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
                </div>
              )}
            </>
          )}

          {/* Other tabs - scrollable content */}
          {activeTab !== 'builder' && (
            <div className="p-6 overflow-auto h-full">
              <div className="max-w-5xl mx-auto">
                <StartPhaseButton projectId={projectId!} phaseNumber={3} phaseStatus={phase?.status || 'pending'} onStart={fetchData} />

                {activeTab === 'specs' && project && phase && (
                  <WebsiteSpecsAgent
                    projectId={projectId!}
                    phaseId={phase.id}
                    project={{ name: project.name, industry: project.industry || 'General', description: project.description || '' }}
                    onSpecsApproved={handleSpecsApproved}
                  />
                )}

                {activeTab === 'agent' && (
                  <div className="grid lg:grid-cols-2 gap-6">
                    <PhaseAgentCard phaseNumber={3} onChat={() => setChatOpen(true)} status="working" />
                    <LiveAgentWorkPreview projectId={projectId!} agentId={PHASE_AGENT.id} agentName={PHASE_AGENT.name} />
                  </div>
                )}

                {activeTab === 'deliverables' && (
                  <div className="space-y-4">
                    {deliverables.length === 0 ? (
                      <Card>
                        <CardContent className="py-12 text-center">
                          <Layers className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">No deliverables yet. Start the phase to begin work.</p>
                        </CardContent>
                      </Card>
                    ) : (
                      deliverables.map(d => (
                        <DeliverableCard
                          key={d.id}
                          deliverable={d}
                          onViewWork={() => toast.info(`Viewing ${d.name}`)}
                          onRefresh={fetchDeliverables}
                        />
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'activity' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" />
                        Live Activity Feed
                      </CardTitle>
                      <CardDescription>Real-time updates from the Development Agent</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-[500px] overflow-y-auto">
                        {activityLogs.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No activity yet.</p>
                          </div>
                        ) : (
                          activityLogs.map((log, i) => (
                            <motion.div
                              key={log.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.02 }}
                              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                            >
                              <div className={`mt-0.5 p-1.5 rounded-full ${
                                log.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                                log.status === 'in_progress' ? 'bg-primary/20 text-primary' :
                                log.status === 'error' ? 'bg-destructive/20 text-destructive' :
                                'bg-muted text-muted-foreground'
                              }`}>
                                {log.status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> :
                                 log.status === 'in_progress' ? <Loader2 className="w-3 h-3 animate-spin" /> :
                                 <Activity className="w-3 h-3" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{log.action}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                  <span>{log.agent_name}</span>
                                  <span>·</span>
                                  <span>{formatTime(log.created_at)}</span>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs">{log.status}</Badge>
                            </motion.div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

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
