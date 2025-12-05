import { ExperienceMode } from '@/contexts/ExperienceModeContext';

export const TERMINOLOGY: Record<ExperienceMode, Record<string, string>> = {
  beginner: {
    'MCP Servers': 'Connected Apps',
    'MCP Server': 'Connected App',
    'Agents': 'AI Team Members',
    'Agent': 'AI Team Member',
    'Edge Functions': 'Automations',
    'Edge Function': 'Automation',
    'Latency': 'Response Time',
    'Pipeline': 'Project Progress',
    'Deliverables': 'Work Items',
    'Deliverable': 'Work Item',
    'Escalations': 'Help Requests',
    'Escalation': 'Help Request',
    'RLS Policies': 'Security Settings',
    'CEO Agent': 'Your AI CEO',
    'Dashboard': 'Home',
    'Requests': 'Actions',
    'API Keys': 'App Connections',
    'API Key': 'App Connection',
    'Neural Network': 'AI Brain',
    'Task Delegation': 'Assigning Work',
    'Phase': 'Stage',
    'Phases': 'Stages',
  },
  expert: {
    // Expert mode uses original terms
  }
};

export const TOOLTIPS: Record<string, string> = {
  'MCP Servers': 'Special connections that let your AI team use apps like Twitter, Stripe, or Gmail. Think of it as giving your AI team the right tools!',
  'Agents': 'AI specialists that handle different parts of your business - like having a marketing expert, developer, and salesperson all working for you.',
  'Edge Functions': 'Automated processes that run in the cloud to handle complex tasks without you needing to be involved.',
  'Latency': 'How quickly the system responds. Lower numbers mean faster responses.',
  'Pipeline': 'The step-by-step process your business goes through from idea to launch.',
  'Deliverables': 'The actual work products your AI team creates - like logos, websites, content, etc.',
  'Escalations': 'When an AI team member gets stuck and needs help from a manager or you.',
  'RLS Policies': 'Security rules that control who can see and change your data.',
  'CEO Agent': 'The main AI that oversees everything and talks to you about your business goals.',
  'API Keys': 'Secret passwords that let your AI team connect to other services like social media or payment processors.',
  'Neural Network': 'The AI system that powers how your agents communicate and work together.',
  'Task Delegation': 'When the CEO Agent assigns work to specialized team members.',
  'Phase': 'A major stage in building your business, like Research, Branding, or Development.',
};

export const getTerm = (term: string, mode: ExperienceMode): string => {
  if (mode === 'beginner' && TERMINOLOGY.beginner[term]) {
    return TERMINOLOGY.beginner[term];
  }
  return term;
};

export const getTooltip = (term: string): string | undefined => {
  return TOOLTIPS[term];
};
