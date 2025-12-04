// Real MCP Servers integrated with ShelVey agents
export interface MCPServer {
  id: string;
  name: string;
  description: string;
  category: 'database' | 'communication' | 'development' | 'analytics' | 'automation' | 'ai' | 'storage' | 'search';
  status: 'connected' | 'syncing' | 'offline';
  icon: string;
  url?: string;
  latency?: number;
  requestsToday?: number;
}

export const mcpServers: MCPServer[] = [
  // Database & Storage
  { id: 'mcp-postgres', name: 'PostgreSQL', description: 'Database management and SQL queries', category: 'database', status: 'connected', icon: '🐘', latency: 12, requestsToday: 1847 },
  { id: 'mcp-supabase', name: 'Supabase', description: 'Real-time database and auth', category: 'database', status: 'connected', icon: '⚡', latency: 8, requestsToday: 3421 },
  { id: 'mcp-mongodb', name: 'MongoDB', description: 'Document database operations', category: 'database', status: 'connected', icon: '🍃', latency: 15, requestsToday: 2156 },
  { id: 'mcp-elasticsearch', name: 'Elasticsearch', description: 'Search and analytics engine', category: 'search', status: 'syncing', icon: '🔍', latency: 23, requestsToday: 892 },
  { id: 'mcp-qdrant', name: 'Qdrant', description: 'Vector search database', category: 'database', status: 'connected', icon: '📐', latency: 18, requestsToday: 1234 },
  { id: 'mcp-clickhouse', name: 'ClickHouse', description: 'Analytics database', category: 'analytics', status: 'connected', icon: '📊', latency: 11, requestsToday: 567 },
  
  // Communication & CRM
  { id: 'mcp-gmail', name: 'Gmail', description: 'Email management and automation', category: 'communication', status: 'connected', icon: '📧', latency: 45, requestsToday: 4521 },
  { id: 'mcp-hubspot', name: 'HubSpot', description: 'CRM data and automation', category: 'communication', status: 'connected', icon: '🧡', latency: 67, requestsToday: 1893 },
  { id: 'mcp-mattermost', name: 'Mattermost', description: 'Team communication bridge', category: 'communication', status: 'connected', icon: '💬', latency: 34, requestsToday: 723 },
  
  // Development & DevOps
  { id: 'mcp-github', name: 'GitHub', description: 'Repository and code management', category: 'development', status: 'connected', icon: '🐙', latency: 28, requestsToday: 2891 },
  { id: 'mcp-gitlab', name: 'GitLab', description: 'DevOps and CI/CD', category: 'development', status: 'connected', icon: '🦊', latency: 31, requestsToday: 1456 },
  { id: 'mcp-circleci', name: 'CircleCI', description: 'Build failure analysis', category: 'development', status: 'syncing', icon: '⚙️', latency: 52, requestsToday: 234 },
  { id: 'mcp-kubernetes', name: 'Kubernetes', description: 'Cluster management', category: 'development', status: 'connected', icon: '☸️', latency: 19, requestsToday: 876 },
  { id: 'mcp-semgrep', name: 'Semgrep', description: 'Static code analysis', category: 'development', status: 'connected', icon: '🔐', latency: 43, requestsToday: 345 },
  
  // Productivity & Docs
  { id: 'mcp-notion', name: 'Notion', description: 'Workspace and documentation', category: 'storage', status: 'connected', icon: '📝', latency: 38, requestsToday: 1567 },
  { id: 'mcp-airtable', name: 'Airtable', description: 'Database and spreadsheets', category: 'storage', status: 'connected', icon: '📋', latency: 42, requestsToday: 678 },
  { id: 'mcp-clickup', name: 'ClickUp', description: 'Project management', category: 'automation', status: 'connected', icon: '✅', latency: 56, requestsToday: 432 },
  { id: 'mcp-figma', name: 'Figma', description: 'Design file access', category: 'development', status: 'connected', icon: '🎨', latency: 61, requestsToday: 289 },
  { id: 'mcp-excel', name: 'Excel', description: 'Spreadsheet operations', category: 'analytics', status: 'connected', icon: '📊', latency: 35, requestsToday: 1123 },
  
  // AI & Search
  { id: 'mcp-perplexity', name: 'Perplexity', description: 'AI-powered research', category: 'ai', status: 'connected', icon: '🧠', latency: 89, requestsToday: 2341 },
  { id: 'mcp-gemini', name: 'Gemini', description: 'Google AI integration', category: 'ai', status: 'connected', icon: '✨', latency: 76, requestsToday: 1892 },
  { id: 'mcp-searxng', name: 'SearXNG', description: 'Privacy-focused search', category: 'search', status: 'connected', icon: '🔎', latency: 112, requestsToday: 456 },
  { id: 'mcp-mem0', name: 'Mem0', description: 'Persistent AI memory', category: 'ai', status: 'connected', icon: '💾', latency: 24, requestsToday: 3456 },
  
  // Payments & Analytics
  { id: 'mcp-stripe', name: 'Stripe', description: 'Payment processing', category: 'analytics', status: 'connected', icon: '💳', latency: 47, requestsToday: 892 },
  { id: 'mcp-datadog', name: 'Datadog', description: 'Monitoring and analytics', category: 'analytics', status: 'connected', icon: '🐕', latency: 33, requestsToday: 1234 },
  { id: 'mcp-metabase', name: 'Metabase', description: 'Business intelligence', category: 'analytics', status: 'syncing', icon: '📈', latency: 58, requestsToday: 567 },
];

