import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Sparkles,
  Layers,
  Palette,
  Type,
  Layout,
  Code2,
  MessageSquare,
  ArrowRight,
  Eye,
  Edit,
  Send,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WebsiteSpecsAgentProps {
  projectId: string;
  phaseId: string;
  project: {
    name: string;
    industry: string;
    description: string;
  };
  onSpecsApproved: (specs: WebsiteSpecs) => void;
}

interface WebsiteSpecs {
  pages: PageSpec[];
  globalStyles: GlobalStyles;
  components: ComponentSpec[];
  copyContent: CopyContent;
  animations: AnimationSpec[];
  responsive: ResponsiveSpec;
}

interface PageSpec {
  name: string;
  route: string;
  sections: string[];
  description: string;
}

interface GlobalStyles {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  headingFont: string;
  bodyFont: string;
  borderRadius: string;
  spacing: string;
}

interface ComponentSpec {
  name: string;
  type: string;
  props: Record<string, any>;
  description: string;
}

interface CopyContent {
  hero: { headline: string; subheadline: string; cta: string };
  features: { title: string; items: { title: string; description: string }[] };
  about: { title: string; content: string };
  testimonials: { title: string; items: { quote: string; author: string; role: string }[] };
  cta: { title: string; description: string; buttonText: string };
  footer: { tagline: string; copyright: string };
}

interface AnimationSpec {
  element: string;
  type: string;
  trigger: string;
}

interface ResponsiveSpec {
  mobileFirst: boolean;
  breakpoints: { name: string; width: string }[];
  mobileNav: string;
}

