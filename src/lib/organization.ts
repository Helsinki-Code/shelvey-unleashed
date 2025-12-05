// Corporate Hierarchy Definitions

export const BUSINESS_PHASES = [
  {
    number: 1,
    name: 'Research & Discovery',
    division: 'research',
    description: 'Market research, competitor analysis, and opportunity identification',
    deliverables: [
      { name: 'Market Analysis Report', type: 'report' },
      { name: 'Competitor Landscape', type: 'analysis' },
      { name: 'Target Customer Profiles', type: 'document' },
      { name: 'Trend Forecast', type: 'report' }
    ],
    entryCriteria: ['Business idea defined', 'Initial project created'],
    exitCriteria: ['Market validated', 'Target audience identified', 'Competitive advantage defined']
  },
  {
    number: 2,
    name: 'Brand & Identity',
    division: 'brand',
    description: 'Brand identity creation, visual design, and brand guidelines',
    deliverables: [
      { name: 'Brand Strategy Document', type: 'document' },
      { name: 'Logo & Visual Identity', type: 'design' },
      { name: 'Brand Guidelines', type: 'document' },
      { name: 'Brand Voice & Messaging', type: 'document' }
    ],
    entryCriteria: ['Market research completed', 'Target audience defined'],
    exitCriteria: ['Brand identity approved', 'Visual assets created', 'Brand guidelines documented']
  },
  {
    number: 3,
    name: 'Development & Build',
    division: 'development',
    description: 'Product architecture, website/app development, and QA testing',
    deliverables: [
      { name: 'Technical Architecture', type: 'document' },
      { name: 'Landing Page', type: 'website' },
      { name: 'Product MVP', type: 'code' },
      { name: 'QA Test Report', type: 'report' }
    ],
    entryCriteria: ['Brand identity completed', 'Visual assets ready'],
    exitCriteria: ['Website deployed', 'Product functional', 'QA passed']
  },
  {
    number: 4,
    name: 'Content Creation',
    division: 'content',
    description: 'Content strategy, copywriting, SEO optimization, and media creation',
    deliverables: [
      { name: 'Content Strategy', type: 'document' },
      { name: 'Website Copy', type: 'content' },
      { name: 'Blog Articles', type: 'content' },
      { name: 'SEO Optimization Report', type: 'report' }
    ],
    entryCriteria: ['Website deployed', 'Brand voice defined'],
    exitCriteria: ['All content published', 'SEO implemented', 'Content calendar created']
  },
  {
    number: 5,
    name: 'Marketing Launch',
    division: 'marketing',
    description: 'Social media, paid advertising, influencer outreach, and PR',
    deliverables: [
      { name: 'Marketing Strategy', type: 'document' },
      { name: 'Social Media Campaigns', type: 'campaign' },
      { name: 'Ad Creatives', type: 'design' },
      { name: 'Influencer Partnerships', type: 'partnerships' }
    ],
    entryCriteria: ['Content ready', 'Website live', 'Budget allocated'],
    exitCriteria: ['Campaigns launched', 'Initial traffic generated', 'Brand awareness established']
  },
  {
    number: 6,
    name: 'Sales & Growth',
    division: 'sales',
    description: 'Sales development, customer acquisition, and revenue generation',
    deliverables: [
      { name: 'Sales Playbook', type: 'document' },
      { name: 'Lead Pipeline', type: 'data' },
      { name: 'Customer Onboarding', type: 'process' },
      { name: 'Revenue Report', type: 'report' }
    ],
    entryCriteria: ['Marketing generating leads', 'Product ready'],
    exitCriteria: ['First customers acquired', 'Revenue generated', 'Growth metrics established']
  }
];

export const EXECUTIVE_AGENTS = [
  {
    id: 'ceo',
    name: 'CEO Agent',
    role: 'executive',
    title: 'Chief Executive Officer',
    description: 'Strategic vision, major decisions, and executive oversight',
    reportsTo: null
  },
  {
    id: 'coo',
    name: 'COO Agent',
    role: 'executive',
    title: 'Chief Operating Officer',
    description: 'Operations coordination, team management, and execution oversight',
    reportsTo: 'ceo'
  },
  {
    id: 'cfo',
    name: 'CFO Agent',
    role: 'executive',
    title: 'Chief Financial Officer',
    description: 'Financial planning, budget management, and ROI analysis',
    reportsTo: 'ceo'
  }
];

export const DIVISIONS = [
  {
    id: 'research',
    name: 'Research Division',
    managerId: 'head-of-research',
    managerName: 'Head of Research',
    phase: 1,
    color: 'from-blue-500 to-cyan-500',
    icon: 'Search'
  },
  {
    id: 'brand',
    name: 'Brand & Design Division',
    managerId: 'creative-director',
    managerName: 'Creative Director',
    phase: 2,
    color: 'from-purple-500 to-pink-500',
    icon: 'Palette'
  },
  {
    id: 'development',
    name: 'Development Division',
    managerId: 'head-of-development',
    managerName: 'Head of Development',
    phase: 3,
    color: 'from-green-500 to-emerald-500',
    icon: 'Code'
  },
  {
    id: 'content',
    name: 'Content Division',
    managerId: 'content-director',
    managerName: 'Content Director',
    phase: 4,
    color: 'from-orange-500 to-amber-500',
    icon: 'FileText'
  },
  {
    id: 'marketing',
    name: 'Marketing Division',
    managerId: 'head-of-marketing',
    managerName: 'Head of Marketing',
    phase: 5,
    color: 'from-red-500 to-rose-500',
    icon: 'Megaphone'
  },
  {
    id: 'sales',
    name: 'Sales Division',
    managerId: 'head-of-sales',
    managerName: 'Head of Sales',
    phase: 6,
    color: 'from-yellow-500 to-lime-500',
    icon: 'DollarSign'
  },
  {
    id: 'operations',
    name: 'Operations Division',
    managerId: 'head-of-operations',
    managerName: 'Head of Operations',
    phase: null,
    color: 'from-gray-500 to-slate-500',
    icon: 'Settings'
  }
];

export const ROLE_HIERARCHY = {
  executive: { level: 1, canDelegate: ['manager', 'lead', 'member'] },
  manager: { level: 2, canDelegate: ['lead', 'member'] },
  lead: { level: 3, canDelegate: ['member'] },
  member: { level: 4, canDelegate: [] }
};

export const STATUS_COLORS = {
  idle: 'text-muted-foreground',
  active: 'text-green-500',
  working: 'text-yellow-500',
  reviewing: 'text-blue-500',
  blocked: 'text-red-500'
};

export const PHASE_STATUS_COLORS = {
  pending: 'bg-muted text-muted-foreground',
  active: 'bg-primary text-primary-foreground',
  completed: 'bg-green-500 text-white',
  blocked: 'bg-destructive text-destructive-foreground'
};

export const DELIVERABLE_STATUS_COLORS = {
  pending: 'bg-muted',
  in_progress: 'bg-yellow-500/20 text-yellow-500',
  review: 'bg-blue-500/20 text-blue-500',
  approved: 'bg-green-500/20 text-green-500',
  rejected: 'bg-red-500/20 text-red-500'
};

export function getPhaseByNumber(phaseNumber: number) {
  return BUSINESS_PHASES.find(p => p.number === phaseNumber);
}

export function getDivisionByPhase(phaseNumber: number) {
  return DIVISIONS.find(d => d.phase === phaseNumber);
}

export function getNextPhase(currentPhase: number) {
  if (currentPhase >= 6) return null;
  return BUSINESS_PHASES.find(p => p.number === currentPhase + 1);
}
