import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Globe, FileText, CheckCircle2, Loader2, AlertCircle, 
  ExternalLink, Clock, Sparkles, Database, Code, Link2, 
  ChevronDown, ChevronUp, Play, Pause
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DeepResearchViewerProps {
  projectId: string;
  phaseId?: string;
  deliverableId?: string;
  taskType: string;
  projectContext: {
    name?: string;
    industry?: string;
    description?: string;
    target_market?: string;
  };
  onComplete?: (result: any) => void;
}

interface ResearchEvent {
  type: string;
  message: string;
  timestamp: string;
  step?: number;
  totalSteps?: number;
  model?: string;
  tools?: string[];
  citationsCount?: number;
  citations?: any[];
  webSearchCount?: number;
  searches?: any[];
  duration?: number;
  content?: any;
}

interface Citation {
  id: number;
  source: string;
  url: string;
  title: string;
  accessedAt: string;
}

export const DeepResearchViewer = ({
  projectId,
  phaseId,
  deliverableId,
  taskType,
  projectContext,
  onComplete,
}: DeepResearchViewerProps) => {
  const [isResearching, setIsResearching] = useState(false);
  const [events, setEvents] = useState<ResearchEvent[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(5);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [webSearches, setWebSearches] = useState<any[]>([]);
  const [researchResult, setResearchResult] = useState<any>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showWebSearches, setShowWebSearches] = useState(false);
  const [showCitations, setShowCitations] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startResearch = async () => {
    setIsResearching(true);
    setEvents([]);
    setCurrentStep(0);
    setCitations([]);
    setWebSearches([]);
    setResearchResult(null);
    setError(null);
    setElapsedTime(0);

    // Start elapsed time counter
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const url = `${supabaseUrl}/functions/v1/deep-research-agent`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          taskType,
          projectContext,
          userId: (await supabase.auth.getUser()).data.user?.id,
          projectId,
          deliverableId,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to start research');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event: ResearchEvent = JSON.parse(line.slice(6));
              handleEvent(event);
            } catch (e) {
              console.error('Failed to parse event:', e);
            }
          }
        }
      }
    } catch (err) {
      console.error('Research error:', err);
      setError(err instanceof Error ? err.message : 'Research failed');
      toast.error('Research failed. Please try again.');
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setIsResearching(false);
    }
  };

  const handleEvent = (event: ResearchEvent) => {
    setEvents(prev => [...prev, event]);

    if (event.step) {
      setCurrentStep(event.step);
    }
    if (event.totalSteps) {
      setTotalSteps(event.totalSteps);
    }

    switch (event.type) {
      case 'start':
        toast.info(`Starting research with ${event.model || 'AI'}...`);
        break;
      case 'citations':
        if (event.citations) {
          setCitations(event.citations);
        }
        break;
      case 'web_searches':
        if (event.searches) {
          setWebSearches(event.searches);
        }
        break;
      case 'complete':
        setResearchResult(event.content);
        setCitations(event.citations || []);
        toast.success(`Research complete! Found ${event.citationsCount || 0} sources.`);
        if (onComplete) {
          onComplete(event);
        }
        break;
      case 'error':
        setError(event.message);
        toast.error(event.message);
        break;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'start': return <Sparkles className="w-4 h-4 text-primary" />;
      case 'researching': return <Search className="w-4 h-4 text-blue-500" />;
      case 'api_call': return <Database className="w-4 h-4 text-purple-500" />;
      case 'processing': return <Code className="w-4 h-4 text-orange-500" />;
      case 'web_searches': return <Globe className="w-4 h-4 text-green-500" />;
      case 'citations': return <Link2 className="w-4 h-4 text-cyan-500" />;
      case 'saving': return <FileText className="w-4 h-4 text-yellow-500" />;
      case 'complete': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'fallback': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default: return <Loader2 className="w-4 h-4 animate-spin" />;
    }
  };

  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" />
                Deep Research Engine
              </CardTitle>
              <CardDescription>
                AI-powered research using OpenAI o4-mini-deep-research with real web search
              </CardDescription>
            </div>
            <Badge variant="outline" className="gap-1">
              <Globe className="w-3 h-3" />
              Web Search Enabled
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Start Button */}
          {!isResearching && !researchResult && (
            <Button onClick={startResearch} size="lg" className="w-full gap-2">
              <Play className="w-4 h-4" />
              Start Deep Research: {taskType.replace(/_/g, ' ')}
            </Button>
          )}

          {/* Progress Section */}
          {isResearching && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm font-medium">Researching...</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(elapsedTime)}
                  </span>
                  <span>Step {currentStep} of {totalSteps}</span>
                </div>
              </div>
              <Progress value={progress} className="h-2" />
              {events.length > 0 && (
                <p className="text-sm text-muted-foreground animate-pulse">
                  {events[events.length - 1].message}
                </p>
              )}
            </div>
          )}

          {/* Completed */}
          {researchResult && !isResearching && (
            <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="font-medium">Research Complete!</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span>{citations.length} sources found</span>
                <span>{formatTime(elapsedTime)} elapsed</span>
                <Button variant="outline" size="sm" onClick={startResearch}>
                  Run Again
                </Button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <span className="text-destructive">{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Research Activity Timeline */}
      {events.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Research Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                <AnimatePresence>
                  {events.map((event, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50"
                    >
                      <div className="mt-0.5">{getEventIcon(event.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{event.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      {event.step && (
                        <Badge variant="outline" className="text-xs">
                          Step {event.step}
                        </Badge>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Web Searches Panel */}
      {webSearches.length > 0 && (
        <Collapsible open={showWebSearches} onOpenChange={setShowWebSearches}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="w-4 h-4 text-green-500" />
                    Web Searches ({webSearches.length})
                  </CardTitle>
                  {showWebSearches ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-2">
                  {webSearches.map((search, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded bg-accent/30">
                      <Search className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm flex-1">{search.query}</span>
                      <Badge variant="outline" className="text-xs">{search.type}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Citations Panel */}
      {citations.length > 0 && (
        <Collapsible open={showCitations} onOpenChange={setShowCitations}>
          <Card className="border-cyan-500/20">
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-cyan-500" />
                    Sources & Citations ({citations.length})
                  </CardTitle>
                  {showCitations ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {citations.map((citation) => (
                      <motion.a
                        key={citation.id}
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors group"
                        whileHover={{ scale: 1.01 }}
                      >
                        <Badge variant="secondary" className="shrink-0">
                          [{citation.id}]
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm group-hover:text-primary transition-colors">
                            {citation.title || citation.source}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {citation.url}
                          </p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      </motion.a>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Research Result Preview */}
      {researchResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Research Report Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {researchResult.executive_summary && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-primary mb-2">Executive Summary</h4>
                  <p className="text-sm text-muted-foreground">{researchResult.executive_summary}</p>
                </div>
              )}
              {researchResult.key_findings && researchResult.key_findings.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-primary mb-2">Key Findings</h4>
                  <ul className="text-sm space-y-1">
                    {researchResult.key_findings.slice(0, 5).map((finding: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3 h-3 mt-1 text-green-500 shrink-0" />
                        <span>{finding}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {researchResult.recommendations && researchResult.recommendations.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-primary mb-2">Recommendations</h4>
                  <ul className="text-sm space-y-1">
                    {researchResult.recommendations.slice(0, 5).map((rec: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Sparkles className="w-3 h-3 mt-1 text-primary shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