export const categoryColors: Record<MCPServer['category'], { bg: string; text: string; border: string }> = {
  database: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  communication: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  development: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/30' },
  analytics: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  automation: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
  ai: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  storage: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  search: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/30' },
};

// Map agents to their connected MCP servers
export const agentMCPConnections: Record<string, string[]> = {
  'agent-1': ['mcp-perplexity', 'mcp-searxng', 'mcp-elasticsearch'],
  'agent-2': ['mcp-perplexity', 'mcp-datadog', 'mcp-metabase'],
  'agent-3': ['mcp-github', 'mcp-figma', 'mcp-notion'],
  'agent-4': ['mcp-github', 'mcp-gitlab', 'mcp-circleci'],
  'agent-5': ['mcp-semgrep', 'mcp-kubernetes', 'mcp-circleci'],
  'agent-6': ['mcp-figma', 'mcp-gemini', 'mcp-notion'],
  'agent-7': ['mcp-perplexity', 'mcp-gemini', 'mcp-notion'],
  'agent-8': ['mcp-figma', 'mcp-airtable', 'mcp-notion'],
  'agent-9': ['mcp-searxng', 'mcp-perplexity', 'mcp-elasticsearch'],
  'agent-10': ['mcp-hubspot', 'mcp-airtable', 'mcp-gmail'],
  'agent-11': ['mcp-stripe', 'mcp-metabase', 'mcp-hubspot'],
  'agent-12': ['mcp-hubspot', 'mcp-gmail', 'mcp-airtable'],
  'agent-13': ['mcp-hubspot', 'mcp-gmail', 'mcp-supabase'],
  'agent-14': ['mcp-hubspot', 'mcp-stripe', 'mcp-gmail'],
  'agent-15': ['mcp-mattermost', 'mcp-hubspot', 'mcp-notion'],
  'agent-16': ['mcp-gmail', 'mcp-hubspot', 'mcp-airtable'],
  'agent-17': ['mcp-clickup', 'mcp-notion', 'mcp-mattermost'],
  'agent-18': ['mcp-stripe', 'mcp-supabase', 'mcp-excel'],
  'agent-19': ['mcp-metabase', 'mcp-clickhouse', 'mcp-datadog'],
  'agent-20': ['mcp-searxng', 'mcp-elasticsearch', 'mcp-mongodb'],
  'agent-21': ['mcp-perplexity', 'mcp-notion', 'mcp-github'],
  'agent-22': ['mcp-perplexity', 'mcp-gemini', 'mcp-metabase'],
  'agent-23': ['mcp-hubspot', 'mcp-gmail', 'mcp-airtable'],
  'agent-24': ['mcp-clickup', 'mcp-hubspot', 'mcp-stripe'],
  'agent-25': ['mcp-stripe', 'mcp-metabase', 'mcp-perplexity'],
};
