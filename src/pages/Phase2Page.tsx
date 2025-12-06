import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Palette, Image, Type, Sparkles, Loader2, Bot, CheckCircle2, Eye, Download, MessageSquare, Camera, Wand2, Layers, PaintBucket, FileImage, Crown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SimpleDashboardSidebar } from '@/components/SimpleDashboardSidebar';
import { CEOChatSheet } from '@/components/CEOChatSheet';
import { AgentChatSheet } from '@/components/AgentChatSheet';
import { BrandLogoGenerator } from '@/components/BrandLogoGenerator';
import { BrandAssetsPanel } from '@/components/BrandAssetsPanel';
import { PageHeader } from '@/components/PageHeader';
import { ProceedToNextPhaseButton } from '@/components/ProceedToNextPhaseButton';
import { StartPhaseButton } from '@/components/StartPhaseButton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Deliverable {
  id: string;
  name: string;
  description: string | null;
  deliverable_type: string;
  status: string | null;
  ceo_approved: boolean | null;
  user_approved: boolean | null;
  generated_content: any;
  assigned_agent_id: string | null;
}

const PHASE_2_AGENTS = [
  { id: 'head-of-brand', name: 'Head of Brand & Design', icon: Crown, color: 'text-primary', bgColor: 'bg-primary/10', role: 'Brand Division Manager', isManager: true, description: 'Oversees all branding and visual identity creation' },
  { id: 'brand-identity', name: 'Brand Identity Agent', icon: Sparkles, color: 'text-purple-500', bgColor: 'bg-purple-500/10', role: 'Brand Strategist', description: 'Creates brand strategy, positioning, and messaging' },
  { id: 'logo-designer', name: 'Logo Design Agent', icon: Image, color: 'text-pink-500', bgColor: 'bg-pink-500/10', role: 'Logo Designer', description: 'Generates AI-powered logos using Fal.ai and Canva' },
  { id: 'color-specialist', name: 'Color Theory Agent', icon: PaintBucket, color: 'text-orange-500', bgColor: 'bg-orange-500/10', role: 'Color Specialist', description: 'Creates harmonious color palettes and schemes' },
  { id: 'typography-agent', name: 'Typography Agent', icon: Type, color: 'text-blue-500', bgColor: 'bg-blue-500/10', role: 'Typography Expert', description: 'Selects fonts and creates type systems' },
  { id: 'visual-guidelines', name: 'Visual Guidelines Agent', icon: Layers, color: 'text-green-500', bgColor: 'bg-green-500/10', role: 'Guidelines Creator', description: 'Compiles comprehensive brand guidelines' },
];

