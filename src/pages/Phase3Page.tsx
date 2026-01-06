import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Code, Globe, Server, Loader2, Bot, CheckCircle2, Eye, MessageSquare, Rocket, RefreshCw, ExternalLink, Settings, Shield, Link2, Copy, Play, Terminal, Layers, Sparkles, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimpleDashboardSidebar } from '@/components/SimpleDashboardSidebar';
import { CEOChatSheet } from '@/components/CEOChatSheet';
import { AgentChatSheet } from '@/components/AgentChatSheet';
import { ReactCodePreview } from '@/components/ReactCodePreview';
import { HostingSetup } from '@/components/HostingSetup';
import { DomainMarketplace } from '@/components/DomainMarketplace';
import { PageHeader } from '@/components/PageHeader';
import { ProceedToNextPhaseButton } from '@/components/ProceedToNextPhaseButton';
import { StartPhaseButton } from '@/components/StartPhaseButton';
import { V0WebsiteBuilder } from '@/components/V0WebsiteBuilder';
import { WebsiteSpecsAgent } from '@/components/WebsiteSpecsAgent';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

import { getPhaseAgent } from '@/lib/phase-agents';
import { LiveAgentWorkPreview } from '@/components/LiveAgentWorkPreview';

const PHASE_AGENT = getPhaseAgent(3)!

