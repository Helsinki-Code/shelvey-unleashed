export type AgentStatus = 'active' | 'processing' | 'meeting' | 'idle';
export type Division = 'market-intelligence' | 'product-development' | 'creative-brand' | 'marketing-growth' | 'sales-customer' | 'operations-analytics' | 'strategic-compliance' | 'special-operations';

export interface Agent {
  id: string;
  name: string;
  role: string;
  division: Division;
  status: AgentStatus;
  currentTask: string;
  tasksPerHour: number;
  successRate: number;
  icon: string;
}

export const agents: Agent[] = [
  // Market Intelligence Division
  { id: 'agent-1', name: 'Market Research Agent', role: 'Market Analyst', division: 'market-intelligence', status: 'active', currentTask: 'Analyzing Reddit sentiment for SaaS pain points', tasksPerHour: 45, successRate: 94.2, icon: '🔍' },
  { id: 'agent-2', name: 'Trend Prediction Agent', role: 'Trend Forecaster', division: 'market-intelligence', status: 'processing', currentTask: 'Processing Twitter data streams', tasksPerHour: 38, successRate: 91.5, icon: '📈' },
  
  // Product Development Division
  { id: 'agent-3', name: 'Product Architect Agent', role: 'System Designer', division: 'product-development', status: 'active', currentTask: 'Designing API architecture for new SaaS', tasksPerHour: 22, successRate: 97.8, icon: '🏗️' },
  { id: 'agent-4', name: 'Code Builder Agent', role: 'Full-Stack Developer', division: 'product-development', status: 'active', currentTask: 'Building React components via 21st Dev', tasksPerHour: 35, successRate: 96.1, icon: '💻' },
  { id: 'agent-5', name: 'QA Testing Agent', role: 'Quality Assurance', division: 'product-development', status: 'meeting', currentTask: 'Testing user flows with CUA', tasksPerHour: 52, successRate: 99.2, icon: '🧪' },
  
  // Creative & Brand Division
  { id: 'agent-6', name: 'Brand Identity Agent', role: 'Brand Strategist', division: 'creative-brand', status: 'active', currentTask: 'Generating logo concepts via Fal AI', tasksPerHour: 28, successRate: 88.9, icon: '🎨' },
  { id: 'agent-7', name: 'Content Creator Agent', role: 'Content Writer', division: 'creative-brand', status: 'processing', currentTask: 'Writing SEO-optimized blog posts', tasksPerHour: 42, successRate: 92.3, icon: '✍️' },
  { id: 'agent-8', name: 'Visual Design Agent', role: 'Graphic Designer', division: 'creative-brand', status: 'active', currentTask: 'Creating social media graphics via Canva', tasksPerHour: 31, successRate: 90.7, icon: '🖼️' },
  
  // Marketing & Growth Division
  { id: 'agent-9', name: 'SEO Optimization Agent', role: 'SEO Specialist', division: 'marketing-growth', status: 'active', currentTask: 'Optimizing meta tags for 50 pages', tasksPerHour: 67, successRate: 95.4, icon: '🎯' },
  { id: 'agent-10', name: 'Social Media Manager Agent', role: 'Social Manager', division: 'marketing-growth', status: 'active', currentTask: 'Scheduling LinkedIn posts', tasksPerHour: 48, successRate: 93.1, icon: '📱' },
  { id: 'agent-11', name: 'Paid Ads Specialist Agent', role: 'Ads Manager', division: 'marketing-growth', status: 'processing', currentTask: 'A/B testing Facebook ad creatives', tasksPerHour: 29, successRate: 87.6, icon: '💰' },
  { id: 'agent-12', name: 'Influencer Outreach Agent', role: 'Partnerships Lead', division: 'marketing-growth', status: 'idle', currentTask: 'Awaiting new influencer targets', tasksPerHour: 18, successRate: 82.4, icon: '🤝' },
  
  // Sales & Customer Division
  { id: 'agent-13', name: 'Sales Development Agent', role: 'SDR', division: 'sales-customer', status: 'active', currentTask: 'Qualifying inbound leads via Vapi', tasksPerHour: 56, successRate: 94.8, icon: '📞' },
  { id: 'agent-14', name: 'Sales Closer Agent', role: 'Account Executive', division: 'sales-customer', status: 'meeting', currentTask: 'Conducting demo call with enterprise lead', tasksPerHour: 12, successRate: 78.5, icon: '🤑' },
  { id: 'agent-15', name: 'Customer Success Agent', role: 'CS Manager', division: 'sales-customer', status: 'active', currentTask: 'Onboarding new customer via WhatsApp', tasksPerHour: 34, successRate: 96.7, icon: '💚' },
  { id: 'agent-16', name: 'Review Generation Agent', role: 'Reputation Manager', division: 'sales-customer', status: 'processing', currentTask: 'Sending review request emails', tasksPerHour: 89, successRate: 91.2, icon: '⭐' },
  
  // Operations & Analytics Division
  { id: 'agent-17', name: 'Operations Manager Agent', role: 'Ops Lead', division: 'operations-analytics', status: 'active', currentTask: 'Coordinating agent workflows via Linear', tasksPerHour: 41, successRate: 98.1, icon: '⚙️' },
  { id: 'agent-18', name: 'Financial Controller Agent', role: 'Finance Lead', division: 'operations-analytics', status: 'active', currentTask: 'Processing Stripe transactions', tasksPerHour: 78, successRate: 99.9, icon: '💵' },
  { id: 'agent-19', name: 'Analytics Specialist Agent', role: 'Data Analyst', division: 'operations-analytics', status: 'processing', currentTask: 'Building performance dashboards', tasksPerHour: 25, successRate: 97.3, icon: '📊' },
  { id: 'agent-20', name: 'Data Scraping Agent', role: 'Data Engineer', division: 'operations-analytics', status: 'active', currentTask: 'Collecting competitor pricing data', tasksPerHour: 156, successRate: 94.6, icon: '🕷️' },
  
  // Strategic & Compliance Division
  { id: 'agent-21', name: 'Legal Compliance Agent', role: 'Compliance Officer', division: 'strategic-compliance', status: 'idle', currentTask: 'Awaiting new compliance checks', tasksPerHour: 15, successRate: 99.8, icon: '⚖️' },
  { id: 'agent-22', name: 'Strategic Advisor Agent', role: 'Strategy Lead', division: 'strategic-compliance', status: 'meeting', currentTask: 'Analyzing expansion opportunities', tasksPerHour: 8, successRate: 95.5, icon: '🧠' },
  
  // Special Operations Division
  { id: 'agent-23', name: 'FOMO Creation Agent', role: 'Growth Hacker', division: 'special-operations', status: 'active', currentTask: 'Generating scarcity campaigns', tasksPerHour: 33, successRate: 86.9, icon: '🔥' },
  { id: 'agent-24', name: 'Market Maker Agent', role: 'Launch Lead', division: 'special-operations', status: 'processing', currentTask: 'Orchestrating product launch sequence', tasksPerHour: 19, successRate: 89.4, icon: '🚀' },
  { id: 'agent-25', name: 'Exit Strategy Agent', role: 'M&A Specialist', division: 'special-operations', status: 'idle', currentTask: 'Preparing business valuation materials', tasksPerHour: 6, successRate: 92.1, icon: '💎' },
];