const Phase2Page = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [phase, setPhase] = useState<any>(null);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('logo');
  const [chatAgent, setChatAgent] = useState<typeof PHASE_2_AGENTS[0] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Brand assets state
  const [generatedLogos, setGeneratedLogos] = useState<string[]>([]);
  const [colorPalette, setColorPalette] = useState<string[]>([]);
  const [selectedFonts, setSelectedFonts] = useState<{ heading: string; body: string }>({ heading: '', body: '' });
  const [selectedLogo, setSelectedLogo] = useState<any>(null);
  const [brandColors, setBrandColors] = useState<{ primary?: string; secondary?: string; accent?: string }>({
    primary: '#10B981',
    secondary: '#059669',
    accent: '#34D399'
  });
  const [typography, setTypography] = useState<{ heading?: string; body?: string }>({
    heading: 'Inter',
    body: 'Inter'
  });

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
      .eq('phase_number', 2)
      .single();

    if (phaseData) setPhase(phaseData);

    if (phaseData) {
      const { data: deliverablesData } = await supabase
        .from('phase_deliverables')
        .select('*')
        .eq('phase_id', phaseData.id)
        .order('created_at');

      if (deliverablesData) setDeliverables(deliverablesData);
    }

    setIsLoading(false);
  };

  const calculateProgress = () => {
    if (deliverables.length === 0) return 0;
    const approved = deliverables.filter(d => d.ceo_approved && d.user_approved).length;
    return Math.round((approved / deliverables.length) * 100);
  };

  const isPhaseFullyApproved = () => {
    if (deliverables.length === 0) return false;
    return deliverables.every(d => d.ceo_approved && d.user_approved);
  };

  const handleGenerateBrandAssets = async () => {
    if (!phase) return;
    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/brand-assets-generator`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate',
          userId: session.user.id,
          projectId,
          phaseId: phase.id,
        }),
      });

      const result = await response.json();
      if (result.success && result.assets) {
        const logos = result.assets.filter((a: any) => a.type === 'logo');
        setGeneratedLogos(logos.map((l: any) => l.imageUrl));
        toast.success(`Generated ${result.assets.length} brand assets!`);
        fetchData();
      } else if (result.error) {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Brand asset generation error:', error);
      toast.error('Failed to generate brand assets');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateColorPalette = async () => {
    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/brand-assets-generator`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate-color-palette',
          businessName: project?.name,
          industry: project?.industry,
          projectId,
        }),
      });

      const result = await response.json();
      if (result.success && result.data?.palette) {
        const palette = result.data.palette;
        setBrandColors({
          primary: palette.primary,
          secondary: palette.secondary,
          accent: palette.accent,
        });
        setColorPalette([palette.primary, palette.secondary, palette.accent]);
        toast.success('Color palette generated!');
      } else if (result.error) {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Color generation error:', error);
      toast.error('Failed to generate colors');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateTypography = async () => {
    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/brand-assets-generator`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate-typography',
          businessName: project?.name,
          industry: project?.industry,
          projectId,
        }),
      });

      const result = await response.json();
      if (result.success && result.data?.typography) {
        const typo = result.data.typography;
        setTypography({
          heading: typo.heading?.name || 'Inter',
          body: typo.body?.name || 'Inter',
        });
        setSelectedFonts({
          heading: typo.heading?.name || 'Inter',
          body: typo.body?.name || 'Inter',
        });
        toast.success('Typography generated!');
      } else if (result.error) {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Typography generation error:', error);
      toast.error('Failed to generate typography');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApproveAsset = async (assetType: string, assetData: any) => {
    try {
      // Update deliverable with approved asset
      const deliverable = deliverables.find(d => d.deliverable_type === assetType);
      if (deliverable) {
        await supabase
          .from('phase_deliverables')
          .update({
            generated_content: { ...deliverable.generated_content, approved: assetData },
            user_approved: true,
          })
          .eq('id', deliverable.id);

        toast.success(`${assetType} approved!`);
        fetchData();
      }
    } catch (error) {
      console.error('Approval error:', error);
      toast.error('Failed to approve asset');
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
        <title>Phase 2: Brand & Identity | {project?.name} | ShelVey</title>
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
                  <Palette className="w-6 h-6 text-primary" />
                  Phase 2: Brand & Identity
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

          {/* Progress Bar */}
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Brand Assets Progress</span>
                <span className="font-bold text-lg">{calculateProgress()}%</span>
              </div>
              <Progress value={calculateProgress()} className="h-3" />
            </CardContent>
          </Card>

          {/* Start Phase Button */}
          <StartPhaseButton
            projectId={projectId!}
            phaseNumber={2}
            phaseStatus={phase?.status || 'pending'}
            onStart={fetchData}
          />

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="logo" className="gap-2">
                <Image className="w-4 h-4" />
                Logo Generator
              </TabsTrigger>
              <TabsTrigger value="colors" className="gap-2">
                <PaintBucket className="w-4 h-4" />
                Color Palette
              </TabsTrigger>
              <TabsTrigger value="typography" className="gap-2">
                <Type className="w-4 h-4" />
                Typography
              </TabsTrigger>
              <TabsTrigger value="assets" className="gap-2">
                <FileImage className="w-4 h-4" />
                All Assets
              </TabsTrigger>
              <TabsTrigger value="agents" className="gap-2">
                <Bot className="w-4 h-4" />
                AI Team
              </TabsTrigger>
            </TabsList>

            {/* Logo Generator Tab */}
            <TabsContent value="logo">
              <BrandLogoGenerator
                projectId={projectId}
                businessName={project?.name || 'Your Brand'}
                brandColors={brandColors}
                onLogoGenerated={(logo) => {
                  setSelectedLogo(logo);
                  toast.success('Logo selected!');
                }}
              />
            </TabsContent>

            {/* Color Palette Tab */}
            <TabsContent value="colors">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PaintBucket className="w-5 h-5 text-primary" />
                    AI Color Palette Generator
                  </CardTitle>
                  <CardDescription>
                    Generate harmonious color schemes based on your brand personality
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Button
                    onClick={handleGenerateColorPalette}
                    disabled={isGenerating}
                    className="gap-2"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4" />
                    )}
                    Generate Color Palette
                  </Button>

                  {colorPalette.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="font-medium">Generated Palette</h3>
                      <div className="flex gap-4">
                        {colorPalette.map((color, i) => (
                          <motion.div
                            key={i}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className="text-center"
                          >
                            <div
                              className="w-20 h-20 rounded-xl shadow-lg cursor-pointer hover:scale-110 transition-transform"
                              style={{ backgroundColor: color }}
                              onClick={() => {
                                navigator.clipboard.writeText(color);
                                toast.success(`Copied ${color}`);
                              }}
                            />
                            <span className="text-xs mt-2 block font-mono">{color}</span>
                          </motion.div>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => handleApproveAsset('color-palette', colorPalette)}
                        className="gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approve This Palette
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Typography Tab */}
            <TabsContent value="typography">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Type className="w-5 h-5 text-primary" />
                    Typography Selection
                  </CardTitle>
                  <CardDescription>
                    Choose fonts that represent your brand personality
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Heading Font Options */}
                    <div className="space-y-4">
                      <h3 className="font-medium">Heading Font</h3>
                      <div className="grid gap-3">
                        {['Inter', 'Poppins', 'Playfair Display', 'Montserrat', 'Roboto Slab'].map((font) => (
                          <Card
                            key={font}
                            className={`cursor-pointer hover:border-primary transition-colors ${selectedFonts.heading === font ? 'border-primary bg-primary/5' : ''}`}
                            onClick={() => setSelectedFonts(prev => ({ ...prev, heading: font }))}
                          >
                            <CardContent className="py-4">
                              <p style={{ fontFamily: font }} className="text-2xl">
                                {font}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">The quick brown fox jumps</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Body Font Options */}
                    <div className="space-y-4">
                      <h3 className="font-medium">Body Font</h3>
                      <div className="grid gap-3">
                        {['Inter', 'Open Sans', 'Lato', 'Source Sans Pro', 'Nunito'].map((font) => (
                          <Card
                            key={font}
                            className={`cursor-pointer hover:border-primary transition-colors ${selectedFonts.body === font ? 'border-primary bg-primary/5' : ''}`}
                            onClick={() => setSelectedFonts(prev => ({ ...prev, body: font }))}
                          >
                            <CardContent className="py-4">
                              <p style={{ fontFamily: font }} className="text-base">
                                {font}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">Perfect for paragraph text and readability</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </div>

                  {selectedFonts.heading && selectedFonts.body && (
                    <Button
                      onClick={() => handleApproveAsset('typography', selectedFonts)}
                      className="gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve Font Selection
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* All Assets Tab */}
            <TabsContent value="assets">
              <BrandAssetsPanel
                branding={{
                  colorPalette: brandColors,
                  typography: typography,
                  logoDescription: selectedLogo?.description,
                  designPrinciples: ['Maintain consistent brand identity', 'Use primary colors for key elements', 'Ensure adequate contrast'],
                }}
                businessName={project?.name || 'Your Brand'}
                logo={selectedLogo}
              />
            </TabsContent>

            {/* AI Team Tab */}
            <TabsContent value="agents">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {PHASE_2_AGENTS.map((agent, index) => {
                  const Icon = agent.icon;
                  
                  return (
                    <motion.div
                      key={agent.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className={agent.isManager ? 'border-primary/50 ring-1 ring-primary/20' : ''}>
                        <CardHeader className={`pb-3 ${agent.bgColor}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-3 rounded-xl bg-background/80 ${agent.color}`}>
                                <Icon className="w-6 h-6" />
                              </div>
                              <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                  {agent.name}
                                  {agent.isManager && (
                                    <Badge variant="secondary" className="text-xs">Manager</Badge>
                                  )}
                                </CardTitle>
                                <CardDescription>{agent.role}</CardDescription>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                          <p className="text-sm text-muted-foreground">{agent.description}</p>
                          <Button
                            variant="default"
                            onClick={() => setChatAgent(agent)}
                            className="w-full gap-2"
                          >
                            <MessageSquare className="w-4 h-4" />
                            Chat with {agent.isManager ? 'Manager' : 'Agent'}
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>

          {/* Proceed to Next Phase Button */}
          <ProceedToNextPhaseButton
            projectId={projectId || ''}
            currentPhaseNumber={2}
            isPhaseApproved={isPhaseFullyApproved()}
          />
        </div>

        {/* CEO Chat */}
        <CEOChatSheet currentPage="phase2" />

        {/* Agent Chat Sheet */}
        {chatAgent && (
          <AgentChatSheet
            isOpen={!!chatAgent}
            onClose={() => setChatAgent(null)}
            agentId={chatAgent.id}
            agentName={chatAgent.name}
            agentRole={chatAgent.role}
            isManager={chatAgent.isManager}
            projectId={projectId}
          />
        )}
      </main>
    </div>
  );
};

export default Phase2Page;