const Phase3Page = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [phase, setPhase] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('specs');
  const [chatAgent, setChatAgent] = useState<{ id: string; name: string; role: string; icon: any; color: string; bgColor: string; description: string } | null>(null);
  
  // Website generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [generatedWebsite, setGeneratedWebsite] = useState<GeneratedWebsite | null>(null);
  const [generationLogs, setGenerationLogs] = useState<string[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  
  // Branding state from Phase 2
  const [branding, setBranding] = useState<any>(null);
  
  // Subdomain deployment state
  const [subdomainInput, setSubdomainInput] = useState('');
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');
  const [deploymentMessage, setDeploymentMessage] = useState('');

  // Website specs approval state
  const [specsApproved, setSpecsApproved] = useState(false);
  const [approvedSpecs, setApprovedSpecs] = useState<any>(null);

  useEffect(() => {
    if (projectId && user) {
      fetchData();
    }
  }, [projectId, user]);

  const fetchData = async () => {
    const { data: projectData } = await supabase
      .from('business_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectData) setProject(projectData);

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
        setActiveTab('v0-builder');
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
        .eq('ceo_approved', true)
        .limit(1)
        .maybeSingle();

      if (brandDeliverables?.generated_content) {
        const content = brandDeliverables.generated_content as any;
        const colorPalette = content.colorPalette || content.colors;
        setBranding({
          primaryColor: colorPalette?.primary || colorPalette?.[0]?.hex,
          secondaryColor: colorPalette?.secondary || colorPalette?.[1]?.hex,
          accentColor: colorPalette?.accent || colorPalette?.[2]?.hex,
          logo: content.assets?.find((a: any) => a.type === 'logo')?.url,
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
      setGeneratedCode(websiteData.html_content);
    }

    setIsLoading(false);
  };

  const handleSpecsApproved = (specs: any) => {
    setApprovedSpecs(specs);
    setSpecsApproved(true);
    setActiveTab('v0-builder');
    toast.success('Specifications approved! You can now generate your website.');
  };

  const isPhaseFullyApproved = () => {
    return generatedWebsite?.ceo_approved && generatedWebsite?.user_approved;
  };

  const handleGenerateWebsite = async () => {
    setIsGenerating(true);
    setGenerationLogs([]);
    
    try {
      addLog('🚀 Starting website generation...');
      addLog('📦 Loading approved branding assets...');
      
      // Fetch approved branding from Phase 2
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
          .eq('user_approved', true);

        addLog(`✅ Found ${brandDeliverables?.length || 0} approved brand assets`);
      }

      addLog('🎨 Initializing 21st.dev MCP for component generation...');
      addLog('🧩 Loading shadcn/ui component library...');
      
      const { data, error } = await supabase.functions.invoke('generate-website', {
        body: {
          projectId,
          businessName: project?.name,
          industry: project?.industry,
          description: project?.description,
        }
      });

      if (error) throw error;

      addLog('⚛️ Generating React components...');
      addLog('🎨 Applying Tailwind CSS styling...');
      addLog('✨ Adding Framer Motion animations...');

      if (data?.website) {
        setGeneratedWebsite(data.website);
        setGeneratedCode(data.website.html_content);
        addLog('✅ Website generated successfully!');
        toast.success('Website generated!');
      }
    } catch (error) {
      console.error('Generation error:', error);
      addLog('❌ Error generating website');
      toast.error('Failed to generate website');
    } finally {
      setIsGenerating(false);
    }
  };

  const addLog = (message: string) => {
    setGenerationLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const handleDeploy = async (hostingType: 'subdomain' | 'custom', customDomain?: string) => {
    if (!generatedWebsite) return;
    
    setIsDeploying(true);
    try {
      const { data, error } = await supabase.functions.invoke('deploy-website', {
        body: {
          websiteId: generatedWebsite.id,
          hostingType,
          customDomain,
        }
      });

      if (error) throw error;

      if (data?.deployedUrl) {
        setGeneratedWebsite(prev => prev ? { ...prev, deployed_url: data.deployedUrl } : null);
        toast.success('Website deployed successfully!');
      }
    } catch (error) {
      console.error('Deploy error:', error);
      toast.error('Failed to deploy website');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleRegenerateWebsite = async () => {
    setGeneratedCode('');
    setGeneratedWebsite(null);
    await handleGenerateWebsite();
  };

  const handleDeployToSubdomain = async () => {
    if (!generatedWebsite || !subdomainInput.trim()) {
      toast.error('Please enter a subdomain');
      return;
    }

    setDeploymentStatus('deploying');
    setDeploymentMessage('Creating DNS record...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      setDeploymentMessage('Uploading website to Cloudflare KV...');
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deploy-to-subdomain`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            websiteId: generatedWebsite.id,
            subdomain: subdomainInput.trim(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Deployment failed');
      }

      setDeploymentStatus('success');
      setDeploymentMessage(`Live at ${result.data.url}`);
      setGeneratedWebsite(prev => prev ? {
        ...prev,
        deployed_url: result.data.url,
        domain_name: result.data.domain,
        status: 'deployed',
      } : null);
      
      toast.success('Website deployed successfully!', {
        description: `Your site is live at ${result.data.url}`,
        action: {
          label: 'Open',
          onClick: () => window.open(result.data.url, '_blank'),
        },
      });
    } catch (error) {
      console.error('Deploy error:', error);
      setDeploymentStatus('error');
      setDeploymentMessage(error instanceof Error ? error.message : 'Deployment failed');
      toast.error('Deployment failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const generateSubdomainFromProject = () => {
    if (project?.name) {
      const subdomain = project.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 30);
      setSubdomainInput(subdomain);
    }
  };

  // Redeploy to update live website content
  const handleRedeployToSubdomain = async () => {
    if (!generatedWebsite?.deployed_url) return;

    // Extract subdomain from deployed URL
    const urlMatch = generatedWebsite.deployed_url.match(/https?:\/\/([^.]+)\.shelvey\.pro/);
    const existingSubdomain = urlMatch ? urlMatch[1] : null;

    if (!existingSubdomain) {
      toast.error('Could not determine subdomain for redeploy');
      return;
    }

    setDeploymentStatus('deploying');
    setDeploymentMessage('Updating website content...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      setDeploymentMessage('Pushing changes to Cloudflare KV...');
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deploy-to-subdomain`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            websiteId: generatedWebsite.id,
            subdomain: existingSubdomain,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Redeploy failed');
      }

      setDeploymentStatus('success');
      setDeploymentMessage('Website updated successfully!');
      
      toast.success('Website redeployed!', {
        description: 'Your changes are now live.',
        action: {
          label: 'View',
          onClick: () => window.open(generatedWebsite.deployed_url!, '_blank'),
        },
      });

      // Reset status after 3 seconds
      setTimeout(() => {
        setDeploymentStatus('idle');
        setDeploymentMessage('');
      }, 3000);
    } catch (error) {
      console.error('Redeploy error:', error);
      setDeploymentStatus('error');
      setDeploymentMessage(error instanceof Error ? error.message : 'Redeploy failed');
      toast.error('Redeploy failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
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
              <Badge className={phase?.status === 'active' ? 'bg-green-500' : phase?.status === 'completed' ? 'bg-blue-500' : 'bg-muted'}>
                {phase?.status || 'pending'}
              </Badge>
              <PageHeader showNotifications={true} showLogout={true} />
            </div>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Code className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Generation Status</p>
                    <p className="font-medium">
                      {isGenerating ? 'Generating...' : generatedWebsite ? 'Complete' : 'Not Started'}
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
              <TabsTrigger value="specs" className="gap-2">
                <FileText className="w-4 h-4" />
                Website Specs
                {specsApproved && <CheckCircle2 className="w-3 h-3 text-green-500" />}
              </TabsTrigger>
              <TabsTrigger value="v0-builder" className="gap-2" disabled={!specsApproved}>
                <Sparkles className="w-4 h-4" />
                AI Website Builder
                {!specsApproved && <Badge variant="outline" className="text-xs ml-1">Locked</Badge>}
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="w-4 h-4" />
                Live Preview
              </TabsTrigger>
              <TabsTrigger value="hosting" className="gap-2">
                <Globe className="w-4 h-4" />
                Hosting & Domain
              </TabsTrigger>
              <TabsTrigger value="agents" className="gap-2">
                <Bot className="w-4 h-4" />
                AI Team
              </TabsTrigger>
            </TabsList>

            {/* Website Specs Agent Tab */}
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

            {/* V0 Website Builder Tab */}
            <TabsContent value="v0-builder">
              {!specsApproved ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Complete the Website Specifications step first to unlock the AI Website Builder
                    </p>
                    <Button onClick={() => setActiveTab('specs')} variant="outline">
                      Go to Website Specs
                    </Button>
                  </CardContent>
                </Card>
              ) : project && (
                <V0WebsiteBuilder
                  projectId={projectId!}
                  project={{
                    name: project.name,
                    industry: project.industry || 'General',
                    description: project.description || '',
                  }}
                  branding={branding}
                  approvedSpecs={approvedSpecs}
                  existingWebsite={generatedWebsite ? {
                    id: generatedWebsite.id,
                    html_content: generatedWebsite.html_content,
                  } : null}
                  onWebsiteGenerated={(code, websiteId) => {
                    setGeneratedCode(code);
                    if (!generatedWebsite) {
                      fetchData();
                    } else {
                      setGeneratedWebsite(prev => prev ? { ...prev, html_content: code } : null);
                    }
                  }}
                />
              )}
            </TabsContent>

            {/* Live Preview Tab */}
            <TabsContent value="preview">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Eye className="w-5 h-5 text-primary" />
                      Live Website Preview
                    </span>
                    {generatedWebsite?.deployed_url && (
                      <Button variant="outline" size="sm" asChild className="gap-2">
                        <a href={generatedWebsite.deployed_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                          Open Live Site
                        </a>
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {generatedCode ? (
                    <ReactCodePreview code={generatedCode} />
                  ) : (
                    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <Code className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Generate a website to see the preview</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Hosting Tab */}
            <TabsContent value="hosting">
              {generatedWebsite ? (
                <div className="space-y-6">
                  {/* One-Click Subdomain Deployment */}
                  <Card className="border-primary/30">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Rocket className="w-5 h-5 text-primary" />
                        Quick Deploy to ShelVey Subdomain
                      </CardTitle>
                      <CardDescription>
                        Deploy your website instantly to yoursite.shelvey.pro with SSL included
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Already deployed success state with REDEPLOY option */}
                      {generatedWebsite.deployed_url && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
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
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" asChild>
                                <a href={generatedWebsite.deployed_url} target="_blank" rel="noopener noreferrer">
                                  Visit Site
                                </a>
                              </Button>
                            </div>
                          </div>
                          
                          {/* Redeploy Section */}
                          <div className="mt-4 pt-4 border-t border-green-500/20">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-foreground">Update Deployment</p>
                                <p className="text-xs text-muted-foreground">Push latest changes to your live website</p>
                              </div>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleRedeployToSubdomain}
                                disabled={deploymentStatus === 'deploying'}
                                className="gap-2"
                              >
                                {deploymentStatus === 'deploying' ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Updating...
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="w-3 h-3" />
                                    Redeploy
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Deployment form - only show if not deployed */}
                      {!generatedWebsite.deployed_url && (
                        <>
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <Label htmlFor="subdomain" className="sr-only">Subdomain</Label>
                              <div className="flex items-center">
                                <Input
                                  id="subdomain"
                                  placeholder="your-business-name"
                                  value={subdomainInput}
                                  onChange={(e) => setSubdomainInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                  className="rounded-r-none"
                                  disabled={deploymentStatus === 'deploying'}
                                />
                                <div className="px-3 py-2 bg-muted border border-l-0 border-input rounded-r-md text-sm text-muted-foreground">
                                  .shelvey.pro
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={generateSubdomainFromProject}
                              title="Auto-generate from project name"
                              disabled={deploymentStatus === 'deploying'}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          </div>

                          <Button
                            onClick={handleDeployToSubdomain}
                            disabled={!subdomainInput.trim() || deploymentStatus === 'deploying'}
                            className="w-full gap-2"
                            size="lg"
                          >
                            {deploymentStatus === 'deploying' ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Deploying...
                              </>
                            ) : (
                              <>
                                <Rocket className="w-4 h-4" />
                                Deploy to {subdomainInput || 'subdomain'}.shelvey.pro
                              </>
                            )}
                          </Button>
                        </>
                      )}

                      {/* Deployment status feedback */}
                      {deploymentStatus !== 'idle' && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-3 rounded-lg flex items-center gap-3 ${
                            deploymentStatus === 'deploying' ? 'bg-blue-500/10 border border-blue-500/30' :
                            deploymentStatus === 'success' ? 'bg-green-500/10 border border-green-500/30' :
                            'bg-destructive/10 border border-destructive/30'
                          }`}
                        >
                          {deploymentStatus === 'deploying' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                          {deploymentStatus === 'success' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                          {deploymentStatus === 'error' && <Shield className="w-4 h-4 text-destructive" />}
                          <span className={`text-sm ${
                            deploymentStatus === 'deploying' ? 'text-blue-700 dark:text-blue-300' :
                            deploymentStatus === 'success' ? 'text-green-700 dark:text-green-300' :
                            'text-destructive'
                          }`}>
                            {deploymentMessage}
                          </span>
                        </motion.div>
                      )}

                      <p className="text-xs text-muted-foreground">
                        SSL certificate is automatically provisioned via Cloudflare. Your site will be live in seconds.
                      </p>
                    </CardContent>
                  </Card>

                  {/* Buy a Domain Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="w-5 h-5 text-primary" />
                        Buy a Custom Domain
                      </CardTitle>
                      <CardDescription>
                        Purchase a domain name directly through ShelVey with $8 markup on standard domains
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <DomainMarketplace />
                    </CardContent>
                  </Card>

                  {/* Custom domain setup (existing component) */}
                  <HostingSetup
                    website={{
                      id: generatedWebsite.id || '',
                      name: generatedWebsite.name || project?.name || '',
                      deployed_url: generatedWebsite.deployed_url,
                      hosting_type: generatedWebsite.hosting_type,
                      custom_domain: generatedWebsite.custom_domain,
                      dns_records: generatedWebsite.dns_records,
                      ssl_status: generatedWebsite.ssl_status,
                      status: generatedWebsite.status || 'pending',
                    }}
                    onUpdate={fetchData}
                  />
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Globe className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Generate a website first before setting up hosting</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Single Agent Tab with Live Work Preview */}
            <TabsContent value="agents">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Agent Info Card */}
                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-primary/10 text-primary">
                          <Code className="w-6 h-6" />
                        </div>
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {PHASE_AGENT.name}
                            <Badge variant="secondary" className="text-xs">Phase 3</Badge>
                          </CardTitle>
                          <CardDescription>{PHASE_AGENT.role}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${
                          isGenerating ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'
                        }`} />
                        <span className="text-xs font-medium">
                          {isGenerating ? 'Working' : 'Standby'}
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{PHASE_AGENT.description}</p>

                    {isGenerating && (
                      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                        <p className="text-xs font-medium text-primary mb-1 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Currently Working On
                        </p>
                        <p className="text-sm">Generating website components...</p>
                      </div>
                    )}

                    {/* Capabilities */}
                    <div className="flex flex-wrap gap-1">
                      {PHASE_AGENT.capabilities.slice(0, 6).map((cap) => (
                        <Badge key={cap} variant="outline" className="text-xs">
                          {cap}
                        </Badge>
                      ))}
                    </div>

                    <Button
                      onClick={() => setChatAgent({ id: PHASE_AGENT.id, name: PHASE_AGENT.name, role: PHASE_AGENT.role, icon: Code, color: 'text-primary', bgColor: 'bg-primary/10', description: PHASE_AGENT.description })}
                      className="w-full gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Chat with {PHASE_AGENT.name}
                    </Button>
                  </CardContent>
                </Card>

                {/* Live Work Preview Window */}
                <LiveAgentWorkPreview
                  agentId={PHASE_AGENT.id}
                  agentName={PHASE_AGENT.name}
                  projectId={projectId!}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Proceed to Next Phase Button */}
          <ProceedToNextPhaseButton
            projectId={projectId || ''}
            currentPhaseNumber={3}
            isPhaseApproved={isPhaseFullyApproved() || false}
          />
        </div>

        {/* CEO Chat */}
        <CEOChatSheet currentPage="phase3" />

        {/* Agent Chat Sheet */}
        {chatAgent && (
          <AgentChatSheet
            isOpen={!!chatAgent}
            onClose={() => setChatAgent(null)}
            agentId={chatAgent.id}
            agentName={chatAgent.name}
            agentRole={chatAgent.role}
            projectId={projectId}
          />
        )}
      </main>
    </div>
  );
};

export default Phase3Page;
