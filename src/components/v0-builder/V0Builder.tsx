import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FileCode,
  Globe,
  GripVertical,
  Loader2,
  Maximize2,
  MessageSquare,
  Minimize2,
  Monitor,
  PanelLeft,
  PanelLeftClose,
  RefreshCw,
  Rocket,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { CodeEditor } from './CodeEditor';
import { DeploymentModal } from './DeploymentModal';
import { WebPreview, WebPreviewBody, WebPreviewNavigation, WebPreviewNavigationButton, WebPreviewUrl, WebPreviewViewport } from './WebPreview';

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

export function V0Builder({ projectId, project, branding, approvedSpecs, onDeploymentComplete }: V0BuilderProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [filesLoaded, setFilesLoaded] = useState(false);
  const [input, setInput] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [chatOpen, setChatOpen] = useState(true);
  const [activePanel, setActivePanel] = useState<'chat' | 'preview'>('chat');
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(36);
  const [isSplitDragging, setIsSplitDragging] = useState(false);
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [sandboxId, setSandboxId] = useState<string | null>(null);
  const [sandboxPreviewUrl, setSandboxPreviewUrl] = useState<string | null>(null);
  const [sandboxStatus, setSandboxStatus] = useState<string | null>(null);
  const [isSandboxBusy, setIsSandboxBusy] = useState(false);
  const [previewEngine, setPreviewEngine] = useState<'local' | 'vercel'>('vercel');

  const scrollRef = useRef<HTMLDivElement>(null);
  const splitRef = useRef<HTMLDivElement>(null);
  const filesRef = useRef<ProjectFile[]>([]);
  const syncSignatureRef = useRef('');
  const syncTimerRef = useRef<number | null>(null);

  const theme = useMemo(() => ({
    primary: branding?.primaryColor || '#16a34a',
    border: 'rgba(22,163,74,.25)',
    headingFont: branding?.headingFont || 'var(--font-cyber)',
    bodyFont: branding?.bodyFont || 'var(--font-sans)',
  }), [branding]);

  const currentFile = projectFiles.find((f) => f.path === selectedFile);
  const appFile = projectFiles.find((f) => f.path === 'src/App.tsx' || f.path === 'App.tsx');
  const showChatPane = isMobileLayout ? activePanel === 'chat' : chatOpen;
  const showPreviewPane = isMobileLayout ? activePanel === 'preview' : true;
  const previewUrl = previewEngine === 'vercel' ? sandboxPreviewUrl || '' : '';
  const hasPreview = previewEngine === 'vercel' ? Boolean(sandboxPreviewUrl) : projectFiles.length > 0;

  const filesSignature = useCallback((files: ProjectFile[]) => files.map((f) => `${f.path}:${f.content.length}`).sort().join('|'), []);

  const loadSavedFiles = useCallback(async () => {
    try {
      const { data } = await supabase.from('website_pages').select('page_name,page_code').eq('project_id', projectId).order('created_at', { ascending: true });
      if (!data) return;
      const loaded = data.map((p) => ({
        path: p.page_name,
        content: p.page_code || '',
        type: (p.page_name.endsWith('.css') ? 'css' : p.page_name.endsWith('.json') ? 'json' : 'tsx') as ProjectFile['type'],
      }));
      setProjectFiles(loaded);
      filesRef.current = loaded;
      setSelectedFile(loaded[0]?.path || null);
    } finally {
      setFilesLoaded(true);
    }
  }, [projectId]);

  const saveFiles = useCallback(async (files: ProjectFile[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const rows = files.map((f) => ({
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

  const persistSandboxSession = useCallback(async (next: { sandboxId?: string | null; previewUrl?: string | null; status?: string | null }) => {
    const payload = { sandboxId: next.sandboxId ?? sandboxId, previewUrl: next.previewUrl ?? sandboxPreviewUrl, status: next.status ?? sandboxStatus };
    localStorage.setItem(`phase3:sandbox:${projectId}`, JSON.stringify(payload));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !payload.sandboxId) return;
    const sb = supabase as any;
    await sb.from('phase3_sandbox_sessions').upsert({
      project_id: projectId,
      user_id: user.id,
      sandbox_id: payload.sandboxId,
      preview_url: payload.previewUrl,
      status: payload.status || 'running',
      preview_engine: 'vercel',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'project_id,user_id' });
  }, [projectId, sandboxId, sandboxPreviewUrl, sandboxStatus]);

  useEffect(() => { loadSavedFiles(); }, [loadSavedFiles]);
  useEffect(() => { filesRef.current = projectFiles; }, [projectFiles]);
  useEffect(() => { const onResize = () => setIsMobileLayout(window.innerWidth < 1024); onResize(); window.addEventListener('resize', onResize); return () => window.removeEventListener('resize', onResize); }, []);
  useEffect(() => { if (!scrollRef.current) return; scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return;
      const sb = supabase as any;
      const { data } = await sb.from('phase3_sandbox_sessions').select('sandbox_id,preview_url,status').eq('project_id', projectId).eq('user_id', user.id).maybeSingle();
      if (cancelled) return;
      if (data?.sandbox_id) {
        setSandboxId(data.sandbox_id); setSandboxPreviewUrl(data.preview_url || null); setSandboxStatus(data.status || null); setPreviewEngine('vercel'); return;
      }
      const raw = localStorage.getItem(`phase3:sandbox:${projectId}`);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setSandboxId(parsed.sandboxId || null); setSandboxPreviewUrl(parsed.previewUrl || null); setSandboxStatus(parsed.status || null);
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  useEffect(() => {
    if (!sandboxId) return;
    supabase.functions.invoke('vercel-sandbox-preview', { body: { action: 'get_status', sandboxId } }).then(({ data }) => {
      if (!data?.success) return;
      setSandboxStatus(data.status || null); setSandboxPreviewUrl(data.previewUrl || null);
    }).catch(() => undefined);
  }, [sandboxId]);

  useEffect(() => {
    if (previewEngine !== 'vercel' || !sandboxId || sandboxStatus === 'stopped' || projectFiles.length === 0) return;
    const sig = filesSignature(projectFiles);
    if (sig === syncSignatureRef.current) return;
    if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    syncTimerRef.current = window.setTimeout(async () => {
      const { data } = await supabase.functions.invoke('vercel-sandbox-preview', {
        body: { action: 'update_files', sandboxId, projectId, projectName: project.name, files: projectFiles.map((f) => ({ path: f.path, content: f.content, type: f.type })) },
      });
      if (!data?.success) return;
      syncSignatureRef.current = sig;
      setSandboxStatus(data.status || sandboxStatus);
      if (data.previewUrl) setSandboxPreviewUrl(data.previewUrl);
      await persistSandboxSession({ status: data.status, previewUrl: data.previewUrl });
    }, 1000);
    return () => { if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current); };
  }, [previewEngine, sandboxId, sandboxStatus, projectFiles, projectId, project.name, filesSignature, persistSandboxSession]);

  useEffect(() => {
    if (!isSplitDragging) return;
    const onMove = (e: MouseEvent) => {
      if (!splitRef.current) return;
      const rect = splitRef.current.getBoundingClientRect();
      const next = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftPanelWidth(Math.max(24, Math.min(58, next)));
    };
    const onUp = () => setIsSplitDragging(false);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, [isSplitDragging]);

  const handleSendMessage = useCallback(async () => {
    if (!input.trim() || isGenerating) return;
    const content = input.trim();
    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content, timestamp: new Date() };
    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, userMessage, { id: assistantId, role: 'assistant', content: '', isStreaming: true, timestamp: new Date(), files: [] }]);
    setInput('');
    setIsGenerating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/v0-stream-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({ role: m.role, content: m.content })),
          projectId, project, branding, specs: approvedSpecs, existingFiles: projectFiles.map((f) => ({ path: f.path, content: f.content, type: f.type })),
        }),
      });
      if (!response.ok) throw new Error('Generation failed');
      const reader = response.body?.getReader(); const decoder = new TextDecoder();
      let narrative = ''; let buffer = ''; const generated: ProjectFile[] = [];
      while (reader) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n'); buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') continue;
          const parsed = JSON.parse(raw);
          if (parsed.type === 'content') {
            narrative += parsed.content;
            setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: narrative } : m));
          } else if (parsed.type === 'file') {
            const file = parsed.file as ProjectFile;
            generated.push(file);
            setProjectFiles((prev) => {
              const idx = prev.findIndex((f) => f.path === file.path);
              const next = idx >= 0 ? prev.map((f, i) => i === idx ? file : f) : [...prev, file];
              filesRef.current = next;
              return next;
            });
            setSelectedFile((p) => p || file.path);
          }
        }
      }
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: narrative, isStreaming: false, files: generated } : m));
      if (generated.length > 0) await saveFiles(filesRef.current);
    } catch {
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: 'Generation failed. Retry.', isStreaming: false } : m));
    } finally {
      setIsGenerating(false);
    }
  }, [input, isGenerating, messages, projectId, project, branding, approvedSpecs, projectFiles, saveFiles]);

  const launchSandbox = useCallback(async () => {
    if (filesRef.current.length === 0) return toast.error('Generate files first');
    setIsSandboxBusy(true);
    try {
      const action = sandboxId && sandboxStatus !== 'stopped' ? 'update_files' : 'provision_preview';
      const { data } = await supabase.functions.invoke('vercel-sandbox-preview', { body: { action, sandboxId, projectId, projectName: project.name, files: filesRef.current } });
      if (!data?.success) throw new Error(data?.error || 'Sandbox failed');
      const nextId = data.sandboxId || sandboxId; const nextUrl = data.previewUrl || sandboxPreviewUrl; const nextStatus = data.status || 'running';
      setSandboxId(nextId); setSandboxPreviewUrl(nextUrl); setSandboxStatus(nextStatus); setPreviewEngine('vercel');
      syncSignatureRef.current = filesSignature(filesRef.current);
      await persistSandboxSession({ sandboxId: nextId, previewUrl: nextUrl, status: nextStatus });
      toast.success('Sandbox ready');
    } catch (e: any) {
      toast.error(e?.message || 'Sandbox failed');
    } finally { setIsSandboxBusy(false); }
  }, [sandboxId, sandboxStatus, sandboxPreviewUrl, projectId, project.name, filesSignature, persistSandboxSession]);

  if (!filesLoaded) return <div className="h-[calc(100vh-220px)] min-h-[500px] rounded-xl border flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="h-[calc(100vh-220px)] min-h-[500px] flex flex-col rounded-xl border overflow-hidden" style={{ borderColor: theme.border, fontFamily: theme.bodyFont }}>
      <div className="h-11 shrink-0 border-b flex items-center justify-between px-2 bg-background/70" style={{ borderColor: theme.border }}>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => isMobileLayout ? setActivePanel((p) => p === 'chat' ? 'preview' : 'chat') : setChatOpen((v) => !v)}>
            {isMobileLayout ? (activePanel === 'chat' ? <Monitor className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />) : (chatOpen ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeft className="h-3.5 w-3.5" />)}
          </Button>
          <Separator orientation="vertical" className="h-4" />
          <span className="text-xs font-semibold" style={{ fontFamily: theme.headingFont }}>{project.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex items-center bg-muted rounded-md p-0.5">
            <Button size="sm" variant="ghost" className={cn('h-6 px-2 text-[10px]', viewMode === 'preview' && 'bg-background shadow-sm')} onClick={() => setViewMode('preview')}>Preview</Button>
            <Button size="sm" variant="ghost" className={cn('h-6 px-2 text-[10px]', viewMode === 'code' && 'bg-background shadow-sm')} onClick={() => setViewMode('code')}>Code</Button>
          </div>
          <div className="flex items-center bg-muted rounded-md p-0.5">
            <Button size="sm" variant="ghost" className={cn('h-6 px-2 text-[10px]', previewEngine === 'local' && 'bg-background shadow-sm')} onClick={() => setPreviewEngine('local')}>Local</Button>
            <Button size="sm" variant="ghost" className={cn('h-6 px-2 text-[10px]', previewEngine === 'vercel' && 'bg-background shadow-sm')} onClick={() => setPreviewEngine('vercel')}>Vercel</Button>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={launchSandbox} disabled={isSandboxBusy || projectFiles.length === 0}>{isSandboxBusy ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Globe className="h-3 w-3 mr-1" />{sandboxId ? 'Sync' : 'Launch'}</Button>
          <Button size="sm" className="h-7 text-xs" onClick={() => setShowDeployModal(true)} disabled={projectFiles.length === 0}><Rocket className="h-3 w-3 mr-1" />Deploy</Button>
        </div>
      </div>

      {viewMode === 'preview' ? (
        <div ref={splitRef} className="relative flex-1 flex overflow-hidden">
          {showChatPane && (
            <div className="flex flex-col border-r min-h-0" style={{ borderColor: theme.border, width: isMobileLayout ? '100%' : `${leftPanelWidth}%` }}>
              <div className="h-9 border-b shrink-0 flex items-center px-3" style={{ borderColor: theme.border }}><span className="text-xs font-semibold">Chat</span>{isGenerating && <Badge variant="secondary" className="ml-2 text-[10px]">Generating</Badge>}</div>
              <ScrollArea className="flex-1 px-3" ref={scrollRef}><div className="py-3 space-y-3">{messages.map((m) => <div key={m.id} className={cn('text-xs', m.role === 'user' && 'text-right')}><div className={cn('inline-block max-w-[95%] px-3 py-2 rounded-lg', m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>{m.content || (m.isStreaming ? '...' : '')}</div></div>)}</div></ScrollArea>
              <div className="p-2 border-t shrink-0" style={{ borderColor: theme.border }}>
                <div className="relative">
                  <Textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder={isGenerating ? 'Generating...' : 'Continue the conversation...'} className="min-h-[60px] max-h-[120px] pr-10 resize-none text-xs" />
                  <Button size="icon" className="absolute bottom-1.5 right-1.5 h-7 w-7" disabled={!input.trim() || isGenerating} onClick={handleSendMessage}>{isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}</Button>
                </div>
              </div>
            </div>
          )}
          {!isMobileLayout && showChatPane && showPreviewPane && <button type="button" className="relative w-1 bg-border/70 hover:bg-border" onMouseDown={() => setIsSplitDragging(true)}><GripVertical className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /></button>}
          {showPreviewPane && (
            <div className={cn('flex-1 min-h-0', isPreviewFullscreen && !isMobileLayout && 'fixed inset-4 z-50 rounded-xl border bg-background shadow-2xl')} style={isPreviewFullscreen && !isMobileLayout ? { borderColor: theme.border } : undefined}>
              <WebPreview defaultUrl={previewUrl}>
                <WebPreviewNavigation>
                  <WebPreviewNavigationButton onClick={() => setRefreshKey((k) => k + 1)} tooltip="Refresh" disabled={!hasPreview}><RefreshCw className="h-4 w-4" /></WebPreviewNavigationButton>
                  <WebPreviewUrl readOnly value={previewUrl} />
                  <WebPreviewViewport />
                  <WebPreviewNavigationButton onClick={() => setIsPreviewFullscreen((v) => !v)} tooltip={isPreviewFullscreen ? 'Exit' : 'Fullscreen'}>{isPreviewFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</WebPreviewNavigationButton>
                </WebPreviewNavigation>
                <WebPreviewBody key={refreshKey} src={previewUrl || undefined} localPreview={previewEngine !== 'vercel'} localCode={appFile?.content || ''} localFiles={projectFiles} />
              </WebPreview>
            </div>
          )}
          {isMobileLayout && <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20"><div className="flex items-center bg-background/90 border rounded-lg p-1" style={{ borderColor: theme.border }}><button onClick={() => setActivePanel('chat')} className={cn('h-8 px-3 rounded-md text-xs font-medium', activePanel === 'chat' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>Chat</button><button onClick={() => setActivePanel('preview')} className={cn('h-8 px-3 rounded-md text-xs font-medium', activePanel === 'preview' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>Preview</button></div></div>}
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <div className="w-56 border-r bg-muted/20 overflow-auto shrink-0">
            <div className="p-2">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Files</div>
              {projectFiles.map((f) => <button key={f.path} onClick={() => setSelectedFile(f.path)} className={cn('w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] text-left', selectedFile === f.path ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}><FileCode className="h-3 w-3 shrink-0" /><span className="truncate">{f.path}</span></button>)}
            </div>
          </div>
          <div className="flex-1 overflow-hidden"><CodeEditor code={currentFile?.content || '// Select a file to view'} language={selectedFile?.endsWith('.css') ? 'css' : 'typescript'} filename={selectedFile || undefined} /></div>
        </div>
      )}

      <DeploymentModal open={showDeployModal} onOpenChange={setShowDeployModal} projectId={projectId} projectName={project.name} files={projectFiles} onSuccess={(url) => { onDeploymentComplete?.(url); toast.success(`Deployed: ${url}`); }} />
    </div>
  );
}
