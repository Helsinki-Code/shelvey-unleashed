import { 
  Search, TrendingUp, Lightbulb, Code, TestTube, Palette, 
  FileText, Image, Target, Share2, DollarSign, Users, 
  Phone, Handshake, HeartHandshake, Star, Settings, 
  Calculator, BarChart, Database, Shield, Brain, 
  Flame, Rocket, LogOut
} from "lucide-react";

export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  description: string;
  division: 'research' | 'development' | 'marketing' | 'sales' | 'operations';
  icon: typeof Search;
  preferredMCP: string[];
  capabilities: string[];
}

export const ALL_AGENTS: AgentConfig[] = [
  {
    id: 'agent-1',
    name: 'Market Research Agent',
    role: 'Research & Analysis',
    description: 'Conducts competitive analysis, market sizing, and consumer behavior research.',
    division: 'research',
    icon: Search,
    preferredMCP: ['perplexity', 'browser-use', 'twitter', 'contentcore'],
    capabilities: ['Competitive Analysis', 'Market Sizing', 'Consumer Insights', 'Industry Reports']
  },
  {
    id: 'agent-2',
    name: 'Trend Prediction Agent',
    role: 'Forecasting',
    description: 'Identifies emerging market trends, consumer behavior shifts, and technological disruptions.',
    division: 'research',
    icon: TrendingUp,
    preferredMCP: ['perplexity', 'twitter', 'browser-use', 'contentcore'],
    capabilities: ['Trend Analysis', 'Predictive Modeling', 'Early Signal Detection', 'Disruption Mapping']
  },
  {
    id: 'agent-3',
    name: 'Product Architect Agent',
    role: 'Product Design',
    description: 'Designs product features, user experiences, and technical specifications.',
    division: 'development',
    icon: Lightbulb,
    preferredMCP: ['github', '21st-dev', 'shadcn', 'perplexity'],
    capabilities: ['Feature Design', 'UX Architecture', 'Technical Specs', 'Product Roadmaps']
  },
  {
    id: 'agent-4',
    name: 'Code Builder Agent',
    role: 'Development',
    description: 'Writes clean, efficient code across multiple programming languages and frameworks.',
    division: 'development',
    icon: Code,
    preferredMCP: ['github', 'playwright', 'chrome', 'shadcn', '21st-dev'],
    capabilities: ['Full-Stack Development', 'API Integration', 'Database Design', 'Code Review']
  },
  {
    id: 'agent-5',
    name: 'QA Testing Agent',
    role: 'Quality Assurance',
    description: 'Performs automated testing, bug detection, and quality assurance processes.',
    division: 'development',
    icon: TestTube,
    preferredMCP: ['playwright', 'chrome', 'browser-use', 'github'],
    capabilities: ['Automated Testing', 'Bug Detection', 'Performance Testing', 'Security Audits']
  },
  {
    id: 'agent-6',
    name: 'Brand Identity Agent',
    role: 'Branding',
    description: 'Creates brand guidelines, visual identities, and brand messaging.',
    division: 'marketing',
    icon: Palette,
    preferredMCP: ['canva', 'fal-ai', '21st-dev', 'perplexity'],
    capabilities: ['Brand Strategy', 'Visual Identity', 'Messaging Framework', 'Brand Guidelines']
  },
  {
    id: 'agent-7',
    name: 'Content Creator Agent',
    role: 'Content',
    description: 'Writes compelling copy, blog posts, social media content, and marketing materials.',
    division: 'marketing',
    icon: FileText,
    preferredMCP: ['perplexity', 'contentcore', 'fal-ai', 'twitter'],
    capabilities: ['Copywriting', 'Blog Posts', 'Social Content', 'Email Campaigns']
  },
  {
    id: 'agent-8',
    name: 'Visual Design Agent',
    role: 'Design',
    description: 'Creates stunning visuals, UI designs, and graphic assets.',
    division: 'marketing',
    icon: Image,
    preferredMCP: ['canva', 'fal-ai', 'shadcn', '21st-dev'],
    capabilities: ['UI Design', 'Graphics', 'Illustrations', 'Website Generation']
  },
  {
    id: 'agent-9',
    name: 'SEO Optimization Agent',
    role: 'SEO',
    description: 'Optimizes for search engines, conducts keyword research, and improves content.',
    division: 'marketing',
    icon: Target,
    preferredMCP: ['perplexity', 'contentcore', 'browser-use', 'google-maps'],
    capabilities: ['Keyword Research', 'On-Page SEO', 'Technical SEO', 'Content Optimization']
  },
  {
    id: 'agent-10',
    name: 'Social Media Manager Agent',
    role: 'Social Media',
    description: 'Manages social media strategy, content scheduling, and community engagement.',
    division: 'marketing',
    icon: Share2,
    preferredMCP: ['twitter', 'linkedin', 'facebook', 'contentcore'],
    capabilities: ['Social Strategy', 'Content Calendar', 'Community Management', 'Analytics']
  },
  {
    id: 'agent-11',
    name: 'Paid Ads Specialist Agent',
    role: 'Advertising',
    description: 'Manages PPC campaigns, ad creative optimization, and ROI maximization.',
    division: 'marketing',
    icon: DollarSign,
    preferredMCP: ['facebook-ads', 'google-ads', 'stripe', 'perplexity'],
    capabilities: ['PPC Management', 'Ad Creative', 'Budget Optimization', 'A/B Testing']
  },
  {
    id: 'agent-12',
    name: 'Influencer Outreach Agent',
    role: 'Partnerships',
    description: 'Identifies influencers, manages partnerships, and negotiates collaborations.',
    division: 'marketing',
    icon: Users,
    preferredMCP: ['linkedin', 'twitter', 'whatsapp', 'perplexity'],
    capabilities: ['Influencer Discovery', 'Outreach', 'Partnership Negotiation', 'Campaign Management']
  },
  {
    id: 'agent-13',
    name: 'Sales Development Agent',
    role: 'Sales',
    description: 'Generates leads, conducts outbound prospecting, and develops sales pipeline.',
    division: 'sales',
    icon: Phone,
    preferredMCP: ['vapi', 'call-center', 'whatsapp', 'linkedin'],
    capabilities: ['Lead Generation', 'Cold Outreach', 'Pipeline Development', 'Qualification']
  },
  {
    id: 'agent-14',
    name: 'Sales Closer Agent',
    role: 'Sales',
    description: 'Negotiates deals, closes sales, and maximizes conversion rates.',
    division: 'sales',
    icon: Handshake,
    preferredMCP: ['vapi', 'call-center', 'stripe', 'whatsapp'],
    capabilities: ['Negotiation', 'Deal Closing', 'Contract Management', 'Upselling']
  },
  {
    id: 'agent-15',
    name: 'Customer Success Agent',
    role: 'Customer Support',
    description: 'Manages customer onboarding, retention, and satisfaction optimization.',
    division: 'sales',
    icon: HeartHandshake,
    preferredMCP: ['whatsapp', 'vapi', 'kokoro-tts', 'call-center'],
    capabilities: ['Onboarding', 'Support', 'Retention', 'Customer Health Monitoring']
  },
  {
    id: 'agent-16',
    name: 'Review Generation Agent',
    role: 'Reputation',
    description: 'Generates authentic customer reviews and manages online reputation.',
    division: 'sales',
    icon: Star,
    preferredMCP: ['whatsapp', 'twitter', 'linkedin', 'google-maps'],
    capabilities: ['Review Requests', 'Reputation Monitoring', 'Response Management', 'Testimonials']
  },
  {
    id: 'agent-17',
    name: 'Operations Manager Agent',
    role: 'Operations',
    description: 'Optimizes workflows, allocates resources, and improves processes.',
    division: 'operations',
    icon: Settings,
    preferredMCP: ['linear', 'github', 'google-calendar', 'filesystem'],
    capabilities: ['Workflow Automation', 'Resource Planning', 'Process Optimization', 'Team Coordination']
  },
  {
    id: 'agent-18',
    name: 'Financial Controller Agent',
    role: 'Finance',
    description: 'Manages financial planning, budgeting, and revenue optimization.',
    division: 'operations',
    icon: Calculator,
    preferredMCP: ['stripe', 'filesystem', 'github', 'perplexity'],
    capabilities: ['Financial Planning', 'Budgeting', 'Revenue Analysis', 'Cash Flow Management']
  },
  {
    id: 'agent-19',
    name: 'Analytics Specialist Agent',
    role: 'Analytics',
    description: 'Performs data analysis, metrics tracking, and business intelligence.',
    division: 'operations',
    icon: BarChart,
    preferredMCP: ['contentcore', 'perplexity', 'browser-use', 'stripe'],
    capabilities: ['Data Analysis', 'KPI Tracking', 'Reporting', 'Insights Generation']
  },
  {
    id: 'agent-20',
    name: 'Data Scraping Agent',
    role: 'Data Collection',
    description: 'Performs web scraping, data extraction, and information gathering.',
    division: 'operations',
    icon: Database,
    preferredMCP: ['browser-use', 'playwright', 'contentcore', 'chrome'],
    capabilities: ['Web Scraping', 'Data Extraction', 'ETL Processes', 'Data Cleaning']
  },
  {
    id: 'agent-21',
    name: 'Legal Compliance Agent',
    role: 'Legal',
    description: 'Ensures regulatory compliance, creates terms of service, and privacy policies.',
    division: 'operations',
    icon: Shield,
    preferredMCP: ['perplexity', 'contentcore', 'github', 'filesystem'],
    capabilities: ['Compliance Audits', 'Legal Documents', 'Policy Creation', 'Risk Assessment']
  },
  {
    id: 'agent-22',
    name: 'Strategic Advisor Agent',
    role: 'Strategy',
    description: 'Provides business strategy, market positioning, and growth planning advice.',
    division: 'research',
    icon: Brain,
    preferredMCP: ['perplexity', 'agent-mcp', 'browser-use', 'contentcore'],
    capabilities: ['Strategy Development', 'Market Positioning', 'Growth Planning', 'Competitive Strategy']
  },
  {
    id: 'agent-23',
    name: 'FOMO Creation Agent',
    role: 'Marketing',
    description: 'Creates urgency, scarcity marketing, and viral campaigns.',
    division: 'marketing',
    icon: Flame,
    preferredMCP: ['twitter', 'linkedin', 'facebook-ads', 'contentcore'],
    capabilities: ['Urgency Campaigns', 'Scarcity Marketing', 'Viral Content', 'Launch Strategies']
  },
  {
    id: 'agent-24',
    name: 'Market Maker Agent',
    role: 'Growth',
    description: 'Creates market demand, launches products, and drives adoption.',
    division: 'sales',
    icon: Rocket,
    preferredMCP: ['linear', 'stripe', 'vapi', 'twitter'],
    capabilities: ['Demand Generation', 'Product Launch', 'Market Entry', 'Growth Hacking']
  },
  {
    id: 'agent-25',
    name: 'Exit Strategy Agent',
    role: 'Strategy',
    description: 'Prepares for acquisition, optimizes valuation, and plans exits.',
    division: 'operations',
    icon: LogOut,
    preferredMCP: ['stripe', 'perplexity', 'agent-mcp', 'filesystem'],
    capabilities: ['Exit Planning', 'Valuation Optimization', 'Due Diligence Prep', 'Investor Relations']
  }
];

export const DIVISION_COLORS: Record<string, string> = {
  research: 'from-blue-500 to-cyan-500',
  development: 'from-purple-500 to-pink-500',
  marketing: 'from-orange-500 to-red-500',
  sales: 'from-green-500 to-emerald-500',
  operations: 'from-yellow-500 to-amber-500'
};

export const DIVISION_NAMES: Record<string, string> = {
  research: 'Research & Strategy',
  development: 'Development',
  marketing: 'Marketing',
  sales: 'Sales & Success',
  operations: 'Operations'
};

export const getAgentById = (id: string): AgentConfig | undefined => {
  return ALL_AGENTS.find(agent => agent.id === id);
};

export const getAgentsByDivision = (division: string): AgentConfig[] => {
  return ALL_AGENTS.filter(agent => agent.division === division);
};
