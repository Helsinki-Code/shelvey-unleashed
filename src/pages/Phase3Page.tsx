import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Send, Loader2, Sparkles, Code2, Eye, ArrowLeft,
  Copy, Check, Download, Rocket, Smartphone, Monitor, Tablet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SimpleDashboardSidebar } from '@/components/SimpleDashboardSidebar';
import { PageHeader } from '@/components/PageHeader';
import { PreviewEngine } from '@/components/builder/PreviewEngine';
import { sendBuilderRequest } from '@/services/aiService';
import { exportCode } from '@/lib/export';
import type { Message, SEOData } from '@/types/agent';
import { cn } from '@/lib/utils';

const DEFAULT_CODE = `() => {
  const [started, setStarted] = React.useState(false);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-8 text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-emerald-500/30">
        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
        </svg>
      </div>
      <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-4">ShelVey AI Builder</h1>
      <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8 leading-relaxed">
        Describe your website or application in natural language. I'll architect, design, and build it in real-time.
      </p>
      <div className="flex gap-4">
        <button onClick={() => setStarted(true)} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40">
          {started ? '✓ Ready to Build' : 'Get Started'}
        </button>
      </div>
      {started && (
        <p className="mt-6 text-sm text-emerald-600 dark:text-emerald-400 animate-pulse">
          Type your idea in the chat panel to begin building →
        </p>
      )}
    </div>
  );
}`;

const THINKING_STEPS = [
  'Understanding requirements...',
  'Planning component architecture...',
  'Generating React code & styles...',
  'Optimizing for performance...',
  'Finalizing output...',
];

type ViewportSize = 'desktop' | 'tablet' | 'mobile';

