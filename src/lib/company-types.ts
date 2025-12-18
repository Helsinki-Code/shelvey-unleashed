// AI Conglomerate Company Types and Configuration

export type CompanyType = 
  | 'business_building'
  | 'trading'
  | 'ecommerce'
  | 'seo_agency'
  | 'blog_empire'
  | 'web_design'
  | 'automation'
  | 'digital_products';

export interface CompanyConfig {
  type: CompanyType;
  name: string;
  icon: string;
  description: string;
  ceoRole: string;
  agentCount: number;
  phaseCount: number;
  revenueModel: string;
  status: 'built' | 'building' | 'planned';
  route: string;
  color: string;
}

export const COMPANY_CONFIGS: Record<CompanyType, CompanyConfig> = {
  business_building: {
    type: 'business_building',
    name: 'Business Building',
    icon: '🤵',
    description: 'Launch complete businesses from idea to revenue',
    ceoRole: 'Chief Business Architect',
    agentCount: 25,
    phaseCount: 6,
    revenueModel: 'Project fees + Recurring services',
    status: 'built',
    route: '/projects',
    color: 'hsl(var(--primary))'
  },
  trading: {
    type: 'trading',
    name: 'Trading Terminal',
    icon: '📈',
    description: 'AI-powered autonomous trading strategies',
    ceoRole: 'Chief Trading Officer',
    agentCount: 6,
    phaseCount: 6,
    revenueModel: 'Profit share + Subscription',
    status: 'built',
    route: '/trading',
    color: 'hsl(142, 76%, 36%)'
  },
  ecommerce: {
    type: 'ecommerce',
    name: 'E-Commerce Empire',
    icon: '🛒',
    description: 'Manage stores across Shopify, Etsy, Amazon, WooCommerce',
    ceoRole: 'Chief Commerce Officer',
    agentCount: 8,
    phaseCount: 6,
    revenueModel: 'Store revenue + POD profits',
    status: 'building',
    route: '/stores',
    color: 'hsl(280, 65%, 60%)'
  },
  seo_agency: {
    type: 'seo_agency',
    name: 'SEO Agency',
    icon: '🔍',
    description: 'Autonomous SEO services for clients',
    ceoRole: 'Chief SEO Strategist',
    agentCount: 11,
    phaseCount: 6,
    revenueModel: 'Monthly retainers $999-$2,499/client',
    status: 'planned',
    route: '/seo-agency',
    color: 'hsl(200, 95%, 50%)'
  },
  blog_empire: {
    type: 'blog_empire',
    name: 'Blog Empire',
    icon: '📝',
    description: 'AI-powered content creation and monetization',
    ceoRole: 'Chief Content Officer',
    agentCount: 6,
    phaseCount: 5,
    revenueModel: 'Ad revenue + Affiliate commissions',
    status: 'planned',
    route: '/blog-empire',
    color: 'hsl(30, 95%, 55%)'
  },
  web_design: {
    type: 'web_design',
    name: 'Web Design Agency',
    icon: '🎨',
    description: 'AI agents design, build, and maintain websites',
    ceoRole: 'Chief Creative Officer',
    agentCount: 7,
    phaseCount: 5,
    revenueModel: 'Project fees $1,999-$4,999 + Maintenance',
    status: 'planned',
    route: '/web-agency',
    color: 'hsl(340, 80%, 55%)'
  },
  automation: {
    type: 'automation',
    name: 'Automation Agency',
    icon: '⚙️',
    description: 'Build and manage workflow automations',
    ceoRole: 'Chief Automation Officer',
    agentCount: 8,
    phaseCount: 4,
    revenueModel: 'Setup fees + Monthly management',
    status: 'planned',
    route: '/automation-agency',
    color: 'hsl(220, 70%, 55%)'
  },
  digital_products: {
    type: 'digital_products',
    name: 'Digital Products',
    icon: '📦',
    description: 'Create and sell courses, ebooks, templates',
    ceoRole: 'Chief Product Officer',
    agentCount: 9,
    phaseCount: 5,
    revenueModel: 'Product sales + Subscription courses',
    status: 'planned',
    route: '/digital-products',
    color: 'hsl(160, 60%, 45%)'
  }
};

export const getCompanyConfig = (type: CompanyType): CompanyConfig => {
  return COMPANY_CONFIGS[type];
};

export const getAllCompanyTypes = (): CompanyType[] => {
  return Object.keys(COMPANY_CONFIGS) as CompanyType[];
};

export const getBuiltCompanies = (): CompanyConfig[] => {
  return Object.values(COMPANY_CONFIGS).filter(c => c.status === 'built' || c.status === 'building');
};
