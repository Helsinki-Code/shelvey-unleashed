import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Code2, 
  Eye, 
  Loader2, 
  CheckCircle2, 
  Circle, 
  Play, 
  RefreshCw,
  Maximize2,
  Copy,
  Check,
  Wand2,
  Layers,
  Zap,
  Edit,
  MessageSquare,
  Send,
  FileCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ReactCodePreview } from './ReactCodePreview';
import { WebsitePageApprovalPanel } from './WebsitePageApprovalPanel';

interface V0WebsiteBuilderProps {
  projectId: string;
  project: {
    name: string;
    industry: string;
    description: string;
  };
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    logo?: string;
    headingFont?: string;
    bodyFont?: string;
  };
  approvedSpecs?: any;
  onWebsiteGenerated?: (code: string, websiteId: string) => void;
  existingWebsite?: {
    id: string;
    html_content: string;
  } | null;
}

interface ComponentProgress {
  name: string;
  status: 'pending' | 'building' | 'complete';
}

export const V0WebsiteBuilder = ({ 
  projectId, 
  project, 
  branding,
  approvedSpecs,
  onWebsiteGenerated,
  existingWebsite 
}: V0WebsiteBuilderProps) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState(existingWebsite?.html_content || '');
  const [streamingCode, setStreamingCode] = useState('');
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('');
  
  // Dynamic sections from approved specs
  const [selectedPage, setSelectedPage] = useState('/');
  const availablePages = approvedSpecs?.pages || [];
  const currentPage = availablePages.find((p: any) => p.route === selectedPage) || availablePages[0];
  const currentSections = currentPage?.sections || ['Hero', 'Features', 'About', 'Testimonials', 'Contact', 'Footer'];
  
  const [components, setComponents] = useState<ComponentProgress[]>(
    currentSections.map((name: string) => ({ name, status: 'pending' as const }))
  );
  
  const [activeView, setActiveView] = useState<'code' | 'preview'>('preview');
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Dynamic conversation state
  const [editMode, setEditMode] = useState(false);
  const [editSection, setEditSection] = useState('');
  const [editChanges, setEditChanges] = useState('');
  const [conversationHistory, setConversationHistory] = useState<{ role: string; content: string }[]>([]);

  // Update components when page changes
  useEffect(() => {
    if (currentSections.length > 0) {
      setComponents(currentSections.map((name: string) => ({ name, status: 'pending' as const })));
    }
  }, [selectedPage, JSON.stringify(currentSections)]);

  useEffect(() => {
    if (existingWebsite?.html_content) {
      setGeneratedCode(existingWebsite.html_content);
    }
  }, [existingWebsite]);

  const resetState = () => {
    setStreamingCode('');
    setProgress(0);
    setCurrentMessage('');
    setComponents(currentSections.map((name: string) => ({ name, status: 'pending' as const })));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    resetState();
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      abortControllerRef.current = new AbortController();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/v0-website-generator`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            projectId,
            businessName: project.name,
            industry: project.industry,
            description: project.description,
            branding,
            approvedSpecs,
            prompt: prompt || undefined,
            selectedPage: selectedPage || '/',
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullCode = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Process SSE lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || line.startsWith(':')) continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;

          let event: any;
          try {
            event = JSON.parse(jsonStr);
          } catch {
            continue; // ignore JSON parse errors
          }

          switch (event?.type) {
            case 'start':
            case 'connected':
              setCurrentMessage(typeof event.message === 'string' ? event.message : '');
              break;

            case 'component_start':
              setCurrentMessage(typeof event.message === 'string' ? event.message : '');
              setProgress(typeof event.progress === 'number' ? event.progress : 0);
              setComponents((prev) =>
                prev.map((c) => ({
                  ...c,
                  status:
                    c.name === event.component
                      ? 'building'
                      : prev.find(
                            (p) =>
                              p.name === event.component &&
                              prev.indexOf(p) > prev.findIndex((x) => x.name === c.name)
                          )
                        ? c.status
                        : c.status === 'building'
                          ? 'complete'
                          : c.status,
                }))
              );
              break;

            case 'code_chunk':
              if (typeof event.content === 'string') {
                fullCode += event.content;
                setStreamingCode(fullCode);
              }
              break;

            case 'complete':
              setProgress(100);
              setCurrentMessage(typeof event.message === 'string' ? event.message : 'Website generation complete');
              setGeneratedCode(typeof event.code === 'string' ? event.code : '');
              setComponents((prev) => prev.map((c) => ({ ...c, status: 'complete' })));

              // Save to database
              if (typeof event.code === 'string') {
                await saveWebsite(event.code);
              }

              toast.success('Website generated successfully!');
              break;

            case 'error':
              throw new Error(typeof event?.message === 'string' ? event.message : 'Generation failed');
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        toast.info('Generation cancelled');
      } else {
        console.error('Generation error:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to generate website');
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const saveWebsite = async (code: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let websiteId = existingWebsite?.id;

      if (existingWebsite?.id) {
        // Update existing website
        const { error } = await supabase
          .from('generated_websites')
          .update({
            html_content: code,
            updated_at: new Date().toISOString(),
            version: 1,
          })
          .eq('id', existingWebsite.id);

        if (error) throw error;
      } else {
        // Create new website
        const { data, error } = await supabase
          .from('generated_websites')
          .insert({
            project_id: projectId,
            user_id: user.id,
            name: `${project.name} Website`,
            html_content: code,
            status: 'generated',
          })
          .select()
          .single();

        if (error) throw error;
        websiteId = data.id;
      }

      // Save individual page to website_pages table for approval workflow
      const pageName = currentPage?.name || 'Home';
      const pageRoute = selectedPage || '/';

      // Check if this page already exists
      const { data: existingPage } = await supabase
        .from('website_pages')
        .select('id, version')
        .eq('project_id', projectId)
        .eq('page_route', pageRoute)
        .single();

      if (existingPage) {
        // Update existing page
        await supabase
          .from('website_pages')
          .update({
            page_code: code,
            status: 'pending_review',
            user_approved: false,
            feedback: null,
            version: (existingPage.version || 1) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingPage.id);
      } else {
        // Create new page entry
        await supabase
          .from('website_pages')
          .insert({
            website_id: websiteId,
            project_id: projectId,
            user_id: user.id,
            page_name: pageName,
            page_route: pageRoute,
            page_code: code,
            status: 'pending_review',
          });
      }

      onWebsiteGenerated?.(code, websiteId || '');
      toast.success(`${pageName} generated - please review and approve!`);
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode || streamingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Code copied to clipboard');
    } catch {
      toast.error('Failed to copy code');
    }
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
  };

  const handleEditSection = async () => {
    if (!editChanges.trim() || !generatedCode) return;
    
    setIsGenerating(true);
    resetState();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      abortControllerRef.current = new AbortController();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/v0-website-generator`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            projectId,
            businessName: project.name,
            industry: project.industry,
            description: project.description,
            branding,
            approvedSpecs,
            editMode: {
              section: editSection || 'website',
              changes: editChanges,
              existingCode: generatedCode,
            },
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Edit failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullCode = '';

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

          let event: any;
          try {
            event = JSON.parse(jsonStr);
          } catch {
            continue; // ignore JSON parse errors
          }

          switch (event?.type) {
            case 'start':
            case 'connected':
              setCurrentMessage(typeof event.message === 'string' ? event.message : '');
              break;
            case 'code_chunk':
              if (typeof event.content === 'string') {
                fullCode += event.content;
                setStreamingCode(fullCode);
              }
              break;
            case 'complete':
              setProgress(100);
              setCurrentMessage('Changes applied!');
              setGeneratedCode(typeof event.code === 'string' ? event.code : '');
              if (typeof event.code === 'string') {
                await saveWebsite(event.code);
              }
              toast.success('Website updated successfully!');
              setEditChanges('');
              setEditMode(false);
              // Add to conversation history
              setConversationHistory((prev) => [
                ...prev,
                { role: 'user', content: `Change ${editSection}: ${editChanges}` },
                { role: 'assistant', content: 'Changes applied successfully' },
              ]);
              break;
            case 'error':
              throw new Error(typeof event?.message === 'string' ? event.message : 'Edit failed');
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        toast.info('Edit cancelled');
      } else {
        console.error('Edit error:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to edit website');
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  // Dynamic section options from current page + general options
  const sectionOptions = [
    ...currentSections,
    'Colors', 'Typography', 'Layout', 'Animations'
  ].filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates

  return (
    <div className="space-y-6">
      {/* Prompt Input Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            AI Website Generator
            <Badge variant="secondary" className="ml-2">Powered by v0</Badge>
          </CardTitle>
          <CardDescription>
            Describe your website and watch it being built in real-time with React & Tailwind
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`Describe your ideal website for ${project.name}...\n\nExamples:\n• "Modern SaaS landing page with dark theme and gradient accents"\n• "Clean, minimal design with lots of whitespace"\n• "Bold, vibrant colors with animated hero section"`}
              className="min-h-[120px] pr-4 resize-none"
              disabled={isGenerating}
            />
          </div>

          <div className="flex items-center gap-3">
            {isGenerating ? (
              <Button onClick={handleCancel} variant="destructive" className="gap-2">
                Cancel
              </Button>
            ) : (
              <Button onClick={handleGenerate} className="gap-2 flex-1" size="lg">
                <Sparkles className="w-4 h-4" />
                {generatedCode ? 'Regenerate Website' : 'Generate Website'}
              </Button>
            )}
            
            {generatedCode && !isGenerating && (
              <Button variant="outline" onClick={() => { resetState(); setGeneratedCode(''); }} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Start Fresh
              </Button>
            )}
          </div>

          {/* Dynamic Page Selector */}
          {availablePages.length > 1 && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Layers className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Generate page:</span>
              <Select value={selectedPage} onValueChange={setSelectedPage}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select page..." />
                </SelectTrigger>
                <SelectContent>
                  {availablePages.map((page: any) => (
                    <SelectItem key={page.route} value={page.route}>
                      {page.name} ({page.route})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                {currentSections.length} sections
              </span>
            </div>
          )}

          {/* Generation Info */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Uses your Phase 2 branding: {approvedSpecs?.brandAssets?.primaryColorHex || branding?.primaryColor || 'Auto-detected colors'}
            </p>
            {approvedSpecs?.brandAssets?.logoUrl && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                Logo will be embedded: {approvedSpecs.brandAssets.logoUrl.substring(0, 50)}...
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generation Progress */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardContent className="py-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      </div>
                      <div>
                        <p className="font-medium">Building your website...</p>
                        <p className="text-sm text-muted-foreground">{currentMessage}</p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-primary">{progress}%</span>
                  </div>
                  
                  <Progress value={progress} className="h-2" />

                  {/* Component Progress */}
                  <div className="grid grid-cols-6 gap-2 mt-4">
                    {components.map((component, index) => (
                      <motion.div
                        key={component.name}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-3 rounded-lg border text-center transition-colors ${
                          component.status === 'complete' 
                            ? 'bg-green-500/10 border-green-500/30' 
                            : component.status === 'building'
                            ? 'bg-primary/10 border-primary/30'
                            : 'bg-muted/50 border-muted'
                        }`}
                      >
                        <div className="flex justify-center mb-1">
                          {component.status === 'complete' ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : component.status === 'building' ? (
                            <Loader2 className="w-4 h-4 text-primary animate-spin" />
                          ) : (
                            <Circle className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-xs font-medium truncate">{component.name}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Code & Preview */}
      {(streamingCode || generatedCode) && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Generated Website
              </CardTitle>
              <div className="flex items-center gap-2">
                <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'code' | 'preview')}>
                  <TabsList className="h-8">
                    <TabsTrigger value="preview" className="text-xs gap-1 h-7">
                      <Eye className="w-3 h-3" />
                      Preview
                    </TabsTrigger>
                    <TabsTrigger value="code" className="text-xs gap-1 h-7">
                      <Code2 className="w-3 h-3" />
                      Code
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button variant="ghost" size="icon" onClick={handleCopyCode} className="h-8 w-8">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {activeView === 'preview' ? (
              <div className="rounded-lg overflow-hidden border bg-background">
                <ReactCodePreview code={generatedCode || streamingCode} />
              </div>
            ) : (
              <div 
                ref={codeRef}
                className="bg-zinc-950 rounded-lg p-4 max-h-[500px] overflow-auto"
              >
                <pre className="text-sm text-zinc-300 font-mono whitespace-pre-wrap">
                  {isGenerating ? (
                    <>
                      {streamingCode}
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                        className="inline-block w-2 h-4 bg-primary ml-1"
                      />
                    </>
                  ) : (
                    generatedCode
                  )}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Page Approval Workflow Panel */}
      {availablePages.length > 0 && (
        <WebsitePageApprovalPanel
          projectId={projectId}
          websiteId={existingWebsite?.id || null}
          availablePages={availablePages.map((p: any) => ({ name: p.name, route: p.route }))}
          onAllPagesApproved={() => {
            toast.success('All pages approved! Website ready for deployment.');
          }}
          onDeployReady={(pages) => {
            console.log('Ready to deploy pages:', pages);
          }}
        />
      )}

      {/* Dynamic Conversation / Edit Mode */}
      {generatedCode && !isGenerating && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="w-5 h-5 text-primary" />
              Edit Your Website
              <Badge variant="secondary" className="text-xs">Dynamic Updates</Badge>
            </CardTitle>
            <CardDescription>
              Describe changes you want and the AI will update your website instantly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Conversation History */}
            {conversationHistory.length > 0 && (
              <ScrollArea className="h-32 rounded-lg border bg-muted/30 p-3">
                <div className="space-y-2">
                  {conversationHistory.map((msg, i) => (
                    <div key={i} className={`text-sm ${msg.role === 'user' ? 'text-foreground' : 'text-muted-foreground'}`}>
                      <span className="font-medium">{msg.role === 'user' ? 'You: ' : 'AI: '}</span>
                      {msg.content}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Section Selector */}
            <div className="flex items-center gap-3">
              <Select value={editSection} onValueChange={setEditSection}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select section..." />
                </SelectTrigger>
                <SelectContent>
                  {sectionOptions.map(section => (
                    <SelectItem key={section} value={section.toLowerCase()}>
                      {section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">or describe general changes</span>
            </div>

            {/* Edit Input */}
            <div className="flex gap-2">
              <Textarea
                value={editChanges}
                onChange={(e) => setEditChanges(e.target.value)}
                placeholder={editSection 
                  ? `Describe changes to the ${editSection} section...`
                  : "Describe the changes you want to make to your website..."}
                className="min-h-[80px] flex-1"
              />
            </div>

            <Button 
              onClick={handleEditSection} 
              disabled={!editChanges.trim() || isGenerating}
              className="w-full gap-2"
            >
              <Send className="w-4 h-4" />
              Apply Changes
            </Button>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <p className="text-xs text-muted-foreground w-full">Quick actions:</p>
              {[
                'Make the hero more bold',
                'Change colors to be darker',
                'Add more animations',
                'Make CTA buttons larger',
                'Improve mobile layout'
              ].map((action, i) => (
                <Button 
                  key={i}
                  variant="outline" 
                  size="sm" 
                  className="text-xs"
                  onClick={() => setEditChanges(action)}
                >
                  {action}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!streamingCode && !generatedCode && !isGenerating && (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Ready to Generate</h3>
              <p className="text-muted-foreground">
                {approvedSpecs 
                  ? "Your specifications are ready! Click 'Generate Website' to create your unique website."
                  : "Enter a description above and click 'Generate Website' to watch v0 build your site in real-time with React components, Tailwind CSS, and Framer Motion animations."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
