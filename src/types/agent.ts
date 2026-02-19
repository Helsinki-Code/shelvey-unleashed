// Agent Types for SEO Agent Team - Production Types

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
  | 'researcher'
  | 'analyst'
  | 'writer'
  | 'strategist'
  | 'designer'
  | 'link_builder'
  | 'ga_analyst'
  | 'indexer';

export interface AgentTask {
  id: string;
  type: AgentType;
  name: string;
  status: 'idle' | 'working' | 'waiting' | 'completed' | 'error';
  message: string;
  progress: number;
  logs: string[];
  startTime: number;
  endTime?: number;
  resultPayload?: any;
  resultType?: 'json' | 'csv' | 'md';
}

export interface KeywordMetric {
  keyword: string;
  volume: number;
  difficulty: number;
  cpc: number;
  intent: 'Informational' | 'Transactional' | 'Commercial' | 'Navigational';
  category?: string;
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
  status: 'queued' | 'researching' | 'drafting' | 'optimizing' | 'reviewing_links' | 'completed' | 'failed' | 'indexed';
  progress: number;
  logs: string[];
  content: string;
  mdContent: string;
  featuredImage?: string;
  sections: ArticleSection[];
  wordCount: number;
  aiOverviewOptimized: boolean;
  linkSuggestions?: LinkSuggestion[];
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
  calendar: { week: number; topic: string; type: string; bestDay: string }[];
  internalLinking: { sourceTopic: string; targetTopic: string; anchorText: string }[];
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
  web?: {
    uri: string;
    title: string;
  };
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
  type: 'keyword_list' | 'strategy' | 'outline' | 'article' | 'links' | 'general';
  title: string;
  description: string;
  options: ApprovalOption[];
  createdAt: number;
  priority: 'low' | 'medium' | 'high';
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
  type: 'task_assignment' | 'completion_report' | 'data_handoff' | 'question' | 'status_update';
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

export interface WarRoomState {
  isActive: boolean;
  currentPhase: 'idle' | 'crawling' | 'keyword_research' | 'serp_analysis' | 'strategy' | 'writing' | 'monitoring';
  orchestratorTask: AgentTask | null;
  agentTasks: AgentTask[];
  approvals: ApprovalRequest[];
  messages: InterAgentMessage[];
  workflow: WorkflowStep[];
  articles: GeneratedArticle[];
  overallProgress: number;
}

export interface AgentWorkspace {
  agent: AgentTask;
  expanded: boolean;
  deepDive: boolean;
}
