import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeftClose, PanelLeft, Rocket, Moon, Sun, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
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
  const [currentGeneratingFiles, setCurrentGeneratingFiles] = useState<string[]>([]);

  const handleFileReceived = useCallback((file: ProjectFile) => {
    // Remove from generating list
    setCurrentGeneratingFiles(prev => prev.filter(f => f !== file.path));
    
    // Add/update in project files
    setProjectFiles(prev => {
      const existing = prev.findIndex(f => f.path === file.path);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = file;
        return updated;
      }
      return [...prev, file];
    });
    
    // Auto-select first generated file
    setSelectedFile(prev => prev || file.path);
  }, []);

  const handleSendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsGenerating(true);
    setCurrentGeneratingFiles([]);

    // Create assistant message placeholder for streaming
    const assistantId = crypto.randomUUID();
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      timestamp: new Date(),
      files: [],
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
      let narrativeContent = '';
      const generatedFiles: ProjectFile[] = [];
      let lineBuffer = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            
            if (parsed.type === 'content') {
              // Narrative content - update chat message
              narrativeContent += parsed.content;
              setMessages(prev => prev.map(m => 
                m.id === assistantId 
                  ? { ...m, content: narrativeContent }
                  : m
              ));
            } else if (parsed.type === 'status') {
              // Status update - track generating file
              const match = parsed.label?.match(/Generating (.+?)\.\.\./);
              if (match) {
                setCurrentGeneratingFiles(prev => 
                  prev.includes(match[1]) ? prev : [...prev, match[1]]
                );
              }
            } else if (parsed.type === 'file') {
              // File received - add to project files immediately
              const file = parsed.file as ProjectFile;
              generatedFiles.push(file);
              handleFileReceived(file);
              
              // Also add to message's files array
              setMessages(prev => prev.map(m => 
                m.id === assistantId 
                  ? { ...m, files: [...(m.files || []), file] }
                  : m
              ));
            }
          } catch {
            // Partial JSON, continue
          }
        }
      }

      // Finalize message
      setMessages(prev => prev.map(m => 
        m.id === assistantId 
          ? { ...m, content: narrativeContent, isStreaming: false, files: generatedFiles }
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
      setCurrentGeneratingFiles([]);
    }
  }, [messages, projectId, project, branding, approvedSpecs, handleFileReceived]);

  const handleDeploymentSuccess = (url: string) => {
    setDeployedUrl(url);
    setShowDeployModal(false);
    onDeploymentComplete?.(url);
  };

  const handleFileClick = (path: string) => {
    setSelectedFile(path);
    setChatCollapsed(true); // Collapse chat to show preview
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
                onFileClick={handleFileClick}
                currentGeneratingFiles={currentGeneratingFiles}
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
