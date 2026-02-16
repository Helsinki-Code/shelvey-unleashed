// Type definitions for V0 Builder

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

export interface V0BuilderProps {
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
  onDeploymentComplete?: (url: string) => void;
}

export type ViewMode = 'preview' | 'code';
export type Viewport = 'desktop' | 'tablet' | 'mobile';