export const WebsiteSpecsAgent = ({
  projectId,
  phaseId,
  project,
  onSpecsApproved
}: WebsiteSpecsAgentProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [specs, setSpecs] = useState<WebsiteSpecs | null>(null);
  const [existingDeliverable, setExistingDeliverable] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Phase 1 & 2 approved data
  const [phase1Data, setPhase1Data] = useState<any>(null);
  const [phase2Data, setPhase2Data] = useState<any>(null);

  useEffect(() => {
    fetchExistingSpecs();
    fetchApprovedDeliverables();
  }, [projectId, phaseId]);

  const fetchExistingSpecs = async () => {
    const { data } = await supabase
      .from('phase_deliverables')
      .select('*')
      .eq('phase_id', phaseId)
      .eq('deliverable_type', 'website_specs')
      .maybeSingle();

    if (data) {
      setExistingDeliverable(data);
      if (data.generated_content) {
        const content = data.generated_content as any;
        setSpecs(content.specs || null);
      }
    }
  };

  const fetchApprovedDeliverables = async () => {
    // Fetch Phase 1 approved deliverables (market research, business model)
    const { data: phase1 } = await supabase
      .from('business_phases')
      .select('id')
      .eq('project_id', projectId)
      .eq('phase_number', 1)
      .single();

    if (phase1) {
      const { data: deliverables } = await supabase
        .from('phase_deliverables')
        .select('*')
        .eq('phase_id', phase1.id)
        .eq('user_approved', true)
        .eq('ceo_approved', true);

      if (deliverables?.length) {
        const research = deliverables.find(d => d.deliverable_type === 'research');
        setPhase1Data({
          marketResearch: research?.generated_content,
          targetAudience: (research?.generated_content as any)?.targetAudience,
          competitors: (research?.generated_content as any)?.competitors,
          uniqueValue: (research?.generated_content as any)?.uniqueValueProposition
        });
      }
    }

    // Fetch Phase 2 approved deliverables (brand assets)
    const { data: phase2 } = await supabase
      .from('business_phases')
      .select('id')
      .eq('project_id', projectId)
      .eq('phase_number', 2)
      .single();

    if (phase2) {
      const { data: deliverables } = await supabase
        .from('phase_deliverables')
        .select('*')
        .eq('phase_id', phase2.id)
        .eq('user_approved', true)
        .eq('ceo_approved', true);

      if (deliverables?.length) {
        const brandAssets = deliverables.find(d => d.deliverable_type === 'brand_assets');
        const content = brandAssets?.generated_content as any;
        setPhase2Data({
          logo: content?.assets?.find((a: any) => a.type === 'logo')?.url,
          colors: content?.colorPalette || content?.colors,
          typography: content?.typography,
          brandVoice: content?.brandVoice
        });
      }
    }
  };

  const generateSpecs = async () => {
    setIsGenerating(true);
    setProgress(0);
    setCurrentStep('Analyzing Phase 1 & 2 deliverables...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/website-specs-agent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            projectId,
            phaseId,
            project,
            phase1Data,
            phase2Data,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate specs');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || line.startsWith(':')) continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;

          try {
            const event = JSON.parse(jsonStr);

            switch (event.type) {
              case 'progress':
                setProgress(event.progress);
                setCurrentStep(event.message);
                break;
              case 'complete':
                setSpecs(event.specs);
                setProgress(100);
                setCurrentStep('Website specifications complete!');
                await fetchExistingSpecs();
                toast.success('Website specifications generated!');
                break;
              case 'error':
                throw new Error(event.message);
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate specs');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApproval = async (approvedBy: 'ceo' | 'user', approved: boolean) => {
    if (!existingDeliverable) return;

    try {
      const updateField = approvedBy === 'ceo' ? 'ceo_approved' : 'user_approved';
      
      const { error } = await supabase
        .from('phase_deliverables')
        .update({
          [updateField]: approved,
          feedback: approved ? null : feedbackInput || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingDeliverable.id);

      if (error) throw error;

      setExistingDeliverable((prev: any) => ({ ...prev, [updateField]: approved }));
      
      if (approved) {
        toast.success(`${approvedBy === 'ceo' ? 'CEO' : 'User'} approved the specifications!`);
        
        // Check if both approved
        const otherField = approvedBy === 'ceo' ? 'user_approved' : 'ceo_approved';
        if (existingDeliverable[otherField] && specs) {
          onSpecsApproved(specs);
        }
      } else {
        toast.info('Feedback submitted. Regenerating with changes...');
        await generateSpecs();
      }
    } catch (error) {
      console.error('Approval error:', error);
      toast.error('Failed to submit approval');
    }
  };

  const submitFeedback = async () => {
    if (!feedbackInput.trim() || !existingDeliverable) return;

    setIsSubmittingFeedback(true);
    try {
      // Update deliverable with feedback
      await supabase
        .from('phase_deliverables')
        .update({
          feedback: feedbackInput,
          feedback_history: [
            ...(existingDeliverable.feedback_history || []),
            { feedback: feedbackInput, timestamp: new Date().toISOString() }
          ],
          updated_at: new Date().toISOString()
        })
        .eq('id', existingDeliverable.id);

      setFeedbackInput('');
      toast.success('Feedback submitted!');
      
      // Regenerate with feedback
      await generateSpecs();
    } catch (error) {
      toast.error('Failed to submit feedback');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const isFullyApproved = existingDeliverable?.ceo_approved && existingDeliverable?.user_approved;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Website Copy & Specs Agent
                  <Badge variant="secondary">AI Architect</Badge>
                </CardTitle>
                <CardDescription>
                  Generates detailed website specifications from Phase 1 & 2 approved deliverables
                </CardDescription>
              </div>
            </div>
            
            {/* Status Badges */}
            <div className="flex items-center gap-2">
              {existingDeliverable?.ceo_approved && (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  CEO Approved
                </Badge>
              )}
              {existingDeliverable?.user_approved && (
                <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  User Approved
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Phase 1 & 2 Data Summary */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs font-medium text-muted-foreground mb-1">Phase 1: Research</p>
              <p className="text-sm">
                {phase1Data ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="w-3 h-3" /> Loaded
                  </span>
                ) : (
                  <span className="text-muted-foreground">Pending approval</span>
                )}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs font-medium text-muted-foreground mb-1">Phase 2: Branding</p>
              <p className="text-sm">
                {phase2Data ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="w-3 h-3" /> Loaded
                  </span>
                ) : (
                  <span className="text-muted-foreground">Pending approval</span>
                )}
              </p>
            </div>
          </div>

          {/* Generate Button */}
          {!specs && !isGenerating && (
            <Button 
              onClick={generateSpecs} 
              className="w-full gap-2" 
              size="lg"
              disabled={!phase1Data && !phase2Data}
            >
              <Sparkles className="w-4 h-4" />
              Generate Website Specifications
            </Button>
          )}

          {/* Generation Progress */}
          <AnimatePresence>
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm">{currentStep}</span>
                  </div>
                  <span className="text-sm font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Specs Display */}
      {specs && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Website Specifications
              </CardTitle>
              <Button variant="outline" size="sm" onClick={generateSpecs} disabled={isGenerating}>
                <RefreshCw className={`w-4 h-4 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-5 mb-4">
                <TabsTrigger value="overview" className="gap-1 text-xs">
                  <Layers className="w-3 h-3" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="pages" className="gap-1 text-xs">
                  <Layout className="w-3 h-3" />
                  Pages
                </TabsTrigger>
                <TabsTrigger value="copy" className="gap-1 text-xs">
                  <Type className="w-3 h-3" />
                  Copy
                </TabsTrigger>
                <TabsTrigger value="styles" className="gap-1 text-xs">
                  <Palette className="w-3 h-3" />
                  Styles
                </TabsTrigger>
                <TabsTrigger value="components" className="gap-1 text-xs">
                  <Code2 className="w-3 h-3" />
                  Components
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[400px]">
                <TabsContent value="overview" className="space-y-4 m-0">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <h4 className="font-medium mb-2">Pages</h4>
                      <p className="text-2xl font-bold text-primary">{specs.pages?.length || 0}</p>
                    </div>
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <h4 className="font-medium mb-2">Components</h4>
                      <p className="text-2xl font-bold text-primary">{specs.components?.length || 0}</p>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-medium mb-3">Page Structure</h4>
                    <div className="space-y-2">
                      {specs.pages?.map((page, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className="font-mono bg-muted px-2 py-0.5 rounded">{page.route}</span>
                          <span className="text-muted-foreground">{page.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="pages" className="space-y-4 m-0">
                  {specs.pages?.map((page, i) => (
                    <div key={i} className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{page.name}</h4>
                        <Badge variant="outline">{page.route}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{page.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {page.sections?.map((section, j) => (
                          <Badge key={j} variant="secondary" className="text-xs">{section}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="copy" className="space-y-4 m-0">
                  {specs.copyContent && (
                    <>
                      <div className="p-4 rounded-lg border">
                        <h4 className="font-medium mb-2">Hero Section</h4>
                        <p className="text-lg font-bold mb-1">{specs.copyContent.hero?.headline}</p>
                        <p className="text-muted-foreground mb-2">{specs.copyContent.hero?.subheadline}</p>
                        <Badge>{specs.copyContent.hero?.cta}</Badge>
                      </div>
                      
                      <div className="p-4 rounded-lg border">
                        <h4 className="font-medium mb-2">Features</h4>
                        <p className="text-sm font-medium mb-2">{specs.copyContent.features?.title}</p>
                        <div className="space-y-2">
                          {specs.copyContent.features?.items?.map((item, i) => (
                            <div key={i} className="text-sm">
                              <span className="font-medium">{item.title}:</span>
                              <span className="text-muted-foreground ml-1">{item.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 rounded-lg border">
                        <h4 className="font-medium mb-2">About</h4>
                        <p className="text-sm text-muted-foreground">{specs.copyContent.about?.content}</p>
                      </div>

                      <div className="p-4 rounded-lg border">
                        <h4 className="font-medium mb-2">CTA Section</h4>
                        <p className="font-medium">{specs.copyContent.cta?.title}</p>
                        <p className="text-sm text-muted-foreground mb-2">{specs.copyContent.cta?.description}</p>
                        <Badge variant="default">{specs.copyContent.cta?.buttonText}</Badge>
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="styles" className="space-y-4 m-0">
                  {specs.globalStyles && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg border">
                        <h4 className="font-medium mb-3">Color Palette</h4>
                        <div className="flex gap-3">
                          <div className="text-center">
                            <div 
                              className="w-12 h-12 rounded-lg border mb-1" 
                              style={{ backgroundColor: specs.globalStyles.primaryColor }}
                            />
                            <p className="text-xs">Primary</p>
                          </div>
                          <div className="text-center">
                            <div 
                              className="w-12 h-12 rounded-lg border mb-1" 
                              style={{ backgroundColor: specs.globalStyles.secondaryColor }}
                            />
                            <p className="text-xs">Secondary</p>
                          </div>
                          <div className="text-center">
                            <div 
                              className="w-12 h-12 rounded-lg border mb-1" 
                              style={{ backgroundColor: specs.globalStyles.accentColor }}
                            />
                            <p className="text-xs">Accent</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-lg border">
                        <h4 className="font-medium mb-3">Typography</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Heading Font</span>
                            <span className="text-sm font-medium">{specs.globalStyles.headingFont}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Body Font</span>
                            <span className="text-sm font-medium">{specs.globalStyles.bodyFont}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-lg border">
                        <h4 className="font-medium mb-3">Design Tokens</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Border Radius</span>
                            <span className="text-sm font-medium">{specs.globalStyles.borderRadius}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Spacing Scale</span>
                            <span className="text-sm font-medium">{specs.globalStyles.spacing}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="components" className="space-y-4 m-0">
                  {specs.components?.map((component, i) => (
                    <div key={i} className="p-4 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{component.type}</Badge>
                        <span className="font-medium">{component.name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{component.description}</p>
                    </div>
                  ))}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Approval Section */}
      {specs && !isFullyApproved && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="w-5 h-5" />
              Review & Approval
            </CardTitle>
            <CardDescription>
              Both CEO and User must approve before proceeding to website generation
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Feedback Input */}
            <div className="space-y-2">
              <Textarea
                placeholder="Have feedback? Describe what you'd like changed..."
                value={feedbackInput}
                onChange={(e) => setFeedbackInput(e.target.value)}
                className="min-h-[80px]"
              />
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={submitFeedback}
                disabled={!feedbackInput.trim() || isSubmittingFeedback}
              >
                {isSubmittingFeedback ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
                Submit Feedback & Regenerate
              </Button>
            </div>

            <Separator />

            {/* Approval Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border bg-muted/30">
                <p className="text-sm font-medium mb-3">CEO Approval</p>
                {existingDeliverable?.ceo_approved ? (
                  <Badge className="bg-green-500/10 text-green-600">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
                  </Badge>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleApproval('ceo', true)} className="gap-1">
                      <ThumbsUp className="w-3 h-3" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleApproval('ceo', false)} className="gap-1">
                      <ThumbsDown className="w-3 h-3" /> Revise
                    </Button>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-lg border bg-muted/30">
                <p className="text-sm font-medium mb-3">Your Approval</p>
                {existingDeliverable?.user_approved ? (
                  <Badge className="bg-green-500/10 text-green-600">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
                  </Badge>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleApproval('user', true)} className="gap-1">
                      <ThumbsUp className="w-3 h-3" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleApproval('user', false)} className="gap-1">
                      <ThumbsDown className="w-3 h-3" /> Revise
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Proceed to Website Generation */}
      {isFullyApproved && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-300">
                      Specifications Approved!
                    </p>
                    <p className="text-sm text-green-600/80 dark:text-green-400/80">
                      Ready to generate your website with these specifications
                    </p>
                  </div>
                </div>
                <Button onClick={() => specs && onSpecsApproved(specs)} className="gap-2">
                  Proceed to Website Builder
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};
