// Blog Empire AI Agents - 6 Specialized Content Creation Agents

export interface BlogAgent {
  id: string;
  name: string;
  role: string;
  description: string;
  icon: string;
  skills: string[];
  mcpServers: string[];
}

export const BLOG_EMPIRE_AGENTS: BlogAgent[] = [
  {
    id: 'content-strategist',
    name: 'Content Strategist',
    role: 'Chief Content Officer',
    description: 'Plans content calendar, identifies trending topics, and develops content pillars for maximum engagement and monetization.',
    icon: '📊',
    skills: ['Content Planning', 'Trend Analysis', 'Keyword Research', 'Editorial Calendar'],
    mcpServers: ['mcp-perplexity', 'mcp-serpapi', 'mcp-googleanalytics']
  },
  {
    id: 'blog-writer',
    name: 'Blog Writer',
    role: 'Senior Content Writer',
    description: 'Creates high-quality, SEO-optimized blog posts with engaging narratives and proper structure.',
    icon: '✍️',
    skills: ['Long-form Writing', 'SEO Writing', 'Storytelling', 'Research'],
    mcpServers: ['mcp-perplexity', 'mcp-openai', 'mcp-medium']
  },
  {
    id: 'seo-optimizer',
    name: 'SEO Optimizer',
    role: 'SEO Specialist',
    description: 'Optimizes all content for search engines, manages keywords, and tracks ranking performance.',
    icon: '🔍',
    skills: ['On-page SEO', 'Keyword Optimization', 'Meta Tags', 'Internal Linking'],
    mcpServers: ['mcp-serpapi', 'mcp-googleanalytics', 'mcp-perplexity']
  },
  {
    id: 'monetization-manager',
    name: 'Monetization Manager',
    role: 'Revenue Optimization Lead',
    description: 'Manages ad placements, affiliate partnerships, and sponsored content opportunities.',
    icon: '💰',
    skills: ['Ad Optimization', 'Affiliate Marketing', 'Sponsorship Deals', 'Revenue Analysis'],
    mcpServers: ['mcp-googleads', 'mcp-stripe', 'mcp-googleanalytics']
  },
  {
    id: 'social-distributor',
    name: 'Social Distributor',
    role: 'Distribution Specialist',
    description: 'Distributes content across social platforms using browser automation, manages Instagram posts/stories, and drives traffic to blog posts.',
    icon: '📱',
    skills: [
      'Instagram Automation',
      'Create & Publish Posts',
      'Upload & Manage Stories',
      'Like & Comment on Posts',
      'Follow/Unfollow Accounts',
      'Search Users & Hashtags',
      'Access Insights & Analytics',
      'Community Engagement',
      'Content Repurposing',
      'Traffic Generation'
    ],
    mcpServers: ['mcp-twitter', 'mcp-linkedin', 'mcp-facebook', 'mcp-instagram', 'instagram-automation']
  },
  {
    id: 'analytics-reporter',
    name: 'Analytics Reporter',
    role: 'Performance Analyst',
    description: 'Tracks blog performance, generates reports, and provides insights for content optimization.',
    icon: '📈',
    skills: ['Analytics', 'Reporting', 'Performance Tracking', 'Data Visualization'],
    mcpServers: ['mcp-googleanalytics', 'mcp-perplexity']
  }
];

export const BLOG_EMPIRE_PHASES = [
  {
    phase: 1,
    name: 'Niche Research',
    description: 'Identify profitable niches, analyze competition, and select target audience',
    deliverables: ['Niche Analysis Report', 'Competitor Research', 'Target Audience Profile', 'Keyword Opportunity Map']
  },
  {
    phase: 2,
    name: 'Content Strategy',
    description: 'Develop content pillars, editorial calendar, and SEO strategy',
    deliverables: ['Content Pillar Framework', 'Editorial Calendar', 'SEO Strategy Document', 'Content Templates']
  },
  {
    phase: 3,
    name: 'Blog Setup',
    description: 'Set up blog infrastructure, design, and initial content',
    deliverables: ['Blog Website', 'Brand Identity', 'Initial 10 Posts', 'Email Capture Setup']
  },
  {
    phase: 4,
    name: 'Content Production',
    description: 'Scale content creation with consistent publishing schedule',
    deliverables: ['Weekly Content Batches', 'SEO Optimized Posts', 'Social Media Content', 'Email Newsletter']
  },
  {
    phase: 5,
    name: 'Monetization',
    description: 'Implement revenue streams and optimize for maximum earnings',
    deliverables: ['Ad Integration', 'Affiliate Programs', 'Sponsored Content Pipeline', 'Revenue Dashboard']
  }
];

export const getBlogAgent = (agentId: string): BlogAgent | undefined => {
  return BLOG_EMPIRE_AGENTS.find(agent => agent.id === agentId);
};
