import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  Code2,
  Eye,
  FileCode,
  Loader2,
  Monitor,
  PanelLeftClose,
  PanelLeft,
  Rocket,
  Smartphone,
  Sparkles,
  Tablet,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { CodeEditor } from './CodeEditor';
import { FileTree } from './FileTree';
import { SandboxPreview } from './SandboxPreview';
import { DeploymentModal } from './DeploymentModal';

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

const VIEWPORT_WIDTHS: Record<Viewport, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

const SUGGESTIONS = [
  'Create a modern landing page with hero, features, and footer',
  'Build a multi-page site with navigation',
  'Add a pricing section with 3 tiers',
  'Create a contact page with a form',
];

export function V0Builder({ projectId, project, branding, approvedSpecs, onDeploymentComplete }: V0BuilderProps) {
  // Core state
  const [messages, setMessages] = useState<Message[]>([]);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [filesLoaded, setFilesLoaded] = useState(false);
  const [input, setInput] = useState('');

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const filesRef = useRef<ProjectFile[]>([]);

  // Derived state
  const appFile = projectFiles.find(f => f.path === 'src/App.tsx' || f.path === 'App.tsx');
  const currentFile = projectFiles.find(f => f.path === selectedFile);

  // ── Data loading ──────────────────────────────────────────────
  const loadSavedFiles = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('website_pages')
        .select('page_name,page_code')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      if (!data) return;
      const loaded: ProjectFile[] = data.map(p => ({
        path: p.page_name,
        content: p.page_code || '',
        type: (p.page_name.endsWith('.css') ? 'css' : p.page_name.endsWith('.json') ? 'json' : 'tsx') as ProjectFile['type'],
      }));
      setProjectFiles(loaded);
      filesRef.current = loaded;
      if (loaded.length > 0) setSelectedFile(loaded[0].path);
    } finally {
      setFilesLoaded(true);
    }
  }, [projectId]);

  const saveFiles = useCallback(async (files: ProjectFile[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const rows = files.map(f => ({
      project_id: projectId,
      user_id: user.id,
      page_name: f.path,
      page_code: f.content,
      page_route: '/' + f.path.replace(/^src\//, '').replace(/\.(tsx|ts|css|json|html)$/, ''),
      status: 'generated',
      updated_at: new Date().toISOString(),
    }));
    await supabase.from('website_pages').upsert(rows, { onConflict: 'project_id,user_id,page_name', ignoreDuplicates: false });
  }, [projectId]);

  useEffect(() => { loadSavedFiles(); }, [loadSavedFiles]);
  useEffect(() => { filesRef.current = projectFiles; }, [projectFiles]);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // ── Streaming chat ────────────────────────────────────────────
  const handleSend = useCallback(async (content?: string) => {
    const text = (content || input).trim();
    if (!text || isGenerating) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text, timestamp: new Date() };
    const assistantId = crypto.randomUUID();
    setMessages(prev => [
      ...prev,
      userMsg,
      { id: assistantId, role: 'assistant', content: '', isStreaming: true, timestamp: new Date(), files: [] },
    ]);
    setInput('');
    setIsGenerating(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/v0-stream-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          projectId,
          project,
          branding,
          specs: approvedSpecs,
          existingFiles: projectFiles.map(f => ({ path: f.path, content: f.content, type: f.type })),
        }),
      });

      if (!res.ok) throw new Error('Generation failed');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let narrative = '';
      let buffer = '';
      const generated: ProjectFile[] = [];

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') {
            try { await reader.cancel(); } catch {}
            break;
          }

          try {
            const parsed = JSON.parse(raw);
            if (parsed.type === 'content') {
              narrative += parsed.content;
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: narrative } : m));
            } else if (parsed.type === 'file') {
              const file = parsed.file as ProjectFile;
              generated.push(file);
              setProjectFiles(prev => {
                const idx = prev.findIndex(f => f.path === file.path);
                const next = idx >= 0 ? prev.map((f, i) => i === idx ? file : f) : [...prev, file];
                filesRef.current = next;
                return next;
              });
              setSelectedFile(p => p || file.path);
            }
          } catch {}
        }
      }

      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, content: narrative, isStreaming: false, files: generated } : m),
      );
      if (generated.length > 0) await saveFiles(filesRef.current);
    } catch {
      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, content: 'Something went wrong. Please try again.', isStreaming: false } : m),
      );
    } finally {
      setIsGenerating(false);
    }
  }, [input, isGenerating, messages, projectId, project, branding, approvedSpecs, projectFiles, saveFiles]);

  // ── Loading state ─────────────────────────────────────────────
  if (!filesLoaded) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const hasFiles = projectFiles.length > 0;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* ── Top toolbar ────────────────────────────────────────── */}
      <div className="h-12 shrink-0 border-b border-border flex items-center justify-between px-3 bg-background">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSidebarOpen(v => !v)}
          >
            {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </Button>
          <div className="h-5 w-px bg-border" />
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{project.name}</span>
          {isGenerating && (
            <span className="ml-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Generating...
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* View mode toggle */}
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('preview')}
              className={cn(
                'h-7 px-2.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5',
                viewMode === 'preview' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={cn(
                'h-7 px-2.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5',
                viewMode === 'code' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Code2 className="h-3.5 w-3.5" />
              Code
            </button>
          </div>

          {/* Viewport switcher (preview only) */}
          {viewMode === 'preview' && (
            <>
              <div className="h-5 w-px bg-border" />
              <div className="flex items-center gap-0.5">
                {(['desktop', 'tablet', 'mobile'] as Viewport[]).map(v => (
                  <button
                    key={v}
                    onClick={() => setViewport(v)}
                    className={cn(
                      'h-7 w-7 flex items-center justify-center rounded-md transition-colors',
                      viewport === v ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {v === 'desktop' && <Monitor className="h-3.5 w-3.5" />}
                    {v === 'tablet' && <Tablet className="h-3.5 w-3.5" />}
                    {v === 'mobile' && <Smartphone className="h-3.5 w-3.5" />}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="h-5 w-px bg-border" />
          <Button
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => setShowDeployModal(true)}
            disabled={!hasFiles}
          >
            <Rocket className="h-3.5 w-3.5" />
            Deploy
          </Button>
        </div>
      </div>

      {/* ── Main content area ──────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Chat sidebar ─────────────────────────────────────── */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 380, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 border-r border-border flex flex-col bg-background overflow-hidden"
            >
              {/* Messages */}
              <ScrollArea className="flex-1" ref={scrollRef}>
                <div className="p-4 space-y-4">
                  {messages.length === 0 ? (
                    /* Welcome screen */
                    <div className="py-12 flex flex-col items-center text-center px-4">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                        <Sparkles className="h-7 w-7 text-primary" />
                      </div>
                      <h3 className="text-base font-semibold mb-1.5">What do you want to build?</h3>
                      <p className="text-sm text-muted-foreground mb-6 max-w-[280px]">
                        Describe your website and I'll generate production-ready React code instantly.
                      </p>
                      <div className="flex flex-col gap-2 w-full">
                        {SUGGESTIONS.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => handleSend(s)}
                            className="text-left px-3 py-2.5 rounded-lg border border-border bg-muted/30 hover:bg-muted text-sm text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    messages.map(msg => (
                      <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                        <div
                          className={cn(
                            'max-w-[90%] rounded-2xl px-4 py-2.5 text-sm',
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground rounded-br-md'
                              : 'bg-muted text-foreground rounded-bl-md',
                          )}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">
                            {msg.content || (msg.isStreaming ? '' : 'Thinking...')}
                          </p>
                          {msg.isStreaming && (
                            <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse rounded-full" />
                          )}
                          {/* File chips */}
                          {msg.files && msg.files.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {msg.files.map(f => (
                                <button
                                  key={f.path}
                                  onClick={() => {
                                    setSelectedFile(f.path);
                                    setViewMode('code');
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-background/60 border border-border/50 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <FileCode className="h-3 w-3" />
                                  {f.path.split('/').pop()}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}

                  {/* Loading indicator */}
                  {isGenerating && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Input area */}
              <div className="p-3 border-t border-border">
                <div className="relative bg-muted/50 rounded-xl border border-border focus-within:border-primary/50 transition-colors">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Ask v0 a question..."
                    disabled={isGenerating}
                    rows={2}
                    className="w-full bg-transparent px-4 pt-3 pb-10 text-sm resize-none outline-none placeholder:text-muted-foreground disabled:opacity-50"
                  />
                  <div className="absolute bottom-2 right-2">
                    <Button
                      size="icon"
                      className="h-7 w-7 rounded-lg"
                      disabled={!input.trim() || isGenerating}
                      onClick={() => handleSend()}
                    >
                      {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUp className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                  Enter to send · Shift+Enter for new line
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Right panel: Preview or Code ──────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {viewMode === 'preview' ? (
            /* ── Preview mode ──────────────────────────────────── */
            <div className="flex-1 flex items-center justify-center bg-muted/20 p-4 overflow-auto">
              {hasFiles ? (
                <div
                  className="bg-background rounded-lg shadow-xl border border-border overflow-hidden transition-all duration-300"
                  style={{
                    width: VIEWPORT_WIDTHS[viewport],
                    maxWidth: '100%',
                    height: viewport === 'mobile' ? '667px' : viewport === 'tablet' ? '1024px' : '100%',
                  }}
                >
                  <SandboxPreview
                    key={refreshKey}
                    code={appFile?.content || ''}
                    files={projectFiles}
                  />
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <Eye className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Start a conversation to see your website here</p>
                </div>
              )}
            </div>
          ) : (
            /* ── Code mode ─────────────────────────────────────── */
            <div className="flex-1 flex overflow-hidden">
              {/* File tree */}
              <div className="w-52 shrink-0 border-r border-border bg-muted/10 overflow-auto">
                <FileTree
                  files={projectFiles}
                  selectedFile={selectedFile}
                  onSelectFile={setSelectedFile}
                  expanded
                />
              </div>
              {/* Editor */}
              <div className="flex-1 overflow-hidden">
                <CodeEditor
                  code={currentFile?.content || '// Select a file to view its contents'}
                  language={selectedFile?.endsWith('.css') ? 'css' : 'typescript'}
                  filename={selectedFile || undefined}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Deploy modal ───────────────────────────────────────── */}
      <DeploymentModal
        open={showDeployModal}
        onOpenChange={setShowDeployModal}
        projectId={projectId}
        projectName={project.name}
        files={projectFiles}
        onSuccess={url => {
          onDeploymentComplete?.(url);
          toast.success(`Deployed: ${url}`);
        }}
      />
    </div>
  );
}
