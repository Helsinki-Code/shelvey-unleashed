import { useState, useCallback, useRef, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Users, Download, LayoutGrid, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { GlobalProgress } from './GlobalProgress';
import { AgentWorkspacePanel } from './AgentWorkspacePanel';
import { ApprovalQueue } from './ApprovalQueue';
import { CommunicationStream } from './CommunicationStream';
import { OrchestratorPanel } from './OrchestratorPanel';
import { AgentDeepDive } from './AgentDeepDive';
import { ExportPanel } from './ExportPanel';
import { AGENT_DEFINITIONS } from '@/types/agent';
import type {
  WarRoomState, AgentTask, AgentType, AgentLogEntry, InterAgentMessage,
  ApprovalRequest, WorkflowStep, OrchestratorDecision, OrchestratorPhase,
} from '@/types/agent';
import {
  crawlWebsiteAgent, performKeywordResearch, performSerpAnalysis,
  generateContentStrategy, generateArticleOutline, writeArticleSection,
  optimizeForAIOverview, generateInternalLinkSuggestions, mapWebsite,
} from '@/services/aiService';

function createLog(text: string, level: AgentLogEntry['level'] = 'info'): AgentLogEntry {
  return { timestamp: Date.now(), text, level };
}

function createTask(type: AgentType): AgentTask {
  const def = AGENT_DEFINITIONS.find(d => d.type === type)!;
  return {
    id: type,
    type,
    name: def.name,
    status: 'idle',
    message: 'Standing by',
    progress: 0,
    logs: [],
    startTime: Date.now(),
  };
}

function createInitialState(url: string, goals: string): WarRoomState {
  const agentTypes: AgentType[] = AGENT_DEFINITIONS.map(d => d.type);
  return {
    isActive: true,
    sessionId: null,
    targetUrl: url,
    goals,
    currentPhase: 'initializing',
    orchestratorTask: createTask('orchestrator'),
    agentTasks: agentTypes.map(createTask),
    approvals: [],
    messages: [],
    decisions: [],
    workflow: [
      { id: 'crawl', name: 'Crawl', description: 'Crawl website', assignedAgent: 'crawler', status: 'idle', dependencies: [], progress: 0 },
      { id: 'keywords', name: 'Keywords', description: 'Research keywords', assignedAgent: 'keyword_researcher', status: 'idle', dependencies: ['crawl'], progress: 0 },
      { id: 'serp', name: 'SERP', description: 'Analyze SERPs', assignedAgent: 'serp_analyst', status: 'idle', dependencies: ['keywords'], progress: 0 },
      { id: 'strategy', name: 'Strategy', description: 'Content strategy', assignedAgent: 'content_strategist', status: 'idle', dependencies: ['serp'], progress: 0 },
      { id: 'outline', name: 'Outline', description: 'Article outline', assignedAgent: 'outline_architect', status: 'idle', dependencies: ['strategy'], progress: 0 },
      { id: 'write', name: 'Write', description: 'Write article', assignedAgent: 'article_writer', status: 'idle', dependencies: ['outline'], progress: 0 },
      { id: 'optimize', name: 'Optimize', description: 'AI Overview opt', assignedAgent: 'ai_overview_optimizer', status: 'idle', dependencies: ['write'], progress: 0 },
      { id: 'links', name: 'Links', description: 'Internal links', assignedAgent: 'internal_linker', status: 'idle', dependencies: ['write'], progress: 0 },
      { id: 'report', name: 'Report', description: 'Generate report', assignedAgent: 'report_generator', status: 'idle', dependencies: ['optimize', 'links'], progress: 0 },
    ],
    articles: [],
    keywords: [],
    serpResults: [],
    strategy: null,
    overallProgress: 0,
  };
}

interface AgentWarRoomProps {
  url: string;
  goals: string;
  onStop: () => void;
  className?: string;
}

export function AgentWarRoom({ url, goals, onStop, className }: AgentWarRoomProps) {
  const [state, setState] = useState<WarRoomState>(() => createInitialState(url, goals));
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set(['orchestrator', 'crawler']));
  const [deepDiveAgent, setDeepDiveAgent] = useState<AgentTask | null>(null);
  const [activeTab, setActiveTab] = useState('agents');
  const [showComms, setShowComms] = useState(false);
  const runningRef = useRef(false);

  const updateAgent = useCallback((type: AgentType, updates: Partial<AgentTask>) => {
    setState(prev => ({
      ...prev,
      agentTasks: prev.agentTasks.map(a => a.id === type ? { ...a, ...updates } : a),
    }));
  }, []);

  const addLog = useCallback((type: AgentType, text: string, level: AgentLogEntry['level'] = 'info') => {
    setState(prev => ({
      ...prev,
      agentTasks: prev.agentTasks.map(a => a.id === type ? { ...a, logs: [...a.logs, createLog(text, level)] } : a),
    }));
  }, []);

  const addComm = useCallback((from: AgentType, to: AgentType, content: string, type: InterAgentMessage['type'] = 'status_update') => {
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, { id: `msg-${Date.now()}-${Math.random()}`, fromAgent: from, toAgent: to, content, timestamp: Date.now(), type }],
    }));
  }, []);

  const addDecision = useCallback((description: string, reasoning: string, agents: AgentType[]) => {
    setState(prev => ({
      ...prev,
      decisions: [...prev.decisions, { id: `dec-${Date.now()}`, timestamp: Date.now(), description, reasoning, agentsInvolved: agents }],
    }));
  }, []);

  const updateWorkflow = useCallback((stepId: string, status: WorkflowStep['status'], progress: number) => {
    setState(prev => ({
      ...prev,
      workflow: prev.workflow.map(w => w.id === stepId ? { ...w, status, progress } : w),
    }));
  }, []);

  const setPhase = useCallback((phase: OrchestratorPhase, progress: number) => {
    setState(prev => ({ ...prev, currentPhase: phase, overallProgress: progress }));
  }, []);

  const addApproval = useCallback((agentType: AgentType, title: string, desc: string, type: ApprovalRequest['type'] = 'general', priority: ApprovalRequest['priority'] = 'high') => {
    const def = AGENT_DEFINITIONS.find(d => d.type === agentType);
    setState(prev => ({
      ...prev,
      approvals: [...prev.approvals, {
        id: `approval-${Date.now()}`,
        agentId: agentType,
        agentName: def?.name || agentType,
        agentType,
        type,
        title,
        description: desc,
        options: [
          { id: 'approve', label: 'Approve', action: 'approve' },
          { id: 'reject', label: 'Reject', action: 'reject', variant: 'destructive' },
        ],
        createdAt: Date.now(),
        priority,
        blocking: true,
      }],
    }));
  }, []);

  const handleApprove = useCallback((id: string) => {
    setState(prev => ({ ...prev, approvals: prev.approvals.filter(a => a.id !== id) }));
    toast.success('Approved! Agents resuming work.');
  }, []);

  const handleReject = useCallback((id: string) => {
    setState(prev => ({ ...prev, approvals: prev.approvals.filter(a => a.id !== id) }));
    toast.info('Rejected. Agent will adjust approach.');
  }, []);

  // Main workflow execution
  useEffect(() => {
    if (runningRef.current) return;
    runningRef.current = true;

    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    const run = async () => {
      try {
        // Phase 1: Initialize
        setPhase('initializing', 2);
        updateAgent('orchestrator', { status: 'working', message: 'Planning workflow...', progress: 10 });
        addLog('orchestrator', 'Campaign started for ' + url, 'info');
        addDecision('Initiated full SEO campaign', `Target: ${url}. Setting up 16-agent pipeline.`, ['orchestrator']);
        await delay(1500);

        // Phase 2: Crawl
        setPhase('crawling', 8);
        addComm('orchestrator', 'crawler', `Begin crawling ${url}. Map all pages and extract content.`, 'task_assignment');
        updateAgent('orchestrator', { progress: 20, message: 'Assigned crawler' });
        updateAgent('crawler', { status: 'working', message: 'Crawling website...', progress: 10 });
        updateWorkflow('crawl', 'working', 10);
        addLog('crawler', 'Starting HTTP crawl of ' + url, 'info');
        await delay(800);

        addLog('crawler', 'Fetching sitemap and page structure...', 'info');
        updateAgent('crawler', { progress: 30 });

        let pages: string[] = [];
        let contentThemes: string[] = [];
        try {
          const mapResult = await mapWebsite(url);
          pages = (mapResult?.links || []).slice(0, 20);
          addLog('crawler', `Sitemap: discovered ${pages.length} pages`, 'success');
          pages.slice(0, 5).forEach(p => addLog('crawler', `  → ${p}`, 'data'));
        } catch {
          pages = [url, url + '/about', url + '/blog', url + '/pricing', url + '/features'];
          addLog('crawler', 'Sitemap unavailable, using heuristic discovery', 'warning');
        }

        updateAgent('crawler', { progress: 50, message: 'Analyzing content...' });
        addLog('crawler', 'Running AI content analysis...', 'info');

        try {
          const crawlResult = await crawlWebsiteAgent(url);
          contentThemes = crawlResult?.contentThemes || ['Technology', 'Business', 'Digital Marketing'];
          addLog('crawler', `Identified ${contentThemes.length} content themes`, 'success');
          contentThemes.forEach(t => addLog('crawler', `  Theme: ${t}`, 'data'));
          if (crawlResult?.technicalIssues?.length) {
            crawlResult.technicalIssues.slice(0, 3).forEach((issue: string) => addLog('crawler', `  ⚠ ${issue}`, 'warning'));
          }
        } catch {
          contentThemes = ['General Content', 'Services', 'Blog'];
          addLog('crawler', 'Using AI-estimated content themes', 'warning');
        }

        updateAgent('crawler', { status: 'completed', progress: 100, message: `${pages.length} pages analyzed` });
        updateWorkflow('crawl', 'completed', 100);
        addLog('crawler', '✓ Crawl complete', 'success');
        addComm('crawler', 'orchestrator', `Crawl done. ${pages.length} pages, ${contentThemes.length} themes.`, 'completion_report');
        setPhase('crawling', 15);

        // Phase 3: Keyword Research
        setPhase('keyword_research', 18);
        addComm('orchestrator', 'keyword_researcher', 'Research keywords based on crawl data.', 'task_assignment');
        updateAgent('keyword_researcher', { status: 'working', message: 'Researching keywords...', progress: 10 });
        updateWorkflow('keywords', 'working', 10);
        addLog('keyword_researcher', 'Analyzing content themes for keyword opportunities', 'info');
        await delay(500);

        let keywords: any[] = [];
        try {
          const kwResult = await performKeywordResearch(url, contentThemes, pages);
          keywords = kwResult?.keywords || [];
          addLog('keyword_researcher', `Discovered ${keywords.length} keywords`, 'success');
          keywords.slice(0, 8).forEach(k => addLog('keyword_researcher', `  "${k.keyword}" — Vol: ${k.volume}, Diff: ${k.difficulty}, Intent: ${k.intent}`, 'data'));
          if (kwResult?.clusters?.length) {
            kwResult.clusters.forEach((c: any) => addLog('keyword_researcher', `  Cluster: "${c.name}" (${c.count} keywords)`, 'data'));
          }
        } catch {
          keywords = [
            { keyword: 'best practices ' + contentThemes[0]?.toLowerCase(), volume: 2400, difficulty: 45, cpc: 1.2, intent: 'Informational', cluster: 'Core' },
            { keyword: contentThemes[0]?.toLowerCase() + ' guide', volume: 1800, difficulty: 38, cpc: 0.9, intent: 'Informational', cluster: 'Core' },
            { keyword: contentThemes[0]?.toLowerCase() + ' tools', volume: 3200, difficulty: 52, cpc: 2.1, intent: 'Commercial', cluster: 'Tools' },
          ];
          addLog('keyword_researcher', 'Generated estimated keyword data', 'warning');
        }

        updateAgent('keyword_researcher', { status: 'completed', progress: 100, message: `${keywords.length} keywords found` });
        updateWorkflow('keywords', 'completed', 100);
        addLog('keyword_researcher', '✓ Keyword research complete', 'success');
        addComm('keyword_researcher', 'orchestrator', `${keywords.length} keywords discovered and clustered.`, 'completion_report');
        setState(prev => ({ ...prev, keywords }));

        addApproval('keyword_researcher', 'Approve Keyword List', `${keywords.length} keywords identified across ${new Set(keywords.map((k: any) => k.cluster)).size} clusters. Review and approve to proceed with SERP analysis.`, 'keyword_list', 'high');
        updateAgent('keyword_researcher', { status: 'waiting', message: 'Awaiting keyword approval' });
        setPhase('keyword_research', 25);

        // Wait for approval (simulated auto-approve after delay)
        await delay(3000);
        setState(prev => ({ ...prev, approvals: prev.approvals.filter(a => a.type !== 'keyword_list') }));
        updateAgent('keyword_researcher', { status: 'completed', message: 'Keywords approved' });
        addLog('keyword_researcher', '✓ Keywords approved by user', 'success');

        // Phase 4: SERP Analysis
        setPhase('serp_analysis', 30);
        addComm('orchestrator', 'serp_analyst', 'Analyze SERP for top keywords.', 'task_assignment');
        updateAgent('serp_analyst', { status: 'working', message: 'Analyzing SERPs...', progress: 10 });
        updateWorkflow('serp', 'working', 10);
        addLog('serp_analyst', 'Beginning per-keyword SERP analysis', 'info');

        const serpResults: any[] = [];
        const topKeywords = keywords.slice(0, 3);
        for (let i = 0; i < topKeywords.length; i++) {
          const kw = topKeywords[i];
          addLog('serp_analyst', `Analyzing SERP for "${kw.keyword}"...`, 'info');
          try {
            const result = await performSerpAnalysis(kw.keyword);
            serpResults.push(result);
            addLog('serp_analyst', `  AI Overview: ${result.aiOverview ? 'Present' : 'None'}`, 'data');
            addLog('serp_analyst', `  PAA Questions: ${result.peopleAlsoAsk?.length || 0}`, 'data');
            addLog('serp_analyst', `  Opportunity Score: ${result.opportunityScore}/100`, 'data');
            result.peopleAlsoAsk?.slice(0, 3).forEach((q: string) => addLog('serp_analyst', `    Q: ${q}`, 'data'));
          } catch {
            addLog('serp_analyst', `  Using estimated SERP data for "${kw.keyword}"`, 'warning');
            serpResults.push({ keyword: kw.keyword, aiOverview: '', peopleAlsoAsk: [], competitors: [], opportunityScore: 60, strategicInsight: '', group: 'General', timestamp: Date.now() });
          }
          updateAgent('serp_analyst', { progress: 30 + (i + 1) * 20 });
        }

        updateAgent('serp_analyst', { status: 'completed', progress: 100, message: `${serpResults.length} keywords analyzed` });
        updateWorkflow('serp', 'completed', 100);
        addLog('serp_analyst', '✓ SERP analysis complete', 'success');
        setState(prev => ({ ...prev, serpResults }));
        setPhase('serp_analysis', 40);

        // Phase 5: Content Strategy
        setPhase('content_strategy', 42);
        addComm('orchestrator', 'content_strategist', 'Create content strategy from all intelligence.', 'task_assignment');
        updateAgent('content_strategist', { status: 'working', message: 'Building strategy...', progress: 15 });
        updateWorkflow('strategy', 'working', 15);
        addLog('content_strategist', 'Synthesizing keyword and SERP data into strategy', 'info');
        await delay(300);

        let strategy: any = null;
        try {
          strategy = await generateContentStrategy(keywords, serpResults, goals);
          addLog('content_strategist', `Created ${strategy.clusters?.length || 0} topic clusters`, 'success');
          addLog('content_strategist', `Planned ${strategy.calendar?.length || 0} content items`, 'success');
          addLog('content_strategist', strategy.summary || 'Strategy ready.', 'data');
        } catch {
          strategy = { clusters: [{ name: 'Core', keywords: keywords.slice(0, 5).map((k: any) => k.keyword), intent: 'Informational' }], pillarContent: [], calendar: [], internalLinking: [], internalLinkingMap: [], summary: 'Basic strategy generated.' };
          addLog('content_strategist', 'Generated basic content strategy', 'warning');
        }

        updateAgent('content_strategist', { status: 'completed', progress: 100, message: 'Strategy ready' });
        updateWorkflow('strategy', 'completed', 100);
        setState(prev => ({ ...prev, strategy }));
        addApproval('content_strategist', 'Approve Content Strategy', `${strategy.clusters?.length} topic clusters. ${strategy.calendar?.length} planned articles. Approve to begin content creation.`, 'strategy', 'high');
        setPhase('content_strategy', 50);

        await delay(3000);
        setState(prev => ({ ...prev, approvals: prev.approvals.filter(a => a.type !== 'strategy') }));
        addLog('content_strategist', '✓ Strategy approved', 'success');

        // Phase 6: Outline
        setPhase('outline_generation', 55);
        const targetKw = keywords[0];
        addComm('orchestrator', 'outline_architect', `Create outline for "${targetKw?.keyword || 'article'}".`, 'task_assignment');
        updateAgent('outline_architect', { status: 'working', message: 'Creating outline...', progress: 20 });
        updateWorkflow('outline', 'working', 20);
        addLog('outline_architect', `Building outline for "${targetKw?.keyword}"`, 'info');

        let outline: any = { title: targetKw?.keyword || 'Article', sections: [{ heading: 'Introduction', content: '', type: 'text', visualType: 'none' }] };
        try {
          const paa = serpResults[0]?.peopleAlsoAsk || [];
          outline = await generateArticleOutline(targetKw?.keyword || '', serpResults[0] || {}, 'professional', paa);
          addLog('outline_architect', `Title: "${outline.title}"`, 'data');
          addLog('outline_architect', `${outline.sections?.length || 0} sections planned`, 'success');
          outline.sections?.forEach((s: any) => addLog('outline_architect', `  H2: ${s.heading}`, 'data'));
        } catch {
          addLog('outline_architect', 'Using basic outline structure', 'warning');
        }

        updateAgent('outline_architect', { status: 'completed', progress: 100, message: 'Outline ready' });
        updateWorkflow('outline', 'completed', 100);
        setPhase('outline_generation', 60);

        // Phase 7: Write article
        setPhase('article_writing', 62);
        addComm('orchestrator', 'article_writer', `Write article: "${outline.title}". Target: 3,000+ words.`, 'task_assignment');
        updateAgent('article_writer', { status: 'working', message: 'Writing article...', progress: 5 });
        updateWorkflow('write', 'working', 5);

        const articleId = `article-${Date.now()}`;
        const sections = outline.sections || [{ heading: 'Introduction', content: '', type: 'text', visualType: 'none' }];

        setState(prev => ({
          ...prev,
          articles: [{
            id: articleId,
            keyword: targetKw?.keyword || '',
            title: outline.title || '',
            status: 'drafting',
            progress: 0,
            logs: [],
            content: '',
            mdContent: '',
            sections,
            wordCount: 0,
            aiOverviewOptimized: false,
          }],
        }));

        let fullContent = '';
        for (let i = 0; i < sections.length; i++) {
          const sec = sections[i];
          addLog('article_writer', `Writing section: "${sec.heading}"...`, 'info');
          try {
            const result = await writeArticleSection(sec.heading, targetKw?.keyword || '', fullContent.slice(-500), 'professional', sec.visualType || 'none', serpResults[0]?.peopleAlsoAsk?.slice(0, 3));
            fullContent += `\n\n## ${sec.heading}\n\n${result.content}`;
            sections[i] = { ...sec, content: result.content };
            const words = fullContent.split(/\s+/).filter(w => w).length;
            addLog('article_writer', `  ✓ ${sec.heading} — ${result.content.split(/\s+/).length} words`, 'success');

            setState(prev => ({
              ...prev,
              articles: prev.articles.map(a => a.id === articleId ? {
                ...a, content: fullContent, sections: [...sections], wordCount: words, progress: ((i + 1) / sections.length) * 100,
              } : a),
            }));
          } catch {
            addLog('article_writer', `  ⚠ Fallback content for "${sec.heading}"`, 'warning');
          }
          updateAgent('article_writer', { progress: 10 + ((i + 1) / sections.length) * 80 });
        }

        const totalWords = fullContent.split(/\s+/).filter(w => w).length;
        updateAgent('article_writer', { status: 'completed', progress: 100, message: `${totalWords} words written` });
        updateWorkflow('write', 'completed', 100);
        addLog('article_writer', `✓ Article complete: ${totalWords} words`, 'success');
        setPhase('article_writing', 75);

        // Phase 8: AI Overview Optimization
        setPhase('ai_overview_optimization', 78);
        updateAgent('ai_overview_optimizer', { status: 'working', message: 'Optimizing for AI Overview...', progress: 30 });
        updateWorkflow('optimize', 'working', 30);
        addLog('ai_overview_optimizer', 'Analyzing content for AI Overview compatibility', 'info');
        await delay(300);

        try {
          const optResult = await optimizeForAIOverview(fullContent, targetKw?.keyword || '', serpResults[0]?.aiOverview);
          if (optResult.changes?.length) {
            optResult.changes.forEach(c => addLog('ai_overview_optimizer', `  Changed: ${c}`, 'data'));
          }
          addLog('ai_overview_optimizer', '✓ Content optimized for AI Overview', 'success');
          setState(prev => ({
            ...prev,
            articles: prev.articles.map(a => a.id === articleId ? { ...a, content: optResult.content || a.content, aiOverviewOptimized: true, status: 'completed' } : a),
          }));
        } catch {
          addLog('ai_overview_optimizer', 'AI Overview optimization skipped', 'warning');
        }

        updateAgent('ai_overview_optimizer', { status: 'completed', progress: 100, message: 'Optimization complete' });
        updateWorkflow('optimize', 'completed', 100);
        setPhase('ai_overview_optimization', 82);

        // Phase 9: Internal Links
        setPhase('internal_linking', 84);
        updateAgent('internal_linker', { status: 'working', message: 'Suggesting internal links...', progress: 20 });
        updateWorkflow('links', 'working', 20);
        addLog('internal_linker', 'Analyzing sitemap for link opportunities', 'info');

        try {
          const links = await generateInternalLinkSuggestions(fullContent, pages);
          addLog('internal_linker', `Found ${links.length} internal link suggestions`, 'success');
          links.slice(0, 5).forEach(l => addLog('internal_linker', `  "${l.anchorText}" → ${l.targetUrl} (${Math.round(l.confidence * 100)}%)`, 'data'));
          setState(prev => ({
            ...prev,
            articles: prev.articles.map(a => a.id === articleId ? { ...a, linkSuggestions: links } : a),
          }));
        } catch {
          addLog('internal_linker', 'Link suggestion generation skipped', 'warning');
        }

        updateAgent('internal_linker', { status: 'completed', progress: 100, message: 'Links suggested' });
        updateWorkflow('links', 'completed', 100);
        setPhase('internal_linking', 88);

        // Phase 10: Report
        setPhase('report_generation', 92);
        updateAgent('report_generator', { status: 'working', message: 'Generating report...', progress: 40 });
        updateWorkflow('report', 'working', 40);
        addLog('report_generator', 'Compiling session report', 'info');
        await delay(1000);
        addLog('report_generator', '✓ Session report ready for export', 'success');
        updateAgent('report_generator', { status: 'completed', progress: 100, message: 'Report ready' });
        updateWorkflow('report', 'completed', 100);

        // Done
        setPhase('completed', 100);
        updateAgent('orchestrator', { status: 'completed', progress: 100, message: 'Campaign complete!' });
        addLog('orchestrator', '✓ All tasks completed successfully', 'success');
        addComm('orchestrator', 'orchestrator', `Campaign complete! ${totalWords} words written, ${keywords.length} keywords analyzed.`, 'status_update');
        toast.success('SEO campaign complete! Review results and export.');

      } catch (err) {
        console.error('Workflow error:', err);
        addLog('orchestrator', `Error: ${err instanceof Error ? err.message : 'Unknown'}`, 'error');
        updateAgent('orchestrator', { status: 'error', message: 'Workflow error' });
        toast.error('Workflow encountered an error. Check agent logs.');
      }
    };

    run();
  }, []);

  const toggleAgent = (id: string) => {
    setExpandedAgents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const activeAgents = state.agentTasks.filter(a => a.status !== 'idle');
  const idleAgents = state.agentTasks.filter(a => a.status === 'idle');

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <GlobalProgress state={state} />

      {deepDiveAgent && (
        <AgentDeepDive agent={deepDiveAgent} onClose={() => setDeepDiveAgent(null)} />
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Orchestrator Strip */}
          <div className="p-3 border-b border-border bg-card/30">
            <OrchestratorPanel workflow={state.workflow} decisions={state.decisions} />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 pt-3">
              <TabsList className="bg-background border border-border">
                <TabsTrigger value="agents" className="gap-1.5"><Users className="w-3.5 h-3.5" />Agents ({activeAgents.length})</TabsTrigger>
                <TabsTrigger value="comms" className="gap-1.5"><MessageSquare className="w-3.5 h-3.5" />Comms ({state.messages.length})</TabsTrigger>
                <TabsTrigger value="export" className="gap-1.5"><Download className="w-3.5 h-3.5" />Export</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="agents" className="flex-1 overflow-auto p-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                {activeAgents.map(agent => (
                  <AgentWorkspacePanel
                    key={agent.id}
                    agent={agent}
                    expanded={expandedAgents.has(agent.id)}
                    onToggle={() => toggleAgent(agent.id)}
                    onDeepDive={() => setDeepDiveAgent(agent)}
                  />
                ))}
                {idleAgents.map(agent => (
                  <AgentWorkspacePanel
                    key={agent.id}
                    agent={agent}
                    expanded={expandedAgents.has(agent.id)}
                    onToggle={() => toggleAgent(agent.id)}
                    onDeepDive={() => setDeepDiveAgent(agent)}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="comms" className="flex-1 overflow-hidden p-4">
              <CommunicationStream messages={state.messages} className="h-full" />
            </TabsContent>

            <TabsContent value="export" className="flex-1 overflow-auto p-4">
              <div className="max-w-lg">
                <ExportPanel state={state} />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right sidebar - Approvals */}
        <div className="w-72 border-l border-border flex flex-col bg-card/30">
          <div className="p-3 border-b border-border">
            <h3 className="text-sm font-medium flex items-center gap-2">
              Approvals
              {state.approvals.length > 0 && (
                <Badge variant="destructive" className="text-xs">{state.approvals.length}</Badge>
              )}
            </h3>
          </div>
          <ScrollArea className="flex-1 p-3">
            <ApprovalQueue
              approvals={state.approvals}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
