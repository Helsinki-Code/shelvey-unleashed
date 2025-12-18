// E-Commerce CEO Agent Team Configuration

export interface ECommerceAgent {
  id: string;
  name: string;
  role: string;
  description: string;
  skills: string[];
  mcpServers: string[];
}

export const ECOMMERCE_AGENTS: ECommerceAgent[] = [
  {
    id: 'ecom-ceo',
    name: 'E-Commerce CEO',
    role: 'Chief Commerce Officer',
    description: 'Oversees all e-commerce operations and strategy across multiple platforms',
    skills: ['Multi-channel strategy', 'Revenue optimization', 'Market expansion'],
    mcpServers: ['mcp-shopify', 'mcp-etsy', 'mcp-amazon', 'mcp-woocommerce']
  },
  {
    id: 'store-manager',
    name: 'Store Manager',
    role: 'Store Operations Lead',
    description: 'Manages day-to-day store operations across all connected platforms',
    skills: ['Store setup', 'Product listings', 'Platform compliance'],
    mcpServers: ['mcp-shopify', 'mcp-etsy', 'mcp-woocommerce']
  },
  {
    id: 'inventory-agent',
    name: 'Inventory Agent',
    role: 'Inventory Controller',
    description: 'Monitors stock levels, handles reordering, and manages SKUs',
    skills: ['Stock management', 'Demand forecasting', 'Supplier coordination'],
    mcpServers: ['mcp-shopify', 'mcp-printful', 'mcp-printify']
  },
  {
    id: 'pricing-agent',
    name: 'Pricing Agent',
    role: 'Dynamic Pricing Specialist',
    description: 'Optimizes pricing based on competition, demand, and profit margins',
    skills: ['Competitive analysis', 'Price optimization', 'Margin protection'],
    mcpServers: ['mcp-serpapi', 'mcp-brightdata', 'mcp-shopify']
  },
  {
    id: 'fulfillment-agent',
    name: 'Fulfillment Agent',
    role: 'Order Fulfillment Lead',
    description: 'Manages order processing, shipping, and delivery tracking',
    skills: ['Order processing', 'Shipping optimization', 'Delivery tracking'],
    mcpServers: ['mcp-shopify', 'mcp-printful', 'mcp-printify']
  },
  {
    id: 'customer-service-agent',
    name: 'Customer Service Agent',
    role: 'Customer Success Manager',
    description: 'Handles customer inquiries, reviews, and support tickets',
    skills: ['Customer communication', 'Review management', 'Issue resolution'],
    mcpServers: ['mcp-twilio', 'mcp-whatsapp', 'mcp-openai']
  },
  {
    id: 'ecom-marketing-agent',
    name: 'E-Commerce Marketing Agent',
    role: 'Growth Marketing Lead',
    description: 'Drives traffic and conversions through ads and promotions',
    skills: ['Ad campaigns', 'Email marketing', 'Social commerce'],
    mcpServers: ['mcp-facebook', 'mcp-googleads', 'mcp-instagram', 'mcp-tiktok']
  },
  {
    id: 'pod-design-agent',
    name: 'POD Design Agent',
    role: 'Product Design Specialist',
    description: 'Creates designs for print-on-demand products',
    skills: ['Graphic design', 'Trend analysis', 'Product mockups'],
    mcpServers: ['mcp-canva', 'mcp-falai', 'mcp-printful', 'mcp-printify']
  }
];

export interface ECommercePhase {
  number: number;
  name: string;
  description: string;
  agentId: string;
  deliverables: string[];
}

export const ECOMMERCE_PHASES: ECommercePhase[] = [
  {
    number: 1,
    name: 'Store Setup',
    description: 'Connect stores, configure settings, and optimize listings',
    agentId: 'store-manager',
    deliverables: ['Store connections', 'Platform settings', 'Initial listings']
  },
  {
    number: 2,
    name: 'Product Strategy',
    description: 'Define product catalog, pricing strategy, and inventory levels',
    agentId: 'pricing-agent',
    deliverables: ['Product catalog', 'Pricing strategy', 'Inventory plan']
  },
  {
    number: 3,
    name: 'Fulfillment Setup',
    description: 'Configure shipping, fulfillment partners, and POD integrations',
    agentId: 'fulfillment-agent',
    deliverables: ['Shipping rules', 'POD setup', 'Fulfillment workflows']
  },
  {
    number: 4,
    name: 'Marketing Launch',
    description: 'Create ad campaigns, social presence, and email sequences',
    agentId: 'ecom-marketing-agent',
    deliverables: ['Ad campaigns', 'Social content', 'Email sequences']
  },
  {
    number: 5,
    name: 'Operations',
    description: 'Active order management, customer service, and inventory monitoring',
    agentId: 'fulfillment-agent',
    deliverables: ['Order processing', 'Customer support', 'Stock monitoring']
  },
  {
    number: 6,
    name: 'Optimization',
    description: 'Analyze performance, optimize listings, and scale operations',
    agentId: 'ecom-ceo',
    deliverables: ['Performance reports', 'Optimization plans', 'Growth strategy']
  }
];

export const getECommerceAgent = (agentId: string): ECommerceAgent | undefined => {
  return ECOMMERCE_AGENTS.find(a => a.id === agentId);
};

export const getECommercePhase = (phaseNumber: number): ECommercePhase | undefined => {
  return ECOMMERCE_PHASES.find(p => p.number === phaseNumber);
};
