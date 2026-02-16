import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PanelLeftClose, PanelLeft, Rocket, Download, Sparkles,
  Globe, Wand2, Code, Layout, Loader2, CheckCircle2,
  FileCode, Layers, Monitor, Tablet, Smartphone, RefreshCw,
  Send, MessageSquare, X, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { DeploymentModal } from './DeploymentModal';
import { SandboxPreview } from './SandboxPreview';
import { CodeEditor } from './CodeEditor';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface ProjectFile {
  path: string;
  content: string;
  type: 'tsx' | 'ts' | 'css' | 'json' | 'html';
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  files?: ProjectFile[];
  isStreaming?: boolean;
  timestamp: Date;
}

interface V0BuilderProps {
  projectId: string;
  project: { name: string; industry: string; description: string };
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    logo?: string;
    headingFont?: string;
    bodyFont?: string;
  };
  approvedSpecs?: any;
  onDeploymentComplete?: (url: string) => void;
}

type ViewMode = 'preview' | 'code';
type Viewport = 'desktop' | 'tablet' | 'mobile';

export function V0Builder({
  projectId, project, branding, approvedSpecs, onDeploymentComplete,
}: V0BuilderProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [refreshKey, setRefreshKey] = useState(0);
  const [chatOpen, setChatOpen] = useState(true);
  const [input, setInput] = useState('');
  const [filesLoaded, setFilesLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const projectFilesRef = useRef<ProjectFile[]>([]);

  // Load previously saved files from DB on mount
  useEffect(() => {
    loadSavedFiles();
  }, [projectId]);

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    projectFilesRef.current = projectFiles;
  }, [projectFiles]);

  useEffect(() => {
    if (!isGenerating) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isGenerating]);

  const loadSavedFiles = async () => {
    try {
      const { data } = await supabase
        .from('website_pages')
        .select('page_name, page_code, page_route')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (data && data.length > 0) {
        const loaded: ProjectFile[] = data.map(p => ({
          path: p.page_name,
          content: p.page_code || '',
          type: (p.page_name.endsWith('.css') ? 'css' : p.page_name.endsWith('.json') ? 'json' : 'tsx') as ProjectFile['type'],
        }));
        setProjectFiles(loaded);
        setSelectedFile(loaded[0]?.path || null);
      }
    } catch (e) {
      console.error('Failed to load saved files:', e);
    } finally {
      setFilesLoaded(true);
    }
  };

  const saveFilesToDB = useCallback(async (files: ProjectFile[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const rows = files.map((file) => ({
        project_id: projectId,
        user_id: user.id,
        page_name: file.path,
        page_code: file.content,
        page_route: '/' + file.path.replace(/^src\//, '').replace(/\.(tsx|ts|css|json|html)$/, ''),
        status: 'generated',
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('website_pages')
        .upsert(rows, {
          onConflict: 'project_id,user_id,page_name',
          ignoreDuplicates: false,
        });

      if (error) throw error;
    } catch (e) {
      console.error('Failed to save files:', e);
    }
  }, [projectId]);

  const handleFileReceived = useCallback(async (file: ProjectFile, persist = false) => {
    const prev = projectFilesRef.current;
    const existing = prev.findIndex(f => f.path === file.path);
    const next = existing >= 0
      ? prev.map((f, idx) => idx === existing ? file : f)
      : [...prev, file];

    projectFilesRef.current = next;
    setProjectFiles(next);
    setSelectedFile(prevPath => prevPath || file.path);

    if (persist) {
      await saveFilesToDB(next);
    }
  }, [saveFilesToDB]);

  const handleSendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsGenerating(true);
    setInput('');

    const assistantId = crypto.randomUUID();
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      timestamp: new Date(),
      files: [],
    }]);

    const abortController = new AbortController();
    // Large edits can exceed 3 minutes. Keep requests alive longer.
    const timeout = setTimeout(() => abortController.abort(), 600000);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/v0-stream-chat`,
        {
          method: 'POST',
          signal: abortController.signal,
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${accessToken || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map(m => ({
              role: m.role,
              content: m.content,
            })),
            projectId,
            project,
            branding,
            specs: approvedSpecs,
            existingFiles: projectFiles.map(f => ({
              path: f.path,
              content: f.content,
              type: f.type,
            })),
          }),
        }
      );

      if (!response.ok) throw new Error('Generation failed. Please try again.');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let narrativeContent = '';
      const generatedFiles: ProjectFile[] = [];
      let lineBuffer = '';
      let doneReceived = false;

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') { doneReceived = true; break; }

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content') {
              narrativeContent += parsed.content;
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: narrativeContent } : m
              ));
            } else if (parsed.type === 'file') {
              const file = parsed.file as ProjectFile;
              generatedFiles.push(file);
              await handleFileReceived(file, true);
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, files: [...(m.files || []), file] } : m
              ));
            }
          } catch { /* partial json */ }
        }

        if (doneReceived) {
          try { await reader.cancel(); } catch { /* ignore */ }
          break;
        }
      }

      // Finalize
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: narrativeContent, isStreaming: false, files: generatedFiles }
          : m
      ));

      // Save all files to DB
      if (generatedFiles.length > 0) {
        // Ensure final state is saved even if stream had transient issues.
        await saveFilesToDB(projectFilesRef.current);
        toast.success(`${generatedFiles.length} file${generatedFiles.length > 1 ? 's' : ''} generated successfully`);
      }

    } catch (error: any) {
      const errorMsg = error?.name === 'AbortError'
        ? 'Generation timed out. Try a simpler request.'
        : 'An error occurred. Please try again.';
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: errorMsg, isStreaming: false } : m
      ));
    } finally {
      clearTimeout(timeout);
      abortController.abort();
      setIsGenerating(false);
    }
  }, [messages, projectId, project, branding, approvedSpecs, handleFileReceived, projectFiles, saveFilesToDB]);

  const handleDeploymentSuccess = (url: string) => {
    setDeployedUrl(url);
    setShowDeployModal(false);
    onDeploymentComplete?.(url);
  };

  const handleSubmit = () => {
    if (!input.trim() || isGenerating) return;
    handleSendMessage(input.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const currentFile = projectFiles.find(f => f.path === selectedFile);
  const appFile = projectFiles.find(f => f.path === 'src/App.tsx' || f.path === 'App.tsx');

  const viewportWidths: Record<Viewport, string> = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px',
  };

  // Welcome state
  if (!filesLoaded) {
    return (
      <div className="h-[calc(100vh-220px)] min-h-[500px] flex items-center justify-center rounded-xl border border-border bg-card">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (messages.length === 0 && projectFiles.length === 0) {
    return (
      <div className="h-[calc(100vh-220px)] min-h-[500px] flex flex-col rounded-xl border border-border overflow-hidden bg-card">
        <div className="flex-1 flex items-center justify-center p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md text-center"
          >
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Wand2 className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-2">Build Your Website</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Describe what you want and AI will generate a complete React website for you.
            </p>

            {/* Quick prompts */}
            <div className="space-y-2 mb-6">
              {[
                { label: 'Complete Landing Page', icon: Globe, prompt: `Create a complete, beautiful landing page for ${project.name}. Include a hero section, features, testimonials, pricing with 3 tiers, CTA section, and footer. Make it fully responsive with smooth animations.` },
                { label: 'Multi-Page Website', icon: Layers, prompt: `Create a multi-page website for ${project.name} with home, about, services, and contact pages. Include a shared header and footer, smooth navigation, and beautiful modern design.` },
              ].map(({ label, icon: Icon, prompt }) => (
                <button
                  key={label}
                  onClick={() => handleSendMessage(prompt)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-muted/30 hover:bg-primary/5 hover:border-primary/30 transition-all text-left group"
                >
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">AI generates everything for you</p>
                  </div>
                </button>
              ))}
            </div>

            <Separator className="my-4" />

            {/* Custom input */}
            <div className="relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Or describe exactly what you want..."
                className="min-h-[80px] pr-12 resize-none text-sm"
              />
              <Button
                size="icon"
                onClick={handleSubmit}
                disabled={!input.trim()}
                className="absolute bottom-2 right-2 h-8 w-8"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-220px)] min-h-[500px] flex flex-col rounded-xl border border-border overflow-hidden bg-card">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/40 shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setChatOpen(!chatOpen)}
            className="h-7 w-7"
          >
            {chatOpen ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeft className="h-3.5 w-3.5" />}
          </Button>
          <Separator orientation="vertical" className="h-4" />
          <span className="text-xs font-medium text-foreground truncate max-w-[150px]">{project.name}</span>
          {deployedUrl && (
            <a href={deployedUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline truncate max-w-[150px]">
              {deployedUrl}
            </a>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {/* View toggle */}
          <div className="flex items-center bg-muted rounded-md p-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('preview')}
              className={cn("h-6 w-6 rounded", viewMode === 'preview' && "bg-background shadow-sm")}
            >
              <Monitor className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('code')}
              className={cn("h-6 w-6 rounded", viewMode === 'code' && "bg-background shadow-sm")}
            >
              <Code className="h-3 w-3" />
            </Button>
          </div>

          {viewMode === 'preview' && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center bg-muted rounded-md p-0.5">
                {(['desktop', 'tablet', 'mobile'] as Viewport[]).map(v => (
                  <Button
                    key={v}
                    variant="ghost"
                    size="icon"
                    onClick={() => setViewport(v)}
                    className={cn("h-6 w-6 rounded", viewport === v && "bg-background shadow-sm")}
                  >
                    {v === 'desktop' && <Monitor className="h-3 w-3" />}
                    {v === 'tablet' && <Tablet className="h-3 w-3" />}
                    {v === 'mobile' && <Smartphone className="h-3 w-3" />}
                  </Button>
                ))}
              </div>
              <Button variant="ghost" size="icon" onClick={() => setRefreshKey(k => k + 1)} className="h-6 w-6">
                <RefreshCw className="h-3 w-3" />
              </Button>
            </>
          )}

          <Separator orientation="vertical" className="h-4" />
          <Badge variant="secondary" className="text-[10px] h-5">
            {projectFiles.length} file{projectFiles.length !== 1 ? 's' : ''}
          </Badge>
          <Button
            size="sm"
            onClick={() => setShowDeployModal(true)}
            disabled={projectFiles.length === 0}
            className="gap-1.5 h-7 text-xs"
          >
            <Rocket className="h-3 w-3" />
            Deploy
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Sidebar */}
        <AnimatePresence mode="wait">
          {chatOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="border-r border-border flex flex-col overflow-hidden bg-background shrink-0"
            >
              {/* Chat header */}
              <div className="px-3 py-2 border-b border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold">AI Builder</span>
                </div>
                {isGenerating && (
                  <Badge variant="secondary" className="text-[10px] h-5 animate-pulse">
                    <Loader2 className="h-2.5 w-2.5 animate-spin mr-1" /> Generating
                  </Badge>
                )}
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 px-3" ref={scrollRef}>
                <div className="py-3 space-y-3">
                  {messages.map(message => (
                    <div
                      key={message.id}
                      className={cn(
                        "text-xs leading-relaxed",
                        message.role === 'user' ? "text-right" : ""
                      )}
                    >
                      <div className={cn(
                        "inline-block max-w-[95%] px-3 py-2 rounded-lg",
                        message.role === 'user'
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      )}>
                        <p className="whitespace-pre-wrap break-words">{message.content || (message.isStreaming ? '...' : '')}</p>
                      </div>

                      {/* File chips */}
                      {message.files && message.files.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {message.files.map(f => (
                            <button
                              key={f.path}
                              onClick={() => { setSelectedFile(f.path); setViewMode('code'); }}
                              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            >
                              <FileCode className="h-2.5 w-2.5" />
                              {f.path.split('/').pop()}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-2 border-t border-border shrink-0">
                <div className="relative">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isGenerating ? "Generating..." : "Ask to modify or add features..."}
                    className="min-h-[60px] max-h-[120px] pr-10 resize-none text-xs"
                    disabled={isGenerating}
                  />
                  <Button
                    size="icon"
                    onClick={handleSubmit}
                    disabled={!input.trim() || isGenerating}
                    className="absolute bottom-1.5 right-1.5 h-7 w-7"
                  >
                    {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right Panel - Preview / Code */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {viewMode === 'preview' ? (
            <div className="flex-1 flex items-start justify-center p-3 bg-muted/20 overflow-auto">
              <div
                style={{ width: viewportWidths[viewport], maxWidth: '100%' }}
                className="h-full bg-background rounded-lg shadow-lg border border-border overflow-hidden transition-all duration-200"
              >
                {projectFiles.length > 0 ? (
                  <SandboxPreview key={refreshKey} code={appFile?.content || ''} files={projectFiles} />
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Layout className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">Generate a website to see the preview</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden">
              {/* File list */}
              <div className="w-44 border-r border-border bg-muted/20 overflow-auto shrink-0">
                <div className="p-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Files</p>
                  {projectFiles.map(f => (
                    <button
                      key={f.path}
                      onClick={() => setSelectedFile(f.path)}
                      className={cn(
                        "w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] text-left transition-colors",
                        selectedFile === f.path
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <FileCode className="h-3 w-3 shrink-0" />
                      <span className="truncate">{f.path}</span>
                    </button>
                  ))}
                  {projectFiles.length === 0 && (
                    <p className="text-[10px] text-muted-foreground px-2 py-4 text-center">No files yet</p>
                  )}
                </div>
              </div>
              {/* Code editor */}
              <div className="flex-1 overflow-hidden">
                <CodeEditor
                  code={currentFile?.content || '// Select a file to view'}
                  language={selectedFile?.endsWith('.css') ? 'css' : 'typescript'}
                  filename={selectedFile || undefined}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Deployment Modal */}
      <DeploymentModal
        open={showDeployModal}
        onOpenChange={setShowDeployModal}
        projectId={projectId}
        projectName={project.name}
        files={projectFiles}
        onSuccess={handleDeploymentSuccess}
      />
    </div>
  );
}