export const divisionColors: Record<Division, string> = {
  'market-intelligence': 'hsl(180 100% 50%)',
  'product-development': 'hsl(158 100% 45%)',
  'creative-brand': 'hsl(270 80% 60%)',
  'marketing-growth': 'hsl(45 100% 60%)',
  'sales-customer': 'hsl(0 80% 60%)',
  'operations-analytics': 'hsl(200 100% 50%)',
  'strategic-compliance': 'hsl(280 70% 50%)',
  'special-operations': 'hsl(330 80% 55%)',
};

export const divisionNames: Record<Division, string> = {
  'market-intelligence': 'Market Intelligence',
  'product-development': 'Product Development',
  'creative-brand': 'Creative & Brand',
  'marketing-growth': 'Marketing & Growth',
  'sales-customer': 'Sales & Customer',
  'operations-analytics': 'Operations & Analytics',
  'strategic-compliance': 'Strategic & Compliance',
  'special-operations': 'Special Operations',
};

export interface Business {
  id: string;
  name: string;
  industry: string;
  stage: 'research' | 'building' | 'marketing' | 'launching' | 'scaling' | 'exit-ready';
  progress: number;
  revenue: number;
  assignedAgents: string[];
  daysInStage: number;
}

export const businesses: Business[] = [
  { id: 'biz-1', name: 'AI Content Studio', industry: 'SaaS', stage: 'scaling', progress: 85, revenue: 45000, assignedAgents: ['agent-7', 'agent-9', 'agent-18'], daysInStage: 12 },
  { id: 'biz-2', name: 'AutoLead Pro', industry: 'Sales Tech', stage: 'launching', progress: 72, revenue: 12000, assignedAgents: ['agent-13', 'agent-14', 'agent-10'], daysInStage: 5 },
  { id: 'biz-3', name: 'BrandForge AI', industry: 'Design', stage: 'building', progress: 45, revenue: 0, assignedAgents: ['agent-6', 'agent-8', 'agent-4'], daysInStage: 8 },
  { id: 'biz-4', name: 'DataMiner Suite', industry: 'Analytics', stage: 'marketing', progress: 58, revenue: 3500, assignedAgents: ['agent-20', 'agent-19', 'agent-11'], daysInStage: 3 },
  { id: 'biz-5', name: 'ComplianceBot', industry: 'Legal Tech', stage: 'research', progress: 22, revenue: 0, assignedAgents: ['agent-21', 'agent-1', 'agent-2'], daysInStage: 2 },
  { id: 'biz-6', name: 'SocialPulse', industry: 'Marketing', stage: 'exit-ready', progress: 98, revenue: 125000, assignedAgents: ['agent-25', 'agent-22'], daysInStage: 15 },
];

export interface ActivityLog {
  id: string;
  timestamp: Date;
  agentId: string;
  agentName: string;
  action: string;
  result: 'success' | 'pending' | 'error';
  details: string;
}

export const generateActivityLogs = (): ActivityLog[] => {
  const actions = [
    { action: 'Lead qualified', result: 'success' as const },
    { action: 'Message sent', result: 'success' as const },
    { action: 'Data collected', result: 'success' as const },
    { action: 'API call made', result: 'pending' as const },
    { action: 'Content generated', result: 'success' as const },
    { action: 'Analysis complete', result: 'success' as const },
    { action: 'Meeting scheduled', result: 'success' as const },
    { action: 'Error retry', result: 'error' as const },
  ];

  return Array.from({ length: 50 }, (_, i) => {
    const agent = agents[Math.floor(Math.random() * agents.length)];
    const actionData = actions[Math.floor(Math.random() * actions.length)];
    return {
      id: `log-${i}`,
      timestamp: new Date(Date.now() - Math.random() * 3600000),
      agentId: agent.id,
      agentName: agent.name,
      action: actionData.action,
      result: actionData.result,
      details: `Processing item ${Math.floor(Math.random() * 1000)}`,
    };
  }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};
