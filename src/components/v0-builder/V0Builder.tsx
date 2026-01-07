import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeftClose, PanelLeft, Rocket, Moon, Sun, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { ChatPanel } from './ChatPanel';
import { PreviewPanel } from './PreviewPanel';
import { DeploymentModal } from './DeploymentModal';
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

export function V0Builder({
  projectId,
  project,
  branding,
  approvedSpecs,
  onDeploymentComplete,
}: V0BuilderProps) {
  const { theme, setTheme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);

  const handleSendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsGenerating(true);

    // Create assistant message placeholder for streaming
    const assistantId = crypto.randomUUID();
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/v0-stream-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
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
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Stream failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let generatedFiles: ProjectFile[] = [];

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === 'content') {
                fullContent += parsed.content;
                setMessages(prev => prev.map(m => 
                  m.id === assistantId 
                    ? { ...m, content: fullContent }
                    : m
                ));
              } else if (parsed.type === 'file') {
                generatedFiles.push(parsed.file);
                setProjectFiles(prev => {
                  const existing = prev.findIndex(f => f.path === parsed.file.path);
                  if (existing >= 0) {
                    const updated = [...prev];
                    updated[existing] = parsed.file;
                    return updated;
                  }
                  return [...prev, parsed.file];
                });
              }
            } catch {
              // Partial JSON, continue
            }
          }
        }
      }

      // Finalize message
      setMessages(prev => prev.map(m => 
        m.id === assistantId 
          ? { ...m, content: fullContent, isStreaming: false, files: generatedFiles }
          : m
      ));

    } catch (error) {
      console.error('Stream error:', error);
      setMessages(prev => prev.map(m => 
        m.id === assistantId 
          ? { ...m, content: 'Sorry, an error occurred while generating. Please try again.', isStreaming: false }
          : m
      ));
    } finally {
      setIsGenerating(false);
    }
  }, [messages, projectId, project, branding, approvedSpecs]);

  const handleDeploymentSuccess = (url: string) => {
    setDeployedUrl(url);
    setShowDeployModal(false);
    onDeploymentComplete?.(url);
  };

  const currentFile = projectFiles.find(f => f.path === selectedFile);

  return (
    <div className="h-[calc(100vh-200px)] min-h-[600px] flex flex-col rounded-xl border border-border overflow-hidden bg-card">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setChatCollapsed(!chatCollapsed)}
            className="h-8 w-8"
          >
            {chatCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
          <div className="h-4 w-px bg-border" />
          <span className="text-sm font-medium text-foreground">{project.name}</span>
          {deployedUrl && (
            <a 
              href={deployedUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              {deployedUrl}
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-8 w-8"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={projectFiles.length === 0}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={() => setShowDeployModal(true)}
            disabled={projectFiles.length === 0}
            className="gap-2"
          >
            <Rocket className="h-4 w-4" />
            Deploy
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Panel */}
        <AnimatePresence mode="wait">
          {!chatCollapsed && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 400, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-r border-border overflow-hidden"
            >
              <ChatPanel
                messages={messages}
                isGenerating={isGenerating}
                onSendMessage={handleSendMessage}
                project={project}
                specs={approvedSpecs}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Preview Panel */}
        <div className="flex-1 overflow-hidden">
          <PreviewPanel
            files={projectFiles}
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
            currentFileContent={currentFile?.content}
          />
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
