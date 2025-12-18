import { Search, Palette, Code, FileText, Megaphone, TrendingUp } from "lucide-react";

export interface PhaseAgent {
  id: string;
  name: string;
  role: string;
  description: string;
  phaseNumber: number;
  phaseName: string;
  icon: typeof Search;
  capabilities: string[];
  mcpServers: string[]; // ALL MCP servers available to each agent
}

// Full list of ALL MCP servers available to every agent
const ALL_MCP_SERVERS = [
  // Development & DevOps
  'mcp-chrome', 'mcp-github', 'mcp-fs', 'mcp-playwright', 'mcp-linear',
  // Design & UI
  'mcp-21st-magic', 'mcp-shadcn', 'mcp-21stdev', 'mcp-canva', 'mcp-artifacts',
  // AI & Search
  'mcp-perplexity', 'mcp-browseruse', 'mcp-agentmcp', 'mcp-falai', 'mcp-contentcore',
  // Voice & Communication
  'mcp-vapi', 'mcp-callcenter', 'mcp-kokorotts', 'mcp-whatsapp', 'mcp-twilio',
  // Social Media
  'mcp-twitter', 'mcp-linkedin', 'mcp-facebook', 'mcp-youtube', 'mcp-instagram', 'mcp-tiktok',
  // Marketing & Ads
  'mcp-facebookads', 'mcp-googleads',
  // Payments & Analytics
  'mcp-stripe', 'mcp-googleanalytics', 'mcp-serpapi',
  // Productivity
  'mcp-maps', 'mcp-googlecalendar',
  // E-Commerce
  'mcp-shopify', 'mcp-etsy', 'mcp-woocommerce', 'mcp-amazon',
  // Trading
  'mcp-alpaca', 'mcp-coinbase', 'mcp-binance',
  // CRM
  'mcp-hubspot',
  // Infrastructure
  'mcp-vercel', 'mcp-cloudflare',
  // Scheduling & Scraping
  'mcp-calendly', 'mcp-brightdata',
  // CMS & Publishing
  'mcp-wordpress', 'mcp-medium',
  // LLM
  'mcp-openai', 'mcp-claude', 'mcp-gemini',
  // Database
  'mcp-postgresql',
  // Automation
  'mcp-n8n',
  // POD
  'mcp-printful', 'mcp-printify'
];

// Simplified: 1 dedicated agent per phase with FULL MCP access
export const PHASE_AGENTS: PhaseAgent[] = [
  {
    id: 'research-agent',
    name: 'Research Agent',
    role: 'Market Research & Analysis Specialist',
    description: 'Conducts comprehensive market research, competitive analysis, trend forecasting, and audience profiling using real-time web data and AI-powered analysis.',
    phaseNumber: 1,
    phaseName: 'Research & Discovery',
    icon: Search,
    capabilities: [
      'Market Analysis', 'Competitor Research', 'Trend Forecasting', 'Target Audience Profiling',
      'Industry Reports', 'SWOT Analysis', 'Customer Personas', 'Data Collection'
    ],
    mcpServers: ALL_MCP_SERVERS // Full access to all MCPs
  },
  {
    id: 'brand-agent',
    name: 'Brand Agent',
    role: 'Brand Identity & Design Specialist',
    description: 'Creates complete brand identity including strategy, visual design, logo generation, color palettes, typography, and brand guidelines using AI image generation.',
    phaseNumber: 2,
    phaseName: 'Brand & Identity',
    icon: Palette,
    capabilities: [
      'Brand Strategy', 'Logo Design', 'Color Palette', 'Typography Selection',
      'Brand Guidelines', 'Visual Identity', 'Social Media Assets', 'Marketing Materials'
    ],
    mcpServers: ALL_MCP_SERVERS // Full access to all MCPs
  },
  {
    id: 'development-agent',
    name: 'Development Agent',
    role: 'Website Development & Technical Build Specialist',
    description: 'Designs and builds responsive React websites with modern technologies, payment integration, analytics setup, and deployment to production.',
    phaseNumber: 3,
    phaseName: 'Development & Build',
    icon: Code,
    capabilities: [
      'Website Design', 'React Development', 'Frontend Development', 'Payment Integration',
      'Analytics Setup', 'SEO Optimization', 'Deployment', 'Performance Optimization'
    ],
    mcpServers: ALL_MCP_SERVERS // Full access to all MCPs
  },
  {
    id: 'content-agent',
    name: 'Content Agent',
    role: 'Content Creation & Copywriting Specialist',
    description: 'Creates compelling website copy, blog posts, email templates, social media content, and marketing materials optimized for conversion.',
    phaseNumber: 4,
    phaseName: 'Content Creation',
    icon: FileText,
    capabilities: [
      'Website Copy', 'Blog Posts', 'Email Templates', 'Social Media Content',
      'SEO Content', 'Product Descriptions', 'Landing Pages', 'Ad Copy'
    ],
    mcpServers: ALL_MCP_SERVERS // Full access to all MCPs
  },
  {
    id: 'marketing-agent',
    name: 'Marketing Agent',
    role: 'Marketing Launch & Campaign Specialist',
    description: 'Develops comprehensive marketing strategy, manages social campaigns, creates ad creatives, handles influencer partnerships, and executes launch campaigns.',
    phaseNumber: 5,
    phaseName: 'Marketing Launch',
    icon: Megaphone,
    capabilities: [
      'Marketing Strategy', 'Social Campaigns', 'Ad Creatives', 'Influencer Partnerships',
      'Email Marketing', 'Content Distribution', 'Analytics Tracking', 'A/B Testing'
    ],
    mcpServers: ALL_MCP_SERVERS // Full access to all MCPs
  },
  {
    id: 'sales-agent',
    name: 'Sales Agent',
    role: 'Sales & Growth Specialist',
    description: 'Manages sales pipeline, lead qualification, customer onboarding, revenue optimization, and automated sales processes including voice outreach.',
    phaseNumber: 6,
    phaseName: 'Sales & Growth',
    icon: TrendingUp,
    capabilities: [
      'Sales Playbook', 'Lead Pipeline', 'Revenue Tracking', 'Customer Onboarding',
      'Voice Sales', 'CRM Management', 'Deal Closing', 'Upselling'
    ],
    mcpServers: ALL_MCP_SERVERS // Full access to all MCPs
  }
];

export const getPhaseAgent = (phaseNumber: number): PhaseAgent | undefined => {
  return PHASE_AGENTS.find(agent => agent.phaseNumber === phaseNumber);
};

export const getAgentById = (agentId: string): PhaseAgent | undefined => {
  return PHASE_AGENTS.find(agent => agent.id === agentId);
};

export const getAllMCPServers = (): string[] => ALL_MCP_SERVERS;
