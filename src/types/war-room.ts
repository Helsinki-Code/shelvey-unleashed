// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SEO WAR ROOM — TYPE SYSTEM (adapted from architecture)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export enum AgentId {
  ORCHESTRATOR = "orchestrator",
  CRAWLER = "crawler",
  KEYWORD = "keyword",
  SERP = "serp",
  STRATEGY = "strategy",
  WRITER = "writer",
  IMAGE = "image",
  LINK_BUILDER = "link_builder",
  RANK_TRACKER = "rank_tracker",
  ANALYTICS = "analytics",
  OPTIMIZER = "optimizer",
  INDEXER = "indexer",
  VALIDATOR = "validator",
}

export enum AgentStatus {
  IDLE = "idle",
  WORKING = "working",
  WAITING_INPUT = "waiting_input",
  WAITING_APPROVAL = "waiting_approval",
  COMPLETED = "completed",
  ERROR = "error",
  MONITORING = "monitoring",
  PAUSED = "paused",
  CRASHED = "crashed",
}

export enum PhaseStatus {
  QUEUED = "queued",
  READY = "ready",
  RUNNING = "running",
  AWAITING_APPROVAL = "awaiting_approval",
  APPROVED = "approved",
  COMPLETED = "completed",
  FAILED = "failed",
  SKIPPED = "skipped",
}

export enum MessageType {
  TASK_ASSIGN = "task_assign",
  TASK_COMPLETE = "task_complete",
  DATA_HANDOFF = "data_handoff",
  STATUS_UPDATE = "status_update",
  HEARTBEAT = "heartbeat",
  APPROVAL_REQUEST = "approval_request",
  APPROVAL_RESPONSE = "approval_response",
  LOG_ENTRY = "log_entry",
  ERROR = "error",
  INTERVENTION = "intervention",
  REPORT_READY = "report_ready",
  AGENT_CRASH = "agent_crash",
  AGENT_RECOVER = "agent_recover",
  STREAM_UPDATE = "stream_update",
}

export interface AgentConfig {
  id: AgentId;
  name: string;
  codename: string;
  description: string;
  heartbeatInterval: number;
  icon: string;
  color: string;
}

export const AGENT_CONFIGS: AgentConfig[] = [
  { id: AgentId.ORCHESTRATOR, name: "Orchestrator", codename: "THE CONDUCTOR", description: "Plans workflow, monitors all agents, manages DAG execution", heartbeatInterval: 1200, icon: "🎯", color: "hsl(var(--primary))" },
  { id: AgentId.CRAWLER, name: "Site Crawler", codename: "THE SCOUT", description: "Maps site structure, extracts content themes, identifies issues", heartbeatInterval: 1000, icon: "🕷️", color: "hsl(var(--chart-1))" },
  { id: AgentId.KEYWORD, name: "Keyword Researcher", codename: "THE MINER", description: "Discovers high-value keywords, groups into clusters", heartbeatInterval: 800, icon: "🔑", color: "hsl(var(--chart-2))" },
  { id: AgentId.SERP, name: "SERP Analyst", codename: "THE STRATEGIST", description: "Deep SERP analysis, PAA extraction, competitor intel", heartbeatInterval: 900, icon: "📊", color: "hsl(var(--chart-3))" },
  { id: AgentId.STRATEGY, name: "Content Strategist", codename: "THE ARCHITECT", description: "Synthesizes intelligence into content strategy & calendar", heartbeatInterval: 1100, icon: "🏗️", color: "hsl(var(--chart-4))" },
  { id: AgentId.WRITER, name: "Article Writer", codename: "THE WRITER", description: "Generates 3000+ word articles with AI Overview optimization", heartbeatInterval: 1000, icon: "✍️", color: "hsl(var(--chart-5))" },
  { id: AgentId.IMAGE, name: "Image Generator", codename: "THE ARTIST", description: "Creates featured images and content visuals", heartbeatInterval: 700, icon: "🎨", color: "hsl(var(--accent))" },
  { id: AgentId.LINK_BUILDER, name: "Link Builder", codename: "THE CONNECTOR", description: "Internal/external link suggestions and validation", heartbeatInterval: 900, icon: "🔗", color: "hsl(var(--cyber-purple))" },
  { id: AgentId.RANK_TRACKER, name: "Rank Tracker", codename: "THE MONITOR", description: "Continuous rank monitoring and alerting", heartbeatInterval: 5000, icon: "📈", color: "hsl(var(--cyber-green))" },
  { id: AgentId.ANALYTICS, name: "Analytics Agent", codename: "THE ANALYST", description: "Traffic analysis, engagement metrics, insights", heartbeatInterval: 10000, icon: "📉", color: "hsl(var(--cyber-cyan))" },
  { id: AgentId.OPTIMIZER, name: "SEO Optimizer", codename: "THE TUNER", description: "Content freshness audits and optimization passes", heartbeatInterval: 10000, icon: "⚡", color: "hsl(var(--destructive))" },
  { id: AgentId.INDEXER, name: "Indexation Agent", codename: "THE HERALD", description: "Submits to Google, monitors crawl status", heartbeatInterval: 5000, icon: "🗂️", color: "hsl(var(--muted-foreground))" },
  { id: AgentId.VALIDATOR, name: "QA Validator", codename: "THE JUDGE", description: "Link validation, content quality checks, schema verification", heartbeatInterval: 1000, icon: "✅", color: "hsl(var(--primary))" },
];

