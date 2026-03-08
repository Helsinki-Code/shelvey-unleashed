// Agent Types for SEO Agent War Room - 16 Specialized Agents

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  isThinking?: boolean;
}

export interface SEOData {
  title: string;
  description: string;
  keywords: string[];
}

export interface BuilderState {
  messages: Message[];
  isBuilding: boolean;
  currentCode: string;
  seoData: SEOData;
}

export type AgentStatus = 'idle' | 'working' | 'waiting' | 'completed' | 'error';

export type AgentType =
  | 'orchestrator'
  | 'crawler'
  | 'keyword_researcher'
  | 'serp_analyst'
  | 'content_strategist'
  | 'outline_architect'
  | 'article_writer'
  | 'ai_overview_optimizer'
  | 'internal_linker'
  | 'image_generator'
  | 'rank_tracker'
  | 'analytics_agent'
  | 'content_optimizer'
  | 'indexing_predictor'
  | 'link_validator'
  | 'report_generator';

export interface AgentDefinition {
  type: AgentType;
  name: string;
  subtitle: string;
  icon: string;
  color: string;
  description: string;
  responsibilities: string[];
  approvalGates: string[];
}

export interface AgentTask {
  id: string;
  type: AgentType;
  name: string;
  status: AgentStatus;
  message: string;
  progress: number;
  logs: AgentLogEntry[];
  startTime: number;
  endTime?: number;
  resultPayload?: any;
  resultType?: 'json' | 'csv' | 'md';
}

export interface AgentLogEntry {
  timestamp: number;
  text: string;
  level: 'info' | 'success' | 'warning' | 'error' | 'data';
}

export interface KeywordMetric {
  keyword: string;
  volume: number;
  difficulty: number;
  cpc: number;
  intent: 'Informational' | 'Transactional' | 'Commercial' | 'Navigational';
  category?: string;
  cluster?: string;
}

export interface CompetitorData {
  domain: string;
  rank: number;
  estimatedTraffic: number;
  domainAuthority: number;
  rankingChange: number;
}

export interface SerpResult {
  keyword: string;
  aiOverview: string;
  peopleAlsoAsk: string[];
  competitors: CompetitorData[];
  opportunityScore: number;
  strategicInsight: string;
  group: string;
  timestamp: number;
}

export interface ArticleSection {
  heading: string;
  content: string;
  type: 'text' | 'list' | 'table' | 'chart' | 'image';
  visualType?: 'none' | 'chart' | 'table' | 'image';
  chartData?: any[];
  imagePrompt?: string;
  imageUrl?: string;
}

export interface LinkSuggestion {
  id: string;
  anchorText: string;
  targetUrl: string;
  context: string;
  type: 'internal' | 'external';
  confidence: number;
}

export interface GeneratedArticle {
  id: string;
  keyword: string;
  title: string;
  status: 'queued' | 'researching' | 'outlining' | 'drafting' | 'optimizing' | 'reviewing_links' | 'generating_images' | 'completed' | 'failed' | 'indexed';
  progress: number;
  logs: string[];
  content: string;
  mdContent: string;
  metaDescription?: string;
  schemaMarkup?: string;
  featuredImage?: string;
  sections: ArticleSection[];
  wordCount: number;
  aiOverviewOptimized: boolean;
  linkSuggestions?: LinkSuggestion[];
  externalLinks?: LinkSuggestion[];
  paaQuestionsAnswered?: string[];
  linksApplied?: boolean;
}

export interface RankHistoryPoint {
  date: string;
  rank: number;
}

export interface DomainRankInfo {
  domain: string;
  keyword: string;
  currentRank: number;
  history: RankHistoryPoint[];
}

export interface ContentStrategy {
  clusters: { name: string; keywords: string[]; intent: string }[];
  pillarContent: { title: string; cluster: string; targetKeyword: string; supportingArticles: string[] }[];
  calendar: { week: number; topic: string; type: string; bestDay: string; cluster: string }[];
  internalLinking: { sourceTopic: string; targetTopic: string; anchorText: string }[];
  internalLinkingMap: { from: string; to: string; anchorText: string; priority: number }[];
  summary: string;
}

export interface GeneratedImage {
  id: string;
  prompt: string;
  url: string;
  aspectRatio: string;
  createdAt: number;
}

export interface RankResult {
  keyword: string;
  rank: number | null;
  url: string | null;
  title: string | null;
  analysis: string;
  found: boolean;
}

export interface BulkRankResponse {
  results: RankResult[];
  summary: string;
  groundingUrls: string[];
}

export interface GroundingChunk {
  web?: { uri: string; title: string };
}

export interface AnalyticsMetric {
  timestamp: string;
  activeUsers: number;
  sessions: number;
  bounceRate: number;
  avgDuration: number;
}

