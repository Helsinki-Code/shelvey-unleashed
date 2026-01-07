import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Loader2, 
  Code2, 
  Eye, 
  Sparkles, 
  RefreshCw,
  Copy,
  Check,
  Rocket,
  ExternalLink,
  FileCode,
  Layers,
  CheckCircle2,
  ChevronDown,
  Bot,
  User,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'text' | 'code' | 'status';
}

interface ProjectFile {
  path: string;
  content: string;
  type: 'component' | 'page' | 'config' | 'style';
}

interface V0StyleBuilderProps {
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
  };
  approvedSpecs?: any;
  onDeploymentComplete?: (url: string) => void;
}

export const V0StyleBuilder = ({
  projectId,
  project,
  branding,
  approvedSpecs,
  onDeploymentComplete,
}: V0StyleBuilderProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hi! I'm your website builder assistant. I'll create a complete React/Vite application for **${project.name}**.

Based on your approved specifications, I'll generate:
- A production-ready React SPA with React Router
- Tailwind CSS styling with your brand colors
- Framer Motion animations
- All pages defined in your specs

**Ready to start? Type "build" or describe any specific requirements.**`,
      timestamp: new Date(),
      type: 'text',
    },
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'preview' | 'code'>('preview');
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (role: 'user' | 'assistant', content: string, type: 'text' | 'code' | 'status' = 'text') => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
      type,
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage.id;
  };

  const updateMessage = (id: string, content: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, content } : m));
  };

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;

    const userMessage = input.trim();
    setInput('');
    addMessage('user', userMessage);

    // Check for build command
    const isBuildCommand = 
      userMessage.toLowerCase().includes('build') ||
      userMessage.toLowerCase().includes('generate') ||
      userMessage.toLowerCase().includes('create') ||
      userMessage.toLowerCase().includes('start');

    if (isBuildCommand) {
      await generateProject(userMessage);
    } else {
      // Just respond conversationally
      addMessage('assistant', 'Got it! To start building your website, type "build" or tell me what you\'d like me to create.');
    }
  };

  const generateProject = async (prompt: string) => {
    setIsGenerating(true);
    const statusId = addMessage('assistant', '🚀 Initializing project generation...', 'status');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      abortControllerRef.current = new AbortController();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-vite-project`,
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
            prompt,
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
      let currentStatusText = '';
      const files: ProjectFile[] = [];

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

          try {
            const event = JSON.parse(jsonStr);

            switch (event.type) {
              case 'status':
                currentStatusText = event.message;
                updateMessage(statusId, `${currentStatusText}`);
                break;

              case 'file_complete':
                files.push({
                  path: event.path,
                  content: event.content,
                  type: event.fileType || 'component',
                });
                updateMessage(statusId, `✅ Generated: ${event.path}`);
                break;

              case 'complete':
                setProjectFiles(files);
                if (files.length > 0) {
                  setSelectedFile(files[0].path);
                }
                updateMessage(statusId, `✨ Project generated successfully!

**Created ${files.length} files:**
${files.map(f => `- ${f.path}`).join('\n')}

Click **Deploy** to publish your website to Vercel.`);
                break;

              case 'error':
                throw new Error(event.message || 'Generation failed');
            }
          } catch (parseError) {
            // Ignore parse errors
          }
        }
      }

      toast.success('Project generated successfully!');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        updateMessage(statusId, '❌ Generation cancelled.');
        toast.info('Generation cancelled');
      } else {
        console.error('Generation error:', error);
        updateMessage(statusId, `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        toast.error(error instanceof Error ? error.message : 'Failed to generate project');
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleDeploy = async () => {
    if (projectFiles.length === 0) {
      toast.error('No files to deploy. Generate a project first.');
      return;
    }

    setIsDeploying(true);
    addMessage('assistant', '🚀 Deploying to Vercel...', 'status');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deploy-vite-project`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            projectId,
            projectName: project.name,
            files: projectFiles,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Deployment failed');
      }

      const liveUrl = result.productionUrl || result.deploymentUrl;
      setDeployedUrl(liveUrl);
      onDeploymentComplete?.(liveUrl);

      addMessage('assistant', `🎉 **Deployment successful!**

Your website is live at:
[${liveUrl}](${liveUrl})

Click the link above or use the "Open Site" button to view your website.`);

      toast.success('Website deployed!', {
        action: {
          label: 'Open',
          onClick: () => window.open(liveUrl, '_blank'),
        },
      });
    } catch (error) {
      console.error('Deploy error:', error);
      addMessage('assistant', `❌ Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error(error instanceof Error ? error.message : 'Deployment failed');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleCopyCode = async () => {
    if (!selectedFile) return;
    const file = projectFiles.find(f => f.path === selectedFile);
    if (!file) return;

    await navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Code copied!');
  };

  const getPreviewHtml = () => {
    // Generate a combined preview of the app
    const appFile = projectFiles.find(f => f.path.includes('App.tsx'));
    if (!appFile) return null;
    
    return appFile.content;
  };

  return (
    <div className="h-[calc(100vh-200px)] flex bg-background border rounded-xl overflow-hidden">
      {/* Left Panel - Chat */}
      <div className="w-[400px] flex flex-col border-r bg-card">
        {/* Chat Header */}
        <div className="h-14 border-b flex items-center justify-between px-4 bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <span className="font-medium text-sm">v0 Builder</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {projectFiles.length} files
          </Badge>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-3",
                  message.role === 'user' && "justify-end"
                )}
              >
                {message.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                    message.role === 'user'
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted",
                    message.type === 'status' && "bg-muted/50 border"
                  )}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
                {message.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t bg-muted/30">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type 'build' to start or describe changes..."
              className="min-h-[60px] resize-none"
              disabled={isGenerating}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isGenerating}
              size="icon"
              className="h-[60px] w-[60px]"
            >
              {isGenerating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Right Panel - Preview/Code */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-14 border-b flex items-center justify-between px-4 bg-muted/30">
          <div className="flex items-center gap-2">
            <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'preview' | 'code')}>
              <TabsList className="h-9">
                <TabsTrigger value="preview" className="px-3 text-xs">
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="code" className="px-3 text-xs">
                  <Code2 className="w-3.5 h-3.5 mr-1.5" />
                  Code
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {activeView === 'code' && projectFiles.length > 0 && (
              <Select value={selectedFile || ''} onValueChange={setSelectedFile}>
                <SelectTrigger className="w-[200px] h-9 text-xs">
                  <SelectValue placeholder="Select file" />
                </SelectTrigger>
                <SelectContent>
                  {projectFiles.map((file) => (
                    <SelectItem key={file.path} value={file.path} className="text-xs">
                      <div className="flex items-center gap-2">
                        <FileCode className="w-3.5 h-3.5" />
                        {file.path}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeView === 'code' && selectedFile && (
              <Button variant="ghost" size="sm" onClick={handleCopyCode}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            )}
            
            {deployedUrl && (
              <Button variant="outline" size="sm" onClick={() => window.open(deployedUrl, '_blank')}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Site
              </Button>
            )}

            <Button
              onClick={handleDeploy}
              disabled={projectFiles.length === 0 || isDeploying}
              size="sm"
              className="bg-primary"
            >
              {isDeploying ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Rocket className="w-4 h-4 mr-2" />
              )}
              Deploy
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-muted/10 overflow-hidden">
          {activeView === 'preview' ? (
            <div className="h-full w-full flex items-center justify-center">
              {projectFiles.length === 0 ? (
                <div className="text-center text-muted-foreground">
                  <Layers className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">No preview yet</p>
                  <p className="text-sm">Type "build" in the chat to generate your website</p>
                </div>
              ) : (
                <div className="w-full h-full p-4">
                  <div className="w-full h-full bg-background rounded-lg border shadow-sm overflow-hidden">
                    <iframe
                      srcDoc={`
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: system-ui, sans-serif; }
  </style>
</head>
<body>
  <div class="min-h-screen bg-white p-8">
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center gap-3 mb-8">
        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600"></div>
        <h1 class="text-2xl font-bold">${project.name}</h1>
      </div>
      <div class="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-12 text-white mb-8">
        <h2 class="text-4xl font-bold mb-4">Welcome to ${project.name}</h2>
        <p class="text-lg opacity-90">${project.description || project.industry}</p>
        <button class="mt-6 bg-white text-gray-900 px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition">
          Get Started
        </button>
      </div>
      <div class="grid grid-cols-3 gap-6">
        ${['Feature One', 'Feature Two', 'Feature Three'].map(f => `
          <div class="bg-gray-50 rounded-xl p-6 border">
            <div class="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-4">✓</div>
            <h3 class="font-semibold mb-2">${f}</h3>
            <p class="text-sm text-gray-600">Premium quality services tailored for your needs.</p>
          </div>
        `).join('')}
      </div>
    </div>
  </div>
</body>
</html>
                      `}
                      className="w-full h-full border-0"
                      title="Preview"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <ScrollArea className="h-full">
              {selectedFile && projectFiles.find(f => f.path === selectedFile) ? (
                <pre className="p-4 text-sm font-mono">
                  <code>{projectFiles.find(f => f.path === selectedFile)?.content}</code>
                </pre>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <p>Select a file to view its code</p>
                </div>
              )}
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
};