export interface MissionState {
  id: string;
  url: string;
  goals: string;
  status: "initializing" | "running" | "paused" | "completed" | "failed";
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
  status: AgentStatus;
  currentTask: string | null;
  progress: number;
  lastHeartbeat: number;
  consecutiveMisses: number;
  tasksCompleted: number;
  tasksErrored: number;
  logs: LogEntry[];
  health: "healthy" | "degraded" | "critical" | "dead";
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
}

export interface LogEntry {
  timestamp: number;
  level: "info" | "warn" | "error" | "debug" | "action" | "decision";
  agentId: AgentId;
  message: string;
  data?: any;
  category?: string;
}

export interface BusMessage {
  id: string;
  type: MessageType;
  from: string;
  to: string;
  timestamp: number;
  payload: any;
}

export interface ApprovalRequest {
  id: string;
  agentId: AgentId;
  phaseId: string;
  type: string;
  title: string;
  description: string;
  workCompleted: string;
  data: any;
  status: "pending" | "approved" | "rejected" | "modified" | "timed_out";
  createdAt: number;
  blocking: boolean;
}

export interface KeywordMetric {
  keyword: string;
  volume: number;
  difficulty: number;
  cpc: number;
  intent: string;
  category?: string;
}

export interface SerpResult {
  keyword: string;
  aiOverview: string;
  peopleAlsoAsk: string[];
  competitors: { domain: string; rank: number; domainAuthority: number }[];
  opportunityScore: number;
  group: string;
}

export interface GeneratedArticle {
  id: string;
  keyword: string;
  title: string;
  status: string;
  progress: number;
  wordCount: number;
  targetWordCount: number;
  aiOverviewOptimized: boolean;
}

export const DEFAULT_PHASES: Omit<PhaseState, "status" | "progress" | "startTime" | "endTime">[] = [
  { id: "PHASE_CRAWL", name: "Website Intelligence", description: "Crawl and analyze the target site", assignedAgent: AgentId.CRAWLER, dependencies: [], approvalRequired: true, estimatedDuration: "2-5 min", priority: 1 },
  { id: "PHASE_KEYWORDS", name: "Keyword Research", description: "Discover and cluster high-value keywords", assignedAgent: AgentId.KEYWORD, dependencies: ["PHASE_CRAWL"], approvalRequired: true, estimatedDuration: "3-6 min", priority: 2 },
  { id: "PHASE_SERP", name: "SERP Analysis", description: "Deep SERP analysis, PAA extraction, competitor intel", assignedAgent: AgentId.SERP, dependencies: ["PHASE_KEYWORDS"], approvalRequired: true, estimatedDuration: "5-15 min", priority: 3 },
  { id: "PHASE_STRATEGY", name: "Content Strategy", description: "Synthesize intelligence into content plan", assignedAgent: AgentId.STRATEGY, dependencies: ["PHASE_SERP"], approvalRequired: true, estimatedDuration: "3-5 min", priority: 4 },
  { id: "PHASE_WRITE", name: "Article Generation", description: "Generate 3000+ word articles with images", assignedAgent: AgentId.WRITER, dependencies: ["PHASE_STRATEGY"], approvalRequired: true, estimatedDuration: "15-45 min", priority: 5 },
  { id: "PHASE_MONITOR", name: "Monitoring Setup", description: "Initialize rank tracking and analytics", assignedAgent: AgentId.RANK_TRACKER, dependencies: ["PHASE_WRITE"], approvalRequired: false, estimatedDuration: "1-2 min", priority: 6 },
];