export interface PagePerformance {
  path: string;
  views: number;
  engagement: number;
  status: 'indexed' | 'crawled' | 'discovered' | 'unknown';
}

export interface ApprovalRequest {
  id: string;
  agentId: string;
  agentName: string;
  agentType: AgentType;
  type: 'crawl_results' | 'keyword_list' | 'serp_findings' | 'strategy' | 'outline' | 'article_draft' | 'image_concept' | 'links' | 'final_article' | 'general';
  title: string;
  description: string;
  payload?: any;
  options: ApprovalOption[];
  createdAt: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  blocking: boolean;
}

export interface ApprovalOption {
  id: string;
  label: string;
  action: 'approve' | 'reject' | 'modify' | 'more_info';
  variant?: 'default' | 'destructive' | 'outline';
}

export interface InterAgentMessage {
  id: string;
  fromAgent: AgentType;
  toAgent: AgentType;
  content: string;
  timestamp: number;
  type: 'task_assignment' | 'completion_report' | 'data_handoff' | 'question' | 'status_update' | 'decision' | 'error_report';
  attachments?: any[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  assignedAgent: AgentType;
  status: AgentStatus;
  dependencies: string[];
  progress: number;
}

export type OrchestratorPhase =
  | 'idle'
  | 'initializing'
  | 'crawling'
  | 'keyword_research'
  | 'serp_analysis'
  | 'content_strategy'
  | 'outline_generation'
  | 'article_writing'
  | 'ai_overview_optimization'
  | 'internal_linking'
  | 'image_generation'
  | 'rank_tracking'
  | 'analytics'
  | 'content_optimization'
  | 'indexing_prediction'
  | 'link_validation'
  | 'report_generation'
  | 'completed';

export interface OrchestratorDecision {
  id: string;
  timestamp: number;
  description: string;
  reasoning: string;
  agentsInvolved: AgentType[];
}

export interface WarRoomState {
  isActive: boolean;
  sessionId: string | null;
  targetUrl: string;
  goals: string;
  currentPhase: OrchestratorPhase;
  orchestratorTask: AgentTask | null;
  agentTasks: AgentTask[];
  approvals: ApprovalRequest[];
  messages: InterAgentMessage[];
  decisions: OrchestratorDecision[];
  workflow: WorkflowStep[];
  articles: GeneratedArticle[];
  keywords: KeywordMetric[];
  serpResults: SerpResult[];
  strategy: ContentStrategy | null;
  overallProgress: number;
}

export interface AgentWorkspace {
  agent: AgentTask;
  expanded: boolean;
  deepDive: boolean;
}

// 16 Agent Definitions
export const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    type: 'orchestrator',
    name: 'Orchestrator Agent',
    subtitle: 'The Conductor',
    icon: '🎯',
    color: 'text-primary',
    description: 'Coordinates the entire agent team, manages workflow, resolves conflicts, and ensures all tasks complete in proper sequence.',
    responsibilities: ['Workflow planning', 'Task assignment', 'Conflict resolution', 'Progress tracking', 'Decision logging'],
    approvalGates: [],
  },
  {
    type: 'crawler',
    name: 'Website Crawler',
    subtitle: 'The Scout',
    icon: '🕷️',
    color: 'text-blue-500',
    description: 'Discovers and maps all pages on the target website, extracting content, meta tags, and site structure.',
    responsibilities: ['Page discovery', 'Content extraction', 'Meta tag analysis', 'Site structure mapping', 'Technical issue detection'],
    approvalGates: ['Crawl results review'],
  },
  {
    type: 'keyword_researcher',
    name: 'Keyword Researcher',
    subtitle: 'The Strategist',
    icon: '🔑',
    color: 'text-purple-500',
    description: 'Analyzes crawled content and discovers high-value keyword opportunities with volume, difficulty, and intent data.',
    responsibilities: ['Keyword discovery', 'Volume analysis', 'Difficulty scoring', 'Intent classification', 'Cluster grouping'],
    approvalGates: ['Keyword list approval'],
  },
  {
    type: 'serp_analyst',
    name: 'SERP Analyst',
    subtitle: 'The Researcher',
    icon: '📊',
    color: 'text-emerald-500',
    description: 'Examines search results for each keyword, capturing AI Overviews, PAA questions, and competitor positioning.',
    responsibilities: ['SERP analysis', 'AI Overview capture', 'PAA extraction', 'Competitor profiling', 'Opportunity scoring'],
    approvalGates: ['SERP findings review'],
  },
  {
    type: 'content_strategist',
    name: 'Content Strategist',
    subtitle: 'The Planner',
    icon: '📋',
    color: 'text-cyan-500',
    description: 'Synthesizes all intelligence into topic clusters, pillar content plans, and editorial calendars.',
    responsibilities: ['Topic clustering', 'Pillar content planning', 'Calendar generation', 'Internal linking strategy', 'Content gap analysis'],
    approvalGates: ['Strategy approval'],
  },
  {
    type: 'outline_architect',
    name: 'Outline Architect',
    subtitle: 'The Structuralist',
    icon: '📐',
    color: 'text-amber-500',
    description: 'Creates detailed article outlines with H2/H3 structure, section types, and visual placement recommendations.',
    responsibilities: ['Outline creation', 'Section planning', 'Visual placement', 'FAQ integration', 'Schema planning'],
    approvalGates: ['Outline approval'],
  },
  {
    type: 'article_writer',
    name: 'Article Writer',
    subtitle: 'The Wordsmith',
    icon: '✍️',
    color: 'text-orange-500',
    description: 'Produces 3,000+ word SEO-optimized articles section by section with live streaming text.',
    responsibilities: ['Section writing', 'SEO optimization', 'PAA integration', 'Source citing', 'Tone consistency'],
    approvalGates: ['Article draft review', 'Final article approval'],
  },
  {
    type: 'ai_overview_optimizer',
    name: 'AI Overview Optimizer',
    subtitle: 'The Future-Proofer',
    icon: '🤖',
    color: 'text-indigo-500',
    description: 'Optimizes content specifically for Google AI Overview inclusion with structured answers and featured snippet targeting.',
    responsibilities: ['AI Overview optimization', 'Featured snippet targeting', 'Direct answer formatting', 'Schema enhancement'],
    approvalGates: [],
  },
  {
    type: 'internal_linker',
    name: 'Internal Link Suggester',
    subtitle: 'The Connector',
    icon: '🔗',
    color: 'text-teal-500',
    description: 'Analyzes sitemap and content to suggest contextually relevant internal links with confidence scoring.',
    responsibilities: ['Link opportunity detection', 'Anchor text suggestion', 'Context matching', 'Link placement'],
    approvalGates: ['Link suggestions approval'],
  },
  {
    type: 'image_generator',
    name: 'Image Generator',
    subtitle: 'The Artist',
    icon: '🎨',
    color: 'text-pink-500',
    description: 'Creates SEO-optimized images with descriptive prompts, alt text, and proper placement within articles.',
    responsibilities: ['Prompt engineering', 'Image generation', 'Alt text creation', 'Placement optimization'],
    approvalGates: ['Image concept approval'],
  },
  {
    type: 'rank_tracker',
    name: 'Rank Tracker',
    subtitle: 'The Monitor',
    icon: '📈',
    color: 'text-green-500',
    description: 'Monitors search rankings for target keywords with historical tracking and competitor comparison.',
    responsibilities: ['Rank checking', 'Historical tracking', 'Competitor monitoring', 'Trend analysis'],
    approvalGates: [],
  },
  {
    type: 'analytics_agent',
    name: 'Analytics Agent',
    subtitle: 'The Analyst',
    icon: '📉',
    color: 'text-violet-500',
    description: 'Analyzes traffic patterns, user behavior, and content performance metrics.',
    responsibilities: ['Traffic analysis', 'Behavior insights', 'Performance correlation', 'Conversion tracking'],
    approvalGates: [],
  },
  {
    type: 'content_optimizer',
    name: 'Content Optimizer',
    subtitle: 'The Refiner',
    icon: '⚡',
    color: 'text-yellow-500',
    description: 'Monitors published content for optimization opportunities based on ranking and traffic changes.',
    responsibilities: ['Content monitoring', 'Ranking drop detection', 'Optimization suggestions', 'Refresh recommendations'],
    approvalGates: ['Optimization approval'],
  },
  {
    type: 'indexing_predictor',
    name: 'Indexing Predictor',
    subtitle: 'The Oracle',
    icon: '🔮',
    color: 'text-fuchsia-500',
    description: 'Predicts indexing likelihood and provides actionable advice to improve crawlability and indexation.',
    responsibilities: ['Indexing prediction', 'Crawlability analysis', 'Submission recommendations', 'Technical SEO checks'],
    approvalGates: [],
  },
  {
    type: 'link_validator',
    name: 'Link Validator',
    subtitle: 'The Auditor',
    icon: '🔍',
    color: 'text-rose-500',
    description: 'Validates all internal and external links for correctness, authority, and relevance.',
    responsibilities: ['Link validation', 'Broken link detection', 'Authority verification', 'Redirect checking'],
    approvalGates: [],
  },
  {
    type: 'report_generator',
    name: 'Report Generator',
    subtitle: 'The Chronicler',
    icon: '📄',
    color: 'text-slate-500',
    description: 'Generates comprehensive session reports with all findings, decisions, and deliverables for export.',
    responsibilities: ['Report compilation', 'Export generation', 'Metric aggregation', 'Recommendation summary'],
    approvalGates: [],
  },
];
