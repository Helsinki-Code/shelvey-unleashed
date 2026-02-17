// ── Core file & message types ───────────────────────────────────

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
  
  // ── Chat history types ──────────────────────────────────────────
  
  export interface Chat {
    id: string;
    name?: string;
    messages?: Message[];
    createdAt: string;
    updatedAt: string;
  }
  
  export interface V0Chat {
    id: string;
    object: 'chat';
    name?: string;
    messages?: Array<{
      role: 'user' | 'assistant';
      content: string;
    }>;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface ChatsResponse {
    object: 'list';
    data: V0Chat[];
  }
  
  // ── Component props ─────────────────────────────────────────────
  
  export interface V0BuilderProps {
    projectId: string;
    project: {
      name: string;
      industry: string;
      description: string;
    };
    branding?: BrandingConfig;
    approvedSpecs?: any;
    onDeploymentComplete?: (url: string) => void;
  }
  
  export interface BrandingConfig {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    logo?: string;
    headingFont?: string;
    bodyFont?: string;
  }
  
  export interface ChatPanelProps {
    messages: Message[];
    isGenerating: boolean;
    onSendMessage: (content: string) => void;
    onFileClick?: (path: string) => void;
    currentGeneratingFiles?: string[];
    project: {
      name: string;
      industry: string;
      description: string;
    };
    specs?: any;
  }
  
  export interface PreviewPanelProps {
    files: ProjectFile[];
    selectedFile: string | null;
    onSelectFile: (path: string | null) => void;
    currentFileContent?: string;
    viewMode: ViewMode;
    viewport: Viewport;
    viewportWidth: string;
    refreshKey: number;
    onRefresh: () => void;
  }
  
  export interface CodeEditorProps {
    code: string;
    language?: string;
    filename?: string;
  }
  
  export interface FileTreeProps {
    files: ProjectFile[];
    selectedFile: string | null;
    onSelectFile: (path: string | null) => void;
    expanded?: boolean;
  }
  
  export interface StreamingMessageProps {
    message: Message;
    generatingFiles?: string[];
    onFileClick?: (path: string) => void;
  }
  
  export interface SuggestionChipsProps {
    suggestions: string[];
    onSelect: (suggestion: string) => void;
  }
  
  export interface SandboxPreviewProps {
    code: string;
    files: ProjectFile[];
  }
  
  export interface DeploymentModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
    projectName: string;
    files: ProjectFile[];
    onSuccess: (url: string) => void;
  }
  
  // ── UI state enums ──────────────────────────────────────────────
  
  export type ViewMode = 'preview' | 'code';
  export type Viewport = 'desktop' | 'tablet' | 'mobile';
  export type DeploymentStatus = 'idle' | 'deploying' | 'success' | 'error';
  
  // ── Constants ───────────────────────────────────────────────────
  
  export const VIEWPORT_WIDTHS: Record<Viewport, string> = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px',
  };
  
  export const VIEWPORT_HEIGHTS: Record<Viewport, string> = {
    desktop: '100%',
    tablet: '1024px',
    mobile: '667px',
  };
  
  export const FILE_EXTENSION_ICONS: Record<string, string> = {
    tsx: '⚛️',
    ts: '📘',
    jsx: '⚛️',
    js: '📄',
    css: '🎨',
    json: '📋',
    html: '🌐',
  };
  
  export const LANGUAGE_MAP: Record<string, string> = {
    tsx: 'typescript',
    ts: 'typescript',
    jsx: 'javascript',
    js: 'javascript',
    css: 'css',
    json: 'json',
    html: 'html',
  };