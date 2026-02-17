import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  Code2,
  Eye,
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
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ChatPanel } from './ChatPanel';
import { PreviewPanel } from './PreviewPanel';
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

export function V0Builder({
  projectId,
  project,
  branding,
  approvedSpecs,
  onDeploymentComplete,
}: V0BuilderProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [filesLoaded, setFilesLoaded] = useState(false);
  const [currentGeneratingFiles, setCurrentGeneratingFiles] = useState<string[]>([]);

  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const filesRef = useRef<ProjectFile[]>([]);

  const currentFile = projectFiles.find((f) => f.path === selectedFile);

  // ── Load saved files ──────────────────────────────────────────
  const loadSavedFiles = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('website_pages')
        .select('page_name,page_code')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (!data) return;

      const loaded: ProjectFile[] = data.map((p) => ({
        path: p.page_name,
        content: p.page_code || '',
        type: (p.page_name.endsWith('.css')
          ? 'css'
          : p.page_name.endsWith('.json')
            ? 'json'
            : 'tsx') as ProjectFile['type'],
      }));

      setProjectFiles(loaded);
      filesRef.current = loaded;
      if (loaded.length > 0) setSelectedFile(loaded[0].path);
    } finally {
      setFilesLoaded(true);
    }
  }, [projectId]);

  const saveFiles = useCallback(
    async (files: ProjectFile[]) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const rows = files.map((f) => ({
        project_id: projectId,
        user_id: user.id,
        page_name: f.path,
        page_code: f.content,
        page_route:
          '/' +
          f.path
            .replace(/^src\//, '')
            .replace(/\.(tsx|ts|css|json|html)$/, ''),
        status: 'generated',
        updated_at: new Date().toISOString(),
      }));

      await supabase.from('website_pages').upsert(rows, {
        onConflict: 'project_id,user_id,page_name',
        ignoreDuplicates: false,
      });
    },
    [projectId]
  );

  useEffect(() => {
    loadSavedFiles();
  }, [loadSavedFiles]);

  useEffect(() => {
    filesRef.current = projectFiles;
  }, [projectFiles]);

  // ── Streaming chat ────────────────────────────────────────────
  const handleSend = useCallback(
    async (content: string) => {
      const text = content.trim();
      if (!text || isGenerating) return;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        timestamp: new Date(),
      };
      const assistantId = crypto.randomUUID();

      setMessages((prev) => [
        ...prev,
        userMsg,
        {
          id: assistantId,
          role: 'assistant',
          content: '',
          isStreaming: true,
          timestamp: new Date(),
          files: [],
        },
      ]);
      setIsGenerating(true);
      setCurrentGeneratingFiles([]);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/v0-stream-chat`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              messages: [...messages, userMsg].map((m) => ({
                role: m.role,
                content: m.content,
              })),
              projectId,
              project,
              branding,
              specs: approvedSpecs,
              existingFiles: projectFiles.map((f) => ({
                path: f.path,
                content: f.content,
                type: f.type,
              })),
            }),
          }
        );

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
              try {
                await reader.cancel();
              } catch {}
              break;
            }

            try {
              const parsed = JSON.parse(raw);
              if (parsed.type === 'content') {
                narrative += parsed.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: narrative } : m
                  )
                );
              } else if (parsed.type === 'file') {
                const file = parsed.file as ProjectFile;
                setCurrentGeneratingFiles((prev) => [...prev, file.path]);
                generated.push(file);
                setProjectFiles((prev) => {
                  const idx = prev.findIndex((f) => f.path === file.path);
                  const next =
                    idx >= 0
                      ? prev.map((f, i) => (i === idx ? file : f))
                      : [...prev, file];
                  filesRef.current = next;
                  return next;
                });
                setSelectedFile((p) => p || file.path);
                setRefreshKey((k) => k + 1);
              }
            } catch {}
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: narrative,
                  isStreaming: false,
                  files: generated,
                }
              : m
          )
        );
        setCurrentGeneratingFiles([]);

        if (generated.length > 0) await saveFiles(filesRef.current);
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: 'Something went wrong. Please try again.',
                  isStreaming: false,
                }
              : m
          )
        );
      } finally {
        setIsGenerating(false);
        setCurrentGeneratingFiles([]);
      }
    },
    [
      isGenerating,
      messages,
      projectId,
      project,
      branding,
      approvedSpecs,
      projectFiles,
      saveFiles,
    ]
  );

  const handleFileClick = useCallback((path: string) => {
    setSelectedFile(path);
    setViewMode('code');
  }, []);

  // ── Loading state ─────────────────────────────────────────────
  if (!filesLoaded) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading project…</p>
        </div>
      </div>
    );
  }

  const hasFiles = projectFiles.length > 0;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* ── Toolbar ──────────────────────────────────────────── */}
      <header className="h-12 shrink-0 border-b border-border flex items-center justify-between px-3 bg-background/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={sidebarOpen ? 'Close chat panel' : 'Open chat panel'}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </Button>

          <div className="h-5 w-px bg-border" />

          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-sm font-semibold truncate max-w-[200px]">
              {project.name}
            </span>
          </div>

          <AnimatePresence>
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-1.5 ml-2"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground font-medium">
                  Generating…
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-1.5">
          {/* View mode toggle */}
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            {[
              { mode: 'preview' as ViewMode, icon: Eye, label: 'Preview' },
              { mode: 'code' as ViewMode, icon: Code2, label: 'Code' },
            ].map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'h-7 px-3 rounded-md text-xs font-medium transition-all flex items-center gap-1.5',
                  viewMode === mode
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Viewport switcher */}
          <AnimatePresence>
            {viewMode === 'preview' && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex items-center gap-1 overflow-hidden"
              >
                <div className="h-5 w-px bg-border" />
                <div className="flex items-center gap-0.5">
                  {(
                    [
                      { v: 'desktop' as Viewport, icon: Monitor },
                      { v: 'tablet' as Viewport, icon: Tablet },
                      { v: 'mobile' as Viewport, icon: Smartphone },
                    ] as const
                  ).map(({ v, icon: Icon }) => (
                    <button
                      key={v}
                      onClick={() => setViewport(v)}
                      className={cn(
                        'h-7 w-7 flex items-center justify-center rounded-md transition-colors',
                        viewport === v
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )}
                      aria-label={`${v} viewport`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
      </header>

      {/* ── Main layout ──────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat sidebar */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 380, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="shrink-0 border-r border-border overflow-hidden"
            >
              <ChatPanel
                messages={messages}
                isGenerating={isGenerating}
                onSendMessage={handleSend}
                onFileClick={handleFileClick}
                currentGeneratingFiles={currentGeneratingFiles}
                project={project}
                specs={approvedSpecs}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Preview / Code panel */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <PreviewPanel
            files={projectFiles}
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
            currentFileContent={currentFile?.content}
            viewMode={viewMode}
            viewport={viewport}
            viewportWidth={VIEWPORT_WIDTHS[viewport]}
            refreshKey={refreshKey}
            onRefresh={() => setRefreshKey((k) => k + 1)}
          />
        </div>
      </div>

      {/* Deploy modal */}
      <DeploymentModal
        open={showDeployModal}
        onOpenChange={setShowDeployModal}
        projectId={projectId}
        projectName={project.name}
        files={projectFiles}
        onSuccess={(url) => {
          onDeploymentComplete?.(url);
          toast.success(`Deployed: ${url}`);
        }}
      />
    </div>
  );
}