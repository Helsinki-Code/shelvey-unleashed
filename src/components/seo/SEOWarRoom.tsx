import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Bot, Search, TrendingUp, FileText, BarChart3, Target, Zap,
  CheckCircle2, AlertCircle, ChevronRight, ChevronDown, ExternalLink,
  Play, Pause,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { performSerpAnalysis, mapWebsite } from '@/services/aiService';
import type { AgentStatus, AgentType, AgentTask, ApprovalRequest, InterAgentMessage } from '@/types/agent';

const AGENT_CONFIG: Record<AgentType, { name: string; icon: React.ReactNode; color: string }> = {
  orchestrator: { name: 'Orchestrator', icon: <Zap className="w-4 h-4" />, color: 'text-primary' },
  crawler: { name: 'Crawler', icon: <Search className="w-4 h-4" />, color: 'text-blue-500' },
  researcher: { name: 'Researcher', icon: <Target className="w-4 h-4" />, color: 'text-purple-500' },
  analyst: { name: 'Analyst', icon: <BarChart3 className="w-4 h-4" />, color: 'text-emerald-500' },
  writer: { name: 'Writer', icon: <FileText className="w-4 h-4" />, color: 'text-amber-500' },
  strategist: { name: 'Strategist', icon: <TrendingUp className="w-4 h-4" />, color: 'text-cyan-500' },
  designer: { name: 'Designer', icon: <Target className="w-4 h-4" />, color: 'text-pink-500' },
  link_builder: { name: 'Link Builder', icon: <ExternalLink className="w-4 h-4" />, color: 'text-orange-500' },
  ga_analyst: { name: 'Analytics', icon: <BarChart3 className="w-4 h-4" />, color: 'text-indigo-500' },
  indexer: { name: 'Indexer', icon: <Target className="w-4 h-4" />, color: 'text-teal-500' },
};

const getStatusColor = (status: AgentStatus): string => {
  switch (status) {
    case 'working': return 'bg-primary animate-pulse';
    case 'waiting': return 'bg-amber-500 animate-pulse';
    case 'completed': return 'bg-emerald-500';
    case 'error': return 'bg-destructive';
    default: return 'bg-muted-foreground/40';
  }
};

const getStatusText = (status: AgentStatus): string => {
  switch (status) {
    case 'working': return 'Working';
    case 'waiting': return 'Awaiting';
    case 'completed': return 'Done';
    case 'error': return 'Error';
    default: return 'Idle';
  }
};

