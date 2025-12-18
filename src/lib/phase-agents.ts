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
  mcpServers: string[];
}

// Simplified: 1 dedicated agent per phase
export const PHASE_AGENTS: PhaseAgent[] = [
  {
    id: 'research-agent',
    name: 'Research Agent',
    role: 'Market Research & Analysis',
    description: 'Conducts comprehensive market research, competitive analysis, trend forecasting, and audience profiling.',
    phaseNumber: 1,
    phaseName: 'Research & Discovery',
    icon: Search,
    capabilities: ['Market Analysis', 'Competitor Research', 'Trend Forecasting', 'Target Audience Profiling'],
    mcpServers: ['perplexity', 'browser-use', 'twitter', 'google-maps']
  },
  {
    id: 'brand-agent',
    name: 'Brand Agent',
    role: 'Brand Identity & Design',
    description: 'Creates brand strategy, visual identity, logo design, color palettes, and brand guidelines.',
    phaseNumber: 2,
    phaseName: 'Brand & Identity',
    icon: Palette,
    capabilities: ['Brand Strategy', 'Logo Design', 'Color Palette', 'Brand Guidelines'],
    mcpServers: ['fal-ai', 'canva', 'perplexity']
  },
  {
    id: 'development-agent',
    name: 'Development Agent',
    role: 'Website Development & Build',
    description: 'Designs and builds responsive websites with modern technologies, payment integration, and analytics.',
    phaseNumber: 3,
    phaseName: 'Development & Build',
    icon: Code,
    capabilities: ['Website Design', 'Frontend Development', 'Payment Integration', 'Analytics Setup'],
    mcpServers: ['21st-dev', 'shadcn', 'github', 'stripe']
  },
  {
    id: 'content-agent',
    name: 'Content Agent',
    role: 'Content Creation & Copywriting',
    description: 'Creates compelling website copy, blog posts, email templates, and social media content.',
    phaseNumber: 4,
    phaseName: 'Content Creation',
    icon: FileText,
    capabilities: ['Website Copy', 'Blog Posts', 'Email Templates', 'Social Media Content'],
    mcpServers: ['perplexity', 'contentcore', 'twitter', 'linkedin']
  },
  {
    id: 'marketing-agent',
    name: 'Marketing Agent',
    role: 'Marketing Launch & Campaigns',
    description: 'Develops marketing strategy, manages social campaigns, creates ad creatives, and handles influencer partnerships.',
    phaseNumber: 5,
    phaseName: 'Marketing Launch',
    icon: Megaphone,
    capabilities: ['Marketing Strategy', 'Social Campaigns', 'Ad Creatives', 'Influencer Partnerships'],
    mcpServers: ['facebook-ads', 'google-ads', 'twitter', 'linkedin', 'fal-ai']
  },
  {
    id: 'sales-agent',
    name: 'Sales Agent',
    role: 'Sales & Growth',
    description: 'Manages sales pipeline, lead qualification, customer onboarding, and revenue optimization.',
    phaseNumber: 6,
    phaseName: 'Sales & Growth',
    icon: TrendingUp,
    capabilities: ['Sales Playbook', 'Lead Pipeline', 'Revenue Tracking', 'Customer Onboarding'],
    mcpServers: ['vapi', 'call-center', 'stripe', 'whatsapp']
  }
];

export const getPhaseAgent = (phaseNumber: number): PhaseAgent | undefined => {
  return PHASE_AGENTS.find(agent => agent.phaseNumber === phaseNumber);
};

export const getAgentById = (agentId: string): PhaseAgent | undefined => {
  return PHASE_AGENTS.find(agent => agent.id === agentId);
};
