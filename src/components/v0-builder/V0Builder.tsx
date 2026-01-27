import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeftClose, PanelLeft, Rocket, Moon, Sun, Download, Sparkles, Globe, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTheme } from 'next-themes';
import { ChatPanel } from './ChatPanel';
import { PreviewPanel } from './PreviewPanel';
import { DeploymentModal } from './DeploymentModal';
import { supabase } from "@/integrations/supabase/client";

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
  const [hasStarted, setHasStarted] = useState(false);

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
    setHasStarted(true);
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

    const abortController = new AbortController();

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
            // Supabase edge functions expect BOTH apikey and Authorization.
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
      let doneReceived = false;

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            doneReceived = true;
            break;
          }

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

        if (doneReceived) {
          try {
            await reader.cancel();
          } catch {
            // ignore
          }
          break;
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
      abortController.abort();
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

  const handleQuickStart = () => {
    const prompt = `Create a complete, beautiful landing page for ${project.name}. 
Include:
- Modern hero section with compelling headline
- Features section highlighting key benefits
- Testimonials section
- Pricing section with 3 tiers
- Call-to-action section
- Professional footer

Use the approved branding and make it fully responsive with smooth animations.`;
    handleSendMessage(prompt);
  };

  const currentFile = projectFiles.find(f => f.path === selectedFile);

  // Show welcome state if no messages yet
  if (!hasStarted && messages.length === 0) {
    return (
      <div className="h-[calc(100vh-200px)] min-h-[600px] flex flex-col rounded-xl border border-border overflow-hidden bg-card">
        {/* Welcome Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground">AI Website Builder</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-8 w-8"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>

        {/* Welcome Content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Wand2 className="h-10 w-10 text-primary" />
            </div>
            
            <h2 className="text-2xl font-bold mb-3">
              Ready to Build Your Website
            </h2>
            <p className="text-muted-foreground mb-8">
              Your specifications have been approved! Now let's bring your website to life with AI-powered generation.
            </p>

            {/* Quick Start Button */}
            <Button
              size="lg"
              onClick={handleQuickStart}
              className="gap-2 mb-6"
            >
              <Sparkles className="h-5 w-5" />
              Generate Complete Website
            </Button>

            <p className="text-sm text-muted-foreground">
              Or start a conversation to customize exactly what you want
            </p>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <Card 
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => handleSendMessage(`Create a modern landing page for ${project.name} with hero, features, and contact sections`)}
              >
                <CardContent className="p-4 text-center">
                  <Globe className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium">Landing Page</p>
                </CardContent>
              </Card>
              <Card 
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => handleSendMessage(`Create a multi-page website for ${project.name} with home, about, services, and contact pages`)}
              >
                <CardContent className="p-4 text-center">
                  <Rocket className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium">Full Website</p>
                </CardContent>
              </Card>
            </div>

            {/* Specs Summary */}
            {approvedSpecs && (
              <div className="mt-8 p-4 rounded-lg bg-muted/50 border text-left">
                <p className="text-xs font-medium text-muted-foreground mb-2">Based on Your Approved Specs:</p>
                <div className="flex flex-wrap gap-2">
                  {approvedSpecs.pages?.slice(0, 4).map((page: any, idx: number) => (
                    <span key={idx} className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                      {page.name || page}
                    </span>
                  ))}
                  {approvedSpecs.pages?.length > 4 && (
                    <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                      +{approvedSpecs.pages.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Start Custom */}
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setHasStarted(true)}
            >
              Start Custom Chat
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

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