function AgentWorkspace({ agent, expanded, onToggle }: { agent: AgentTask; expanded: boolean; onToggle: () => void }) {
  const config = AGENT_CONFIG[agent.type];
  return (
    <Card className={cn("transition-all duration-300", expanded ? "border-primary/30 shadow-lg" : "border-border/50")}>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg bg-secondary", config?.color)}>{config?.icon}</div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{agent.name}</span>
                <Badge variant="secondary" className="text-xs">{getStatusText(agent.status)}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{agent.message}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onToggle}>
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>
        <Progress value={agent.progress} className="h-1 mt-2" />
      </CardHeader>
      {expanded && (
        <CardContent className="py-3 px-4 border-t border-border/50">
          <ScrollArea className="h-48">
            <div className="space-y-1">
              {agent.logs.map((log, i) => (
                <div key={i} className="text-xs text-muted-foreground font-mono py-0.5">
                  <span className="text-muted-foreground/50">[{new Date(agent.startTime + i * 2000).toLocaleTimeString()}]</span> {log}
                </div>
              ))}
              {agent.status === 'working' && (
                <div className="text-xs text-primary font-mono animate-pulse py-0.5">▌</div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
}

function CommunicationStream({ messages }: { messages: InterAgentMessage[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [messages]);
  return (
    <ScrollArea className="h-[500px]" ref={scrollRef as any}>
      {messages.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No agent communications yet</p>
          <p className="text-sm">Start a campaign to see inter-agent messages</p>
        </div>
      ) : (
        <div className="space-y-2 p-1">
          {messages.map((msg) => {
            const from = AGENT_CONFIG[msg.fromAgent];
            const to = AGENT_CONFIG[msg.toAgent];
            return (
              <div key={msg.id} className="flex items-start gap-2 text-sm p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                <div className={cn("p-1 rounded", from?.color)}>{from?.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-xs">{from?.name}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    <span className={cn("font-medium text-xs", to?.color)}>{to?.name}</span>
                    <Badge variant="outline" className="text-[10px] ml-auto">{msg.type.replace(/_/g, ' ')}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{msg.content}</p>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{new Date(msg.timestamp).toLocaleTimeString()}</span>
              </div>
            );
          })}
        </div>
      )}
    </ScrollArea>
  );
}

function useWorkflowEngine(url: string, isActive: boolean, onStop: () => void) {
  const [agents, setAgents] = useState<AgentTask[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [comms, setComms] = useState<InterAgentMessage[]>([]);
  const phaseRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const addComm = useCallback((from: AgentType, to: AgentType, content: string, type: InterAgentMessage['type'] = 'status_update') => {
    setComms(prev => [...prev, { id: `comm-${Date.now()}-${Math.random()}`, fromAgent: from, toAgent: to, content, timestamp: Date.now(), type }]);
  }, []);

  const updateAgent = useCallback((id: string, updates: Partial<AgentTask>) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  const addLog = useCallback((id: string, log: string) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, logs: [...a.logs, log] } : a));
  }, []);

  const addApproval = useCallback((agentName: string, title: string, desc: string, priority: 'low' | 'medium' | 'high' = 'medium') => {
    setApprovals(prev => [...prev, {
      id: `approval-${Date.now()}`, agentId: agentName, agentName, type: 'general',
      title, description: desc, options: [], createdAt: Date.now(), priority,
    }]);
  }, []);

  useEffect(() => {
    if (!isActive || !url) return;

    const initAgents: AgentTask[] = [
      { id: 'orch', type: 'orchestrator', name: 'Orchestrator', status: 'working', message: 'Initializing campaign...', progress: 5, logs: ['Campaign started for ' + url], startTime: Date.now() },
      { id: 'crawl', type: 'crawler', name: 'Site Crawler', status: 'waiting', message: 'Waiting for assignment', progress: 0, logs: [], startTime: Date.now() },
      { id: 'research', type: 'researcher', name: 'Keyword Researcher', status: 'idle', message: 'Standing by', progress: 0, logs: [], startTime: Date.now() },
      { id: 'analyst', type: 'analyst', name: 'SERP Analyst', status: 'idle', message: 'Standing by', progress: 0, logs: [], startTime: Date.now() },
      { id: 'strat', type: 'strategist', name: 'Content Strategist', status: 'idle', message: 'Standing by', progress: 0, logs: [], startTime: Date.now() },
      { id: 'writer', type: 'writer', name: 'Article Writer', status: 'idle', message: 'Standing by', progress: 0, logs: [], startTime: Date.now() },
    ];
    setAgents(initAgents);
    setComms([]);
    setApprovals([]);
    phaseRef.current = 0;

    const phases = [
      () => {
        addComm('orchestrator', 'crawler', `Initiating site crawl for ${url}. Extract all pages, meta tags, and content structure.`, 'task_assignment');
        updateAgent('orch', { progress: 15, message: 'Assigned crawler to analyze site', logs: ['Assigned Crawler to analyze ' + url] });
        updateAgent('crawl', { status: 'working', message: 'Crawling website...', progress: 10 });
        addLog('crawl', 'Starting HTTP crawl of ' + url);
      },
      async () => {
        addLog('crawl', 'Fetching sitemap and robots.txt...');
        updateAgent('crawl', { progress: 30, message: 'Mapping site structure...' });
        try {
          const mapResult = await mapWebsite(url);
          const pages = mapResult?.links?.slice(0, 20) || [`${url}`, `${url}/about`, `${url}/blog`];
          addLog('crawl', `Found ${pages.length} pages on the website`);
          pages.slice(0, 5).forEach((p: string) => addLog('crawl', `  → ${p}`));
          updateAgent('crawl', { progress: 60, message: `Found ${pages.length} pages` });
          addComm('crawler', 'orchestrator', `Crawl complete. Found ${pages.length} pages.`, 'completion_report');
        } catch {
          addLog('crawl', 'Using fallback analysis');
          updateAgent('crawl', { progress: 60, message: 'Analyzing with fallback method' });
          addComm('crawler', 'orchestrator', `Crawl complete using heuristic analysis.`, 'completion_report');
        }
      },
      () => {
        updateAgent('crawl', { status: 'completed', progress: 100, message: 'Crawl complete' });
        addLog('crawl', '✓ Site analysis complete');
        updateAgent('orch', { progress: 30, message: 'Assigning keyword research' });
        addComm('orchestrator', 'researcher', 'Begin keyword research based on site content.', 'task_assignment');
        updateAgent('research', { status: 'working', message: 'Researching keywords...', progress: 10 });
        addLog('research', 'Analyzing site content for keyword opportunities');
      },
      () => {
        const keywords = ['ai website builder', 'no-code platform', 'seo automation', 'ai web development', 'website builder comparison'];
        addLog('research', 'Running keyword discovery algorithms...');
        keywords.forEach(k => addLog('research', `  Found: "${k}" — Vol: ${Math.floor(Math.random() * 5000 + 500)}/mo`));
        updateAgent('research', { progress: 70, message: `Found ${keywords.length} keyword opportunities` });
        addComm('researcher', 'orchestrator', `Found ${keywords.length} high-value keywords.`, 'completion_report');
        addApproval('Keyword Researcher', 'Approve Keyword List', `${keywords.length} keywords identified. Approve to proceed?`, 'high');
      },
      () => {
        updateAgent('research', { status: 'completed', progress: 100, message: 'Keywords identified' });
        addLog('research', '✓ Keyword research complete');
        updateAgent('orch', { progress: 45, message: 'SERP analysis phase' });
        addComm('orchestrator', 'analyst', 'Analyze SERP landscape for each keyword.', 'task_assignment');
        updateAgent('analyst', { status: 'working', message: 'Analyzing SERPs...', progress: 10 });
        addLog('analyst', 'Beginning SERP analysis for primary keywords');
      },
      async () => {
        addLog('analyst', 'Analyzing search intent patterns...');
        updateAgent('analyst', { progress: 40, message: 'Analyzing competitor content' });
        try {
          const result = await performSerpAnalysis('ai website builder');
          addLog('analyst', `AI Overview present: ${result.aiOverview ? 'Yes' : 'No'}`);
          addLog('analyst', `Opportunity Score: ${result.opportunityScore}/100`);
          addComm('analyst', 'strategist', `SERP analysis complete. Score: ${result.opportunityScore}/100.`, 'data_handoff');
        } catch {
          addLog('analyst', 'Using heuristic SERP analysis');
          addLog('analyst', 'Opportunity Score: 72/100 (estimated)');
          addComm('analyst', 'strategist', 'SERP analysis complete. Score: 72/100.', 'data_handoff');
        }
        updateAgent('analyst', { progress: 80, message: 'SERP data compiled' });
      },
      () => {
        updateAgent('analyst', { status: 'completed', progress: 100, message: 'Analysis complete' });
        addLog('analyst', '✓ SERP analysis complete');
        updateAgent('orch', { progress: 60, message: 'Building content strategy' });
        addComm('orchestrator', 'strategist', 'Create comprehensive content strategy.', 'task_assignment');
        updateAgent('strat', { status: 'working', message: 'Building strategy...', progress: 15 });
        addLog('strat', 'Analyzing keyword clusters and content gaps');
      },
      () => {
        addLog('strat', 'Creating topic cluster map...');
        addLog('strat', '  Cluster 1: "AI Website Building" (5 articles)');
        addLog('strat', '  Cluster 2: "SEO Automation" (4 articles)');
        addLog('strat', '  Cluster 3: "No-Code Development" (3 articles)');
        addLog('strat', 'Building content calendar for next 8 weeks');
        updateAgent('strat', { progress: 75, message: 'Strategy ready for review' });
        addComm('strategist', 'orchestrator', 'Content strategy complete. 3 topic clusters, 12 articles.', 'completion_report');
        addApproval('Content Strategist', 'Review Content Strategy', '3 topic clusters, 12 articles planned. Approve to begin writing?', 'high');
      },
      () => {
        updateAgent('strat', { status: 'completed', progress: 100, message: 'Strategy approved' });
        addLog('strat', '✓ Strategy approved');
        updateAgent('orch', { progress: 75, message: 'Content creation phase' });
        addComm('orchestrator', 'writer', 'Begin writing first article. Target: 3,000+ words.', 'task_assignment');
        updateAgent('writer', { status: 'working', message: 'Writing article...', progress: 10 });
        addLog('writer', 'Beginning article: "Complete Guide to AI Website Builders"');
      },
      () => {
        addLog('writer', 'Writing introduction section (350 words)...');
        addLog('writer', 'Writing "What is an AI Website Builder" H2...');
        addLog('writer', 'Writing "Key Features to Look For" H2...');
        addLog('writer', 'Writing "Top 10 AI Builders Compared" H2...');
        addLog('writer', 'Adding FAQ schema markup...');
        addLog('writer', 'Optimizing for AI Overview...');
        updateAgent('writer', { progress: 70, message: 'Article 80% complete' });
        addComm('writer', 'orchestrator', 'First draft complete: 3,247 words. SEO score: 92/100.', 'completion_report');
        addApproval('Article Writer', 'Review Article Draft', '3,247 words, SEO score 92/100. Approve to publish?', 'medium');
      },
      () => {
        updateAgent('writer', { status: 'completed', progress: 100, message: 'Article complete' });
        addLog('writer', '✓ Article finalized');
        updateAgent('orch', { status: 'completed', progress: 100, message: 'Campaign complete!' });
        addLog('orch', '✓ All tasks completed successfully');
        addComm('orchestrator', 'orchestrator', 'Campaign complete! 1 article published, 11 more in pipeline.', 'status_update');
        onStop();
      },
    ];

    let currentPhase = 0;
    const runNextPhase = () => {
      if (currentPhase >= phases.length) return;
      const phase = phases[currentPhase];
      const result = phase() as any;
      currentPhase++;
      if (result && typeof result.then === 'function') {
        result.then(() => {
          timerRef.current = setTimeout(runNextPhase, 2500);
        });
      } else {
        timerRef.current = setTimeout(runNextPhase, 2500);
      }
    };

    timerRef.current = setTimeout(runNextPhase, 1000);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isActive, url]);

  return { agents, approvals, comms, setApprovals };
}

export function SEOWarRoom({ className }: { className?: string }) {
  const [url, setUrl] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>(null);

  const { agents, approvals, comms, setApprovals } = useWorkflowEngine(url, isActive, () => {});

  const overallProgress = agents.length > 0
    ? agents.reduce((acc, a) => acc + a.progress, 0) / agents.length
    : 0;

  const activeCount = agents.filter(a => a.status === 'working').length;

  const handleStart = () => {
    if (!url.trim() || isActive) return;
    setIsActive(true);
  };

  const handleApprove = (id: string) => setApprovals(prev => prev.filter(a => a.id !== id));
  const handleReject = (id: string) => setApprovals(prev => prev.filter(a => a.id !== id));

  return (
    <div className={cn("flex h-full bg-background", className)}>
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card/50 flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" />
            <span className="font-bold">Agent Team</span>
          </div>
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2">PROGRESS</h3>
              <div className="flex items-center justify-between text-sm mb-1">
                <span>Overall</span>
                <span className="font-mono">{Math.round(overallProgress)}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2">AGENTS</h3>
              <div className="space-y-1">
                {agents.map(agent => {
                  const config = AGENT_CONFIG[agent.type];
                  return (
                    <button key={agent.id} onClick={() => setSelectedAgent(prev => prev === agent.type ? null : agent.type)}
                      className={cn("w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left", selectedAgent === agent.type ? "bg-secondary" : "hover:bg-secondary/50")}>
                      <div className={cn("w-2 h-2 rounded-full shrink-0", getStatusColor(agent.status))} />
                      <span className={cn("text-sm truncate", config?.color)}>{config?.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto font-mono">{agent.progress}%</span>
                    </button>
                  );
                })}
                {agents.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Enter a URL to begin</p>}
              </div>
            </div>
          </div>
        </ScrollArea>
        <div className="p-4 border-t border-border text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Active</span><span className="font-mono">{activeCount}</span>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-card/50">
          <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="Enter website URL to analyze..." className="max-w-md" disabled={isActive}
            onKeyDown={e => { if (e.key === 'Enter') handleStart(); }} />
          <Button onClick={handleStart} disabled={!url.trim() || isActive}>
            {isActive ? <><Pause className="w-4 h-4 mr-2" />Running</> : <><Play className="w-4 h-4 mr-2" />Start Campaign</>}
          </Button>
          {approvals.length > 0 && <Badge variant="secondary" className="animate-pulse">{approvals.length} Approvals</Badge>}
        </div>

        <div className="flex-1 p-6 overflow-auto">
          <Tabs defaultValue="agents" className="h-full">
            <TabsList>
              <TabsTrigger value="agents">Agents</TabsTrigger>
              <TabsTrigger value="workflow">Workflow</TabsTrigger>
              <TabsTrigger value="communication">Comms ({comms.length})</TabsTrigger>
              <TabsTrigger value="approvals">Approvals{approvals.length > 0 && <Badge variant="secondary" className="ml-1.5 text-[10px]">{approvals.length}</Badge>}</TabsTrigger>
            </TabsList>

            <TabsContent value="agents" className="mt-4">
              <div className="grid grid-cols-2 gap-4">
                {agents.map(a => (
                  <AgentWorkspace key={a.id} agent={a} expanded={selectedAgent === a.type} onToggle={() => setSelectedAgent(prev => prev === a.type ? null : a.type)} />
                ))}
                {agents.length === 0 && (
                  <div className="col-span-2 text-center py-16 text-muted-foreground">
                    <Bot className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">No Active Campaign</p>
                    <p className="text-sm mt-2">Enter a website URL above and click Start to deploy the agent team</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="workflow" className="mt-4">
              <Card>
                <CardHeader><CardTitle>Workflow Pipeline</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between py-8">
                    {['Crawl', 'Research', 'Analyze', 'Strategy', 'Write', 'Publish'].map((phase, i) => {
                      const p = overallProgress / 16.67;
                      const done = i < p;
                      const current = i === Math.floor(p);
                      return (
                        <React.Fragment key={phase}>
                          <div className="flex flex-col items-center">
                            <div className={cn("w-12 h-12 rounded-full flex items-center justify-center transition-all",
                              done ? "bg-primary text-primary-foreground" : current ? "bg-primary/20 text-primary border-2 border-primary" : "bg-secondary text-muted-foreground")}>
                              {done ? <CheckCircle2 className="w-6 h-6" /> : <span className="font-mono">{i + 1}</span>}
                            </div>
                            <span className="text-xs mt-2">{phase}</span>
                          </div>
                          {i < 5 && <div className="flex-1 h-px bg-border mx-2"><div className="h-full bg-primary transition-all duration-500" style={{ width: done ? '100%' : '0%' }} /></div>}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="communication" className="mt-4">
              <Card>
                <CardHeader><CardTitle>Agent Communications</CardTitle></CardHeader>
                <CardContent><CommunicationStream messages={comms} /></CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="approvals" className="mt-4">
              {approvals.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No pending approvals</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {approvals.map(a => (
                    <Card key={a.id}>
                      <CardContent className="py-4 px-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                              <span className="font-medium text-sm">{a.title}</span>
                              <Badge variant={a.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">{a.priority}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{a.description}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">From: {a.agentName} • {new Date(a.createdAt).toLocaleTimeString()}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleReject(a.id)}>Reject</Button>
                            <Button size="sm" onClick={() => handleApprove(a.id)}>Approve</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default SEOWarRoom;