const Phase3Page = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      role: 'model',
      content: "Welcome to ShelVey AI Builder! I'm your AI architect. Tell me what you want to build — a landing page, dashboard, portfolio, SaaS app — and I'll generate it in real-time with production-ready code.",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isBuilding, setIsBuilding] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [currentCode, setCurrentCode] = useState(DEFAULT_CODE);
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'seo'>('preview');
  const [seoData, setSeoData] = useState<SEOData>({
    title: 'Untitled | ShelVey',
    description: 'AI-generated website component.',
    keywords: ['shelvey', 'ai-generated']
  });
  const [copied, setCopied] = useState(false);
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [buildCount, setBuildCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const thinkingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isBuilding) {
      setThinkingStep(0);
      thinkingIntervalRef.current = setInterval(() => {
        setThinkingStep(prev => (prev < THINKING_STEPS.length - 1 ? prev + 1 : prev));
      }, 1500);
    } else {
      if (thinkingIntervalRef.current) clearInterval(thinkingIntervalRef.current);
    }
    return () => { if (thinkingIntervalRef.current) clearInterval(thinkingIntervalRef.current); };
  }, [isBuilding]);

  const handleBuild = async () => {
    if (!input.trim() || isBuilding) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsBuilding(true);

    try {
      const history = messages.map(m => ({ role: m.role, parts: [{ text: m.content }] }));
      const result = await sendBuilderRequest(input, history, currentCode);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', content: result.message, timestamp: Date.now() }]);
      setCurrentCode(result.code);
      setSeoData(result.seo);
      setBuildCount(prev => prev + 1);
    } catch (error) {
      console.error('Build error:', error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', content: `Build failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`, timestamp: Date.now() }]);
    } finally {
      setIsBuilding(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([exportCode(currentCode, seoData)], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleBuild(); }
  };

  const viewportWidths: Record<ViewportSize, string> = {
    desktop: 'w-full',
    tablet: 'w-[768px]',
    mobile: 'w-[375px]',
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <Helmet>
        <title>Phase 3: AI Website Builder | ShelVey</title>
      </Helmet>

      <SimpleDashboardSidebar />

      <div className="flex-1 flex flex-col ml-64">
        {/* Header */}
        <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card/50 backdrop-blur-sm z-10">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(projectId ? `/projects/${projectId}` : '/projects')} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back</span>
            </Button>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-primary to-accent rounded-md flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-primary-foreground" />
              </div>
              <span className="font-bold tracking-tight text-sm">ShelVey AI Builder</span>
            </div>
            {buildCount > 0 && (
              <Badge variant="secondary" className="text-xs font-mono">
                {buildCount} build{buildCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownload} title="Download as HTML">
              <Download className="w-4 h-4" />
            </Button>
            <Button size="sm" className="gap-2" onClick={handleDownload}>
              <Rocket className="w-4 h-4" />
              <span className="text-xs font-medium">Export & Deploy</span>
            </Button>
            <PageHeader showNotifications={true} showLogout={true} />
          </div>
        </header>

        {/* Main Workspace */}
        <div className="flex-1 flex overflow-hidden">

          {/* Left Panel: Chat */}
          <div className="w-[400px] flex flex-col border-r border-border bg-card/30">
            <div className="h-12 border-b border-border flex items-center px-4 bg-card/50">
              <Sparkles className="w-4 h-4 text-primary mr-2" />
              <span className="font-medium text-sm">AI Architect</span>
              <Badge variant="outline" className="ml-auto text-xs">{messages.length} msgs</Badge>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={cn("flex flex-col", message.role === 'user' ? "items-end" : "items-start")}>
                    <div className={cn(
                      "max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      message.role === 'user'
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted/50 text-foreground rounded-tl-sm border border-border/50"
                    )}>
                      {message.content}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 px-1">
                      {message.role === 'user' ? 'You' : 'ShelVey AI'}
                    </span>
                  </div>
                ))}

                {isBuilding && (
                  <div className="flex flex-col items-start">
                    <div className="bg-muted/50 border border-border/50 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[90%]">
                      <div className="space-y-2">
                        {THINKING_STEPS.map((step, i) => (
                          <div key={i} className={cn(
                            "flex items-center gap-2 text-xs transition-all duration-300",
                            i <= thinkingStep ? "opacity-100" : "opacity-30"
                          )}>
                            {i < thinkingStep ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : i === thinkingStep ? (
                              <Loader2 className="w-3 h-3 animate-spin text-primary" />
                            ) : (
                              <div className="w-3 h-3 rounded-full border border-muted-foreground/30" />
                            )}
                            <span className={cn(
                              i < thinkingStep ? "text-muted-foreground line-through" :
                              i === thinkingStep ? "text-foreground font-medium" : "text-muted-foreground"
                            )}>{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 px-1">ShelVey AI</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-border bg-card/50">
              <div className="relative">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe what you want to build..."
                  className="min-h-[80px] max-h-[150px] resize-none pr-12"
                />
                <Button
                  onClick={handleBuild}
                  disabled={isBuilding || !input.trim()}
                  size="icon"
                  className="absolute bottom-3 right-3 h-8 w-8"
                >
                  {isBuilding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-[10px] text-muted-foreground">Enter to send · Shift+Enter for new line</p>
                <p className="text-[10px] text-muted-foreground">Powered by ShelVey AI</p>
              </div>
            </div>
          </div>

          {/* Right Panel: Preview/Code/SEO */}
          <div className="flex-1 flex flex-col bg-muted/20 relative">
            <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-card/50">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                  <button onClick={() => setActiveTab('preview')} className={cn("px-3 py-1 rounded-md text-xs font-medium transition-colors", activeTab === 'preview' ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                    <Eye className="w-3 h-3 inline mr-1.5" />Preview
                  </button>
                  <button onClick={() => setActiveTab('code')} className={cn("px-3 py-1 rounded-md text-xs font-medium transition-colors", activeTab === 'code' ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                    <Code2 className="w-3 h-3 inline mr-1.5" />Code
                  </button>
                  <button onClick={() => setActiveTab('seo')} className={cn("px-3 py-1 rounded-md text-xs font-medium transition-colors", activeTab === 'seo' ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                    <Sparkles className="w-3 h-3 inline mr-1.5" />SEO
                  </button>
                </div>

                {activeTab === 'preview' && (
                  <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                    <button onClick={() => setViewport('desktop')} className={cn("p-1.5 rounded-md transition-colors", viewport === 'desktop' ? "bg-background shadow-sm" : "text-muted-foreground")}>
                      <Monitor className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setViewport('tablet')} className={cn("p-1.5 rounded-md transition-colors", viewport === 'tablet' ? "bg-background shadow-sm" : "text-muted-foreground")}>
                      <Tablet className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setViewport('mobile')} className={cn("p-1.5 rounded-md transition-colors", viewport === 'mobile' ? "bg-background shadow-sm" : "text-muted-foreground")}>
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono">
                  {isBuilding ? 'Building...' : 'Ready'}
                </span>
                <Button variant="ghost" size="icon" onClick={handleCopy} className="h-8 w-8" title="Copy code">
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-hidden flex flex-col items-center">
              {activeTab === 'preview' && (
                <div className={cn(
                  "flex-1 shadow-2xl rounded-xl overflow-hidden border border-border transition-all duration-300 mx-auto",
                  viewportWidths[viewport],
                  viewport !== 'desktop' && 'max-h-full'
                )}>
                  <PreviewEngine code={currentCode} theme="light" className="rounded-xl" />
                </div>
              )}

              {activeTab === 'code' && (
                <Card className="flex-1 overflow-hidden w-full">
                  <CardContent className="p-0 h-full">
                    <ScrollArea className="h-full">
                      <pre className="p-4 text-sm font-mono bg-muted/30 whitespace-pre-wrap break-all leading-relaxed">
                        <code>{currentCode}</code>
                      </pre>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'seo' && (
                <div className="flex-1 max-w-3xl mx-auto w-full space-y-6 overflow-y-auto">
                  <Card>
                    <CardContent className="pt-6">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Google Search Preview</h3>
                      <div className="space-y-1 p-4 bg-muted/30 rounded-lg">
                        <div className="text-xl text-blue-600 hover:underline cursor-pointer truncate">{seoData.title}</div>
                        <div className="text-sm text-emerald-700">www.your-domain.com</div>
                        <div className="text-sm text-muted-foreground leading-snug">{seoData.description}</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Meta Tags</h3>
                      <div className="space-y-4">
                        <div><label className="text-xs font-medium text-muted-foreground">Title</label><div className="p-3 bg-muted rounded-lg text-sm font-mono mt-1">{seoData.title}</div></div>
                        <div><label className="text-xs font-medium text-muted-foreground">Description</label><div className="p-3 bg-muted rounded-lg text-sm mt-1">{seoData.description}</div></div>
                        <div><label className="text-xs font-medium text-muted-foreground">Keywords</label><div className="flex flex-wrap gap-2 mt-1">{seoData.keywords.map((k, i) => <Badge key={i} variant="secondary" className="text-xs">{k}</Badge>)}</div></div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Phase3Page;
