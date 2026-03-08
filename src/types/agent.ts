// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SEO Agent War Room — Complete Type System (Architecture-Aligned)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Legacy compat
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CORE ENUMS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export enum AgentId {
  ORCHESTRATOR = 'orchestrator',
  CRAWLER = 'crawler',
  KEYWORD = 'keyword',
  SERP = 'serp',
  STRATEGY = 'strategy',
  WRITER = 'writer',
  IMAGE = 'image',
  LINK_BUILDER = 'link_builder',
  RANK_TRACKER = 'rank_tracker',
  ANALYTICS = 'analytics',
  OPTIMIZER = 'optimizer',
  INDEXER = 'indexer',
  VALIDATOR = 'validator',
}

export enum AgentStatusEnum {
  IDLE = 'idle',
  WORKING = 'working',
  WAITING_INPUT = 'waiting_input',
  WAITING_APPROVAL = 'waiting_approval',
  COMPLETED = 'completed',
  ERROR = 'error',
  MONITORING = 'monitoring',
  PAUSED = 'paused',
  CRASHED = 'crashed',
}

export type AgentStatus = 'idle' | 'working' | 'waiting_input' | 'waiting_approval' | 'completed' | 'error' | 'monitoring' | 'paused' | 'crashed';

export enum PhaseStatus {
  QUEUED = 'queued',
  READY = 'ready',
  RUNNING = 'running',
  AWAITING_APPROVAL = 'awaiting_approval',
  APPROVED = 'approved',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

export enum MessageType {
  TASK_ASSIGN = 'task_assign',
  TASK_COMPLETE = 'task_complete',
  DATA_HANDOFF = 'data_handoff',
  STATUS_UPDATE = 'status_update',
  HEARTBEAT = 'heartbeat',
  APPROVAL_REQUEST = 'approval_request',
  APPROVAL_RESPONSE = 'approval_response',
  LOG_ENTRY = 'log_entry',
  ERROR = 'error',
  INTERVENTION = 'intervention',
  REPORT_READY = 'report_ready',
  AGENT_CRASH = 'agent_crash',
  AGENT_RECOVER = 'agent_recover',
  STREAM_UPDATE = 'stream_update',
}

export enum ApprovalStatusEnum {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  MODIFIED = 'modified',
  TIMED_OUT = 'timed_out',
}

export enum StreamEventType {
  AGENT_STATUS = 'agent_status',
  PHASE_UPDATE = 'phase_update',
  LOG_ENTRY = 'log_entry',
  DATA_UPDATE = 'data_update',
  APPROVAL_REQUEST = 'approval_request',
  APPROVAL_RESOLVED = 'approval_resolved',
  HEARTBEAT = 'heartbeat',
  PROGRESS = 'progress',
  REPORT = 'report',
  COMMUNICATION = 'communication',
  WRITING_STREAM = 'writing_stream',
  IMAGE_PROGRESS = 'image_progress',
  KEYWORD_DISCOVERED = 'keyword_discovered',
  PAGE_CRAWLED = 'page_crawled',
  RANK_CHECKED = 'rank_checked',
  WORKFLOW_COMPLETE = 'workflow_complete',
  ERROR = 'error',
  INTERVENTION_ACK = 'intervention_ack',
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MESSAGE BUS TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface BusMessage {
  id: string;
  type: MessageType;
  from: AgentId | 'system' | 'user';
  to: AgentId | 'broadcast' | 'orchestrator';
  timestamp: number;
  payload: any;
  correlationId?: string;
  priority?: number;
}

export interface HeartbeatPayload {
  agentId: AgentId;
  status: AgentStatus;
  currentTask: string | null;
  progress: number;
  memoryUsage: number;
  uptime: number;
  lastActivity: number;
  queueDepth: number;
  errorCount: number;
}

export interface TaskAssignment {
  taskId: string;
  phaseId: string;
  description: string;
  inputData: any;
  config: Record<string, any>;
  priority: number;
  deadline?: number;
}

export interface TaskCompletion {
  taskId: string;
  phaseId: string;
  success: boolean;
  outputData: any;
  duration: number;
  logs: LogEntry[];
  report: AgentReport | null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STATE STORE TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface MissionState {
  id: string;
  url: string;
  goals: string;
  status: 'initializing' | 'running' | 'paused' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  currentPhaseId: string | null;
  completedPhases: string[];
  totalProgress: number;
}

export interface AgentState {
  id: AgentId;
  name: string;
  codename: string;
  icon: string;
  status: AgentStatus;
  currentTask: string | null;
  progress: number;
  logs: LogEntry[];
  lastHeartbeat: number;
  heartbeatInterval: number;
  consecutiveMisses: number;
  startTime: number;
  tasksCompleted: number;
  tasksErrored: number;
  dataProduced: Record<string, any>;
  report: AgentReport | null;
}

export interface PhaseState {
  id: string;
  name: string;
  description: string;
  assignedAgent: AgentId;
  status: PhaseStatus;
  dependencies: string[];
  approvalRequired: boolean;
  approvalId?: string;
  progress: number;
  startTime?: number;
  endTime?: number;
  estimatedDuration: string;
  priority: number;
  inputData?: any;
  outputData?: any;
  logs: LogEntry[];
}

export interface DataStore {
  crawlData: CrawlResult | null;
  keywords: KeywordMetric[];
  keywordClusters: KeywordCluster[];
  serpResults: SerpResult[];
  contentStrategy: ContentStrategy | null;
  articles: GeneratedArticle[];
  images: GeneratedImage[];
  linkSuggestions: LinkSuggestion[];
  rankingData: RankingSnapshot[];
  analyticsData: AnalyticsSnapshot | null;
  optimizationAudits: OptimizationAudit[];
}

export interface CommunicationLog {
  messages: BusMessage[];
  maxSize: number;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// APPROVAL TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ApprovalRequest {
  id: string;
  agentId: AgentId;
  phaseId: string;
  type: string;
  title: string;
  description: string;
  workCompleted: string;
  data: any;
  options: ApprovalOption[];
  status: ApprovalStatusEnum;
  createdAt: number;
  resolvedAt?: number;
  resolution?: any;
  timeoutMs: number;
  blocking: boolean;
  blockedAgents: AgentId[];
}

export interface ApprovalOption {
  id: string;
  label: string;
  description: string;
  type: 'approve' | 'reject' | 'modify' | 'request_info';
  requiresInput: boolean;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LOGGING & REPORTING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface LogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug' | 'action' | 'decision';
  agentId: AgentId;
  message: string;
  data?: any;
  category?: string;
}

export interface AgentReport {
  agentId: AgentId;
  agentName: string;
  missionId: string;
  generatedAt: number;
  duration: number;
  tasksExecuted: { name: string; status: string; duration: number; output: string }[];
  dataSourcesAccessed: { source: string; queries: string[]; responseTimes: number[] }[];
  decisionsLog: { decision: string; reasoning: string; timestamp: number }[];
  errorsEncountered: { error: string; resolution: string; timestamp: number }[];
  outputsSummary: string;
  recommendations: string[];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DOMAIN MODELS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface CrawlResult {
  pages: CrawledPage[];
  siteStructure: SiteStructure;
  toneAnalysis: ToneAnalysis;
  technicalIssues: TechnicalIssue[];
  contentThemes: ContentTheme[];
  crawlSummary: string;
}

export interface CrawledPage {
  url: string;
  title: string;
  type: string;
  contentTheme: string;
  wordCount: number;
  hasImages: boolean;
  hasMeta: boolean;
  issues: string[];
}

export interface SiteStructure {
  totalPages: number;
  pageTypes: { type: string; count: number }[];
  depth: number;
  orphanPages: string[];
}

export interface ToneAnalysis {
  primaryTone: string;
  secondaryTone: string;
  formality: string;
  brandVoiceDescription: string;
  examplePhrases: string[];
}

export interface TechnicalIssue {
  issue: string;
  severity: 'Critical' | 'Warning' | 'Info';
  affectedPages: string[];
  recommendation: string;
}

export interface ContentTheme {
  theme: string;
  frequency: number;
  relatedKeywords: string[];
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

export interface KeywordCluster {
  name: string;
  keywords: string[];
  searchIntent: string;
  contentAngle: string;
  priority: number;
}

export interface CompetitorData {
  domain: string;
  rank: number;
  estimatedTraffic: number;
  domainAuthority: number;
  rankingChange: number;
  contentWeakness?: string;
}

export interface SerpResult {
  keyword: string;
  aiOverview: string;
  aiOverviewFormat?: string;
  aiOverviewSources?: string[];
  peopleAlsoAsk: string[];
  competitors: CompetitorData[];
  contentGaps?: {
    tableStakes: string[];
    differentiators: string[];
    blueOcean: string[];
    uniqueAngles: string[];
  };
  opportunityScore: number;
  strategicInsight: string;
  group: string;
  timestamp: number;
}

export interface ContentStrategy {
  clusters: { name: string; keywords: string[]; intent: string; contentAngle: string; priority: number }[];
  pillarContent: { title: string; targetKeyword: string; supportingArticles: string[]; estimatedImpact: string }[];
  calendar: { week: number; topic: string; type: string; bestDay: string; targetKeyword: string; reasoning: string }[];
  internalLinking: { sourceTopic: string; targetTopic: string; anchorText: string; linkStrength: string }[];
  internalLinkingMap: { from: string; to: string; anchorText: string; priority: number }[];
  competitivePositioning: string;
  contentGapPriorities: { gap: string; urgency: string; potentialTraffic: number }[];
  summary: string;
  strategicRationale: string;
}

export interface ArticleSection {
  heading: string;
  headingLevel?: string;
  content: string;
  description?: string;
  type: 'text' | 'list' | 'table' | 'chart' | 'image';
  visualType?: 'none' | 'chart' | 'table' | 'image';
  chartData?: { name: string; value: number }[];
  tableData?: { headers: string[]; rows: string[][] };
  imagePrompt?: string;
  imageAltText?: string;
  imageUrl?: string;
  targetWordCount?: number;
  paaQuestionsAddressed?: string[];
  keyPoints?: string[];
  wordCount?: number;
  externalLinks?: { url: string; anchorText: string; reason: string }[];
}

export interface LinkSuggestion {
  id: string;
  anchorText: string;
  targetUrl: string;
  context: string;
  type: 'internal' | 'external';
  confidence: number;
  reasoning?: string;
  approved?: boolean;
}

export interface LinkValidationResult {
  totalLinks: number;
  validLinks: { url: string; anchor: string; type: string }[];
  brokenLinks: { url: string; anchor: string; issue: string; replacement: string }[];
  summary: string;
}

export interface GeneratedArticle {
  id: string;
  keyword: string;
  title: string;
  metaDescription?: string;
  status: 'queued' | 'researching' | 'outlining' | 'outline_approval' | 'drafting' | 'optimizing' | 'reviewing_links' | 'link_approval' | 'validating' | 'final_approval' | 'completed' | 'failed' | 'indexed';
  progress: number;
  logs: LogEntry[];
  content: string;
  mdContent: string;
  featuredImage?: string;
  featuredImageAlt?: string;
  sections: ArticleSection[];
  wordCount: number;
  targetWordCount: number;
  aiOverviewOptimized: boolean;
  aiOverviewBlock?: string;
  schemaMarkup?: string;
  linkSuggestions?: LinkSuggestion[];
  linksApplied?: boolean;
  externalLinks?: { url: string; anchorText: string; reason: string }[];
  paaQuestionsAnswered?: string[];
  uniqueAngle?: string;
  linkValidation?: LinkValidationResult;
}

export interface GeneratedImage {
  id: string;
  articleId: string;
  sectionIndex: number;
  prompt: string;
  url: string;
  altText?: string;
  caption?: string;
  aspectRatio: string;
  createdAt: number;
  placement?: string;
  type: 'featured' | 'content';
}

export interface RankingSnapshot {
  timestamp: number;
  domain: string;
  results: { keyword: string; rank: number; url: string | null; found: boolean }[];
  summary: string;
}

export interface AnalyticsSnapshot {
  timestamp: number;
  metrics: AnalyticsMetric[];
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

export interface OptimizationAudit {
  timestamp: number;
  articleId: string;
  keyword: string;
  overallScore: number;
  issues: { type: string; severity: string; description: string; recommendation: string }[];
  contentFreshness: string;
  summary: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTERVENTION TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface InterventionCommand {
  type: 'pause' | 'resume' | 'redirect' | 'instruct' | 'explain' | 'redo' | 'override';
  targetAgent: AgentId;
  payload?: any;
  message?: string;
  timestamp: number;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONFIG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface MissionConfig {
  approvalTimeoutMs: number;
  heartbeatIntervalMs: number;
  heartbeatMissThreshold: number;
  maxRetries: number;
  parallelArticles: number;
  minWordCount: number;
  minPAAQuestions: number;
  minImages: number;
  enableAutoApprove: boolean;
  autoApprovePhases: string[];
  rankCheckIntervalMs: number;
  optimizationCheckIntervalMs: number;
}

export const DEFAULT_CONFIG: MissionConfig = {
  approvalTimeoutMs: 30 * 60 * 1000,
  heartbeatIntervalMs: 5000,
  heartbeatMissThreshold: 3,
  maxRetries: 3,
  parallelArticles: 2,
  minWordCount: 3000,
  minPAAQuestions: 7,
  minImages: 5,
  enableAutoApprove: false,
  autoApprovePhases: [],
  rankCheckIntervalMs: 60 * 60 * 1000,
  optimizationCheckIntervalMs: 24 * 60 * 60 * 1000,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WAR ROOM STATE (Frontend)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface WarRoomState {
  mission: MissionState | null;
  agents: AgentState[];
  phases: PhaseState[];
  data: DataStore;
  approvals: ApprovalRequest[];
  communications: BusMessage[];
  config: MissionConfig;
  health: { overallStatus: string; agents: { agentId: AgentId; status: string; lastHeartbeat: number; consecutiveMisses: number }[] };
  connected: boolean;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AGENT DEFINITIONS (13 agents)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface AgentDefinition {
  id: AgentId;
  name: string;
  codename: string;
  icon: string;
  description: string;
  responsibilities: string[];
  heartbeatInterval: number;
}

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  { id: AgentId.ORCHESTRATOR, name: 'Orchestrator', codename: 'THE CONDUCTOR', icon: '🎯', description: 'Coordinates the agent team, manages workflow DAG, resolves conflicts.', responsibilities: ['Workflow planning', 'Task assignment', 'Conflict resolution', 'Decision logging'], heartbeatInterval: 1200 },
  { id: AgentId.CRAWLER, name: 'Website Crawler', codename: 'THE SCOUT', icon: '🕷️', description: 'Discovers and maps all pages, extracts content themes, analyzes tone.', responsibilities: ['Page discovery', 'Content extraction', 'Tone analysis', 'Technical issue detection'], heartbeatInterval: 1000 },
  { id: AgentId.KEYWORD, name: 'Keyword Researcher', codename: 'THE STRATEGIST', icon: '🔑', description: 'Discovers high-value keyword opportunities with volume, difficulty, intent.', responsibilities: ['Keyword discovery', 'Cluster grouping', 'Intent classification'], heartbeatInterval: 800 },
  { id: AgentId.SERP, name: 'SERP Analyst', codename: 'THE RESEARCHER', icon: '📊', description: 'Examines SERPs for AI Overviews, PAA questions, competitor data.', responsibilities: ['SERP analysis', 'AI Overview capture', 'PAA extraction', 'Opportunity scoring'], heartbeatInterval: 900 },
  { id: AgentId.STRATEGY, name: 'Content Strategist', codename: 'THE PLANNER', icon: '📋', description: 'Synthesizes intelligence into topic clusters, pillar content, calendars.', responsibilities: ['Topic clustering', 'Pillar content planning', 'Calendar generation'], heartbeatInterval: 1100 },
  { id: AgentId.WRITER, name: 'Article Writer', codename: 'THE WORDSMITH', icon: '✍️', description: 'Produces 3,000+ word SEO-optimized articles section by section.', responsibilities: ['Section writing', 'SEO optimization', 'PAA integration'], heartbeatInterval: 1000 },
  { id: AgentId.IMAGE, name: 'Image Generator', codename: 'THE ARTIST', icon: '🎨', description: 'Creates SEO-optimized images with descriptive prompts and alt text.', responsibilities: ['Prompt engineering', 'Image generation', 'Alt text creation'], heartbeatInterval: 700 },
  { id: AgentId.LINK_BUILDER, name: 'Link Builder', codename: 'THE CONNECTOR', icon: '🔗', description: 'Suggests contextually relevant internal links with confidence scoring.', responsibilities: ['Link opportunity detection', 'Anchor text suggestion', 'Context matching'], heartbeatInterval: 900 },
  { id: AgentId.RANK_TRACKER, name: 'Rank Tracker', codename: 'THE MONITOR', icon: '📈', description: 'Monitors search rankings for target keywords with historical tracking.', responsibilities: ['Rank checking', 'Historical tracking', 'Trend analysis'], heartbeatInterval: 5000 },
  { id: AgentId.ANALYTICS, name: 'Analytics Agent', codename: 'THE ANALYST', icon: '📉', description: 'Analyzes traffic patterns, user behavior, and performance metrics.', responsibilities: ['Traffic analysis', 'Behavior insights', 'Performance correlation'], heartbeatInterval: 10000 },
  { id: AgentId.OPTIMIZER, name: 'Content Optimizer', codename: 'THE REFINER', icon: '⚡', description: 'Monitors published content for optimization opportunities.', responsibilities: ['Content monitoring', 'Ranking drop detection', 'Optimization suggestions'], heartbeatInterval: 10000 },
  { id: AgentId.INDEXER, name: 'Indexing Predictor', codename: 'THE ORACLE', icon: '🔮', description: 'Predicts indexing likelihood and provides crawlability advice.', responsibilities: ['Indexing prediction', 'Crawlability analysis', 'Technical SEO checks'], heartbeatInterval: 5000 },
  { id: AgentId.VALIDATOR, name: 'Link Validator', codename: 'THE AUDITOR', icon: '🔍', description: 'Validates all internal and external links for correctness and authority.', responsibilities: ['Link validation', 'Broken link detection', 'Redirect checking'], heartbeatInterval: 1000 },
];

// Helper to get agent def
export function getAgentDef(id: AgentId): AgentDefinition {
  return AGENT_DEFINITIONS.find(d => d.id === id) || AGENT_DEFINITIONS[0];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DEFAULT PHASE DAG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const DEFAULT_PHASES: Omit<PhaseState, 'status' | 'progress' | 'logs'>[] = [
  { id: 'PHASE_CRAWL', name: 'Website Intelligence', description: 'Crawl and analyze site structure, content themes, brand voice, technical issues.', assignedAgent: AgentId.CRAWLER, dependencies: [], approvalRequired: true, estimatedDuration: '2-5 min', priority: 1 },
  { id: 'PHASE_KEYWORDS', name: 'Keyword Research', description: 'Discover 30-50 high-value keywords, group into thematic clusters.', assignedAgent: AgentId.KEYWORD, dependencies: ['PHASE_CRAWL'], approvalRequired: true, estimatedDuration: '3-6 min', priority: 2 },
  { id: 'PHASE_SERP', name: 'SERP Analysis', description: 'Deep SERP analysis: AI Overviews, PAA, competitors, opportunity scores.', assignedAgent: AgentId.SERP, dependencies: ['PHASE_KEYWORDS'], approvalRequired: true, estimatedDuration: '5-15 min', priority: 3 },
  { id: 'PHASE_STRATEGY', name: 'Content Strategy', description: 'Topic clusters, pillar content, calendar, internal linking map.', assignedAgent: AgentId.STRATEGY, dependencies: ['PHASE_SERP'], approvalRequired: true, estimatedDuration: '3-5 min', priority: 4 },
  { id: 'PHASE_WRITE', name: 'Article Generation', description: 'Generate 3000+ word articles with images, links, PAA, AI Overview opt.', assignedAgent: AgentId.WRITER, dependencies: ['PHASE_STRATEGY'], approvalRequired: true, estimatedDuration: '15-45 min', priority: 5 },
  { id: 'PHASE_MONITOR', name: 'Monitoring Setup', description: 'Initialize rank tracking, analytics, and content optimization monitoring.', assignedAgent: AgentId.RANK_TRACKER, dependencies: ['PHASE_WRITE'], approvalRequired: false, estimatedDuration: '1-2 min', priority: 6 },
];

// Legacy compat types
export type AgentType = AgentId;
export type OrchestratorPhase = string;

export interface InterAgentMessage extends BusMessage {}

export interface OrchestratorDecision {
  id: string;
  timestamp: number;
  description: string;
  reasoning: string;
  agentsInvolved: AgentId[];
}

export interface WorkflowStep extends PhaseState {}

export interface AgentWorkspace {
  agent: AgentState;
  expanded: boolean;
  deepDive: boolean;
}

// Compat: old AgentTask shape -> AgentState
export type AgentTask = AgentState;

export interface AgentLogEntry extends LogEntry {}

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
