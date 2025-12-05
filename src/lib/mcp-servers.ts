// Real MCP Servers from AMROGEN MCP Server - Unified Integration
export interface MCPServer {
  id: string;
  name: string;
  description: string;
  category: 'development' | 'communication' | 'automation' | 'analytics' | 'ai' | 'storage' | 'marketing' | 'voice' | 'design' | 'social' | 'ecommerce' | 'trading';
  status: 'connected' | 'syncing' | 'requires-key';
  icon: string;
  envRequired?: string[];
  toolCount?: number;
  latency?: number;
  requestsToday?: number;
  requiresUserKeys?: boolean; // True for MCPs that connect to user's personal accounts
}

export const mcpServers: MCPServer[] = [
  // Development & DevOps
  { 
    id: 'mcp-chrome', 
    name: 'Chrome DevTools', 
    description: 'Browser debugging, performance analysis, and DOM inspection', 
    category: 'development', 
    status: 'connected', 
    icon: '🌐', 
    toolCount: 26,
    latency: 15, 
    requestsToday: 1847 
  },
  { 
    id: 'mcp-github', 
    name: 'GitHub', 
    description: 'Repository management, issues, PRs, and code operations', 
    category: 'development', 
    status: 'connected', 
    icon: '🐙', 
    toolCount: 26,
    latency: 28, 
    requestsToday: 3421 
  },
  { 
    id: 'mcp-fs', 
    name: 'Filesystem', 
    description: 'File and directory operations, read/write access', 
    category: 'storage', 
    status: 'connected', 
    icon: '📁', 
    toolCount: 14,
    latency: 5, 
    requestsToday: 5672 
  },
  { 
    id: 'mcp-playwright', 
    name: 'Playwright', 
    description: 'Browser automation with accessibility snapshots', 
    category: 'automation', 
    status: 'connected', 
    icon: '🎭', 
    toolCount: 40,
    latency: 45, 
    requestsToday: 892 
  },
  { 
    id: 'mcp-linear', 
    name: 'Linear', 
    description: 'Project management, issues, and team workflows', 
    category: 'development', 
    status: 'connected', 
    icon: '📐', 
    latency: 34, 
    requestsToday: 1234 
  },

  // Modern React Website Generation (NEW)
  { 
    id: 'mcp-21st-magic', 
    name: '21st.dev Magic', 
    description: 'AI-powered React component generation with premium UI library', 
    category: 'design', 
    status: 'connected', 
    icon: '✨', 
    envRequired: ['TWENTY_FIRST_API_KEY'],
    toolCount: 5,
    latency: 120, 
    requestsToday: 0 
  },
  { 
    id: 'mcp-shadcn', 
    name: 'shadcn/ui', 
    description: 'Premium React component library with 45+ UI primitives', 
    category: 'design', 
    status: 'connected', 
    icon: '🎨', 
    toolCount: 4,
    latency: 45, 
    requestsToday: 0 
  },
  { 
    id: 'mcp-21stdev', 
    name: '21st.dev Components', 
    description: 'Browse and search 21st.dev component library', 
    category: 'design', 
    status: 'connected', 
    icon: '🧩', 
    envRequired: ['21ST_DEV_API_KEY'],
    latency: 156, 
    requestsToday: 567 
  },

  // AI & Search
  { 
    id: 'mcp-perplexity', 
    name: 'Perplexity AI', 
    description: 'AI-powered search and reasoning engine', 
    category: 'ai', 
    status: 'requires-key', 
    icon: '🧠', 
    envRequired: ['PERPLEXITY_API_KEY'],
    latency: 89, 
    requestsToday: 2341 
  },
  { 
    id: 'mcp-browseruse', 
    name: 'Browser Use', 
    description: 'Browser automation with AI agent capabilities', 
    category: 'ai', 
    status: 'requires-key', 
    icon: '🤖', 
    envRequired: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'],
    latency: 234, 
    requestsToday: 456 
  },
  { 
    id: 'mcp-agentmcp', 
    name: 'Agent MCP', 
    description: 'Multi-agent collaboration framework with shared knowledge graph', 
    category: 'ai', 
    status: 'requires-key', 
    icon: '🕸️', 
    envRequired: ['OPENAI_API_KEY'],
    latency: 178, 
    requestsToday: 789 
  },
  { 
    id: 'mcp-falai', 
    name: 'Fal.ai', 
    description: 'Media generation - images, videos, music, TTS, transcription', 
    category: 'ai', 
    status: 'requires-key', 
    icon: '🎬', 
    envRequired: ['FAL_KEY'],
    latency: 345, 
    requestsToday: 1234 
  },
  { 
    id: 'mcp-contentcore', 
    name: 'Content Core', 
    description: 'Content extraction from documents, videos, web, images', 
    category: 'ai', 
    status: 'connected', 
    icon: '📄', 
    latency: 67, 
    requestsToday: 1892 
  },

  // Voice & Communication
  { 
    id: 'mcp-vapi', 
    name: 'Vapi Voice AI', 
    description: 'Voice AI telephony - make calls, manage assistants', 
    category: 'voice', 
    status: 'requires-key', 
    icon: '📞', 
    envRequired: ['VAPI_TOKEN'],
    latency: 123, 
    requestsToday: 678 
  },
  { 
    id: 'mcp-callcenter', 
    name: 'Call Center', 
    description: 'VoIP phone calls with AI agent for sales and support', 
    category: 'voice', 
    status: 'requires-key', 
    icon: '☎️', 
    envRequired: ['SIP_USERNAME', 'SIP_PASSWORD', 'SIP_SERVER_IP', 'OPENAI_API_KEY'],
    latency: 89, 
    requestsToday: 345 
  },
  { 
    id: 'mcp-kokorotts', 
    name: 'Kokoro TTS', 
    description: 'Text-to-speech with MP3 generation and S3 upload', 
    category: 'voice', 
    status: 'syncing', 
    icon: '🔊', 
    latency: 234, 
    requestsToday: 567 
  },
  { 
    id: 'mcp-whatsapp', 
    name: 'WhatsApp', 
    description: 'WhatsApp messaging and contact management', 
    category: 'communication', 
    status: 'syncing', 
    icon: '💬', 
    latency: 45, 
    requestsToday: 4521 
  },

  // Social Media
  { 
    id: 'mcp-twitter', 
    name: 'Twitter/X', 
    description: 'Timeline, tweets, DMs, hashtags, and engagement', 
    category: 'social', 
    status: 'connected', 
    icon: '🐦', 
    latency: 56, 
    requestsToday: 2891 
  },
  { 
    id: 'mcp-linkedin', 
    name: 'LinkedIn', 
    description: 'Search, message, connect, and profile automation', 
    category: 'social', 
    status: 'requires-key', 
    icon: '💼', 
    envRequired: ['LINKED_API_TOKEN', 'IDENTIFICATION_TOKEN'],
    latency: 78, 
    requestsToday: 1456 
  },
  { 
    id: 'mcp-facebook', 
    name: 'Facebook Pages', 
    description: 'Page management - posts, comments, insights', 
    category: 'social', 
    status: 'requires-key', 
    icon: '📘', 
    envRequired: ['FACEBOOK_ACCESS_TOKEN', 'FACEBOOK_PAGE_ID'],
    latency: 67, 
    requestsToday: 892 
  },
  { 
    id: 'mcp-youtube', 
    name: 'YouTube Upload', 
    description: 'Video uploader with OAuth2 authentication', 
    category: 'social', 
    status: 'requires-key', 
    icon: '📺', 
    envRequired: ['YOUTUBE_CLIENT_SECRET_FILE'],
    latency: 456, 
    requestsToday: 234 
  },

  // Marketing & Ads
  { 
    id: 'mcp-facebookads', 
    name: 'Facebook Ads', 
    description: 'Meta Ads management, campaigns, and analytics', 
    category: 'marketing', 
    status: 'requires-key', 
    icon: '📢', 
    envRequired: ['FACEBOOK_ADS_TOKEN'],
    latency: 89, 
    requestsToday: 567 
  },
  { 
    id: 'mcp-googleads', 
    name: 'Google Ads', 
    description: 'Google Ads API with OAuth for campaign management', 
    category: 'marketing', 
    status: 'requires-key', 
    icon: '📊', 
    envRequired: ['GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_OAUTH_CONFIG_PATH'],
    latency: 112, 
    requestsToday: 345 
  },

  // Payments & Business
  { 
    id: 'mcp-stripe', 
    name: 'Stripe', 
    description: 'Payment processing, subscriptions, and invoices', 
    category: 'analytics', 
    status: 'requires-key', 
    icon: '💳', 
    envRequired: ['STRIPE_SECRET_KEY'],
    latency: 47, 
    requestsToday: 1892 
  },

  // Design & Creative
  { 
    id: 'mcp-canva', 
    name: 'Canva Dev', 
    description: 'Canva app development tools and documentation', 
    category: 'design', 
    status: 'connected', 
    icon: '🖌️', 
    latency: 78, 
    requestsToday: 456 
  },

  // Productivity
  { 
    id: 'mcp-maps', 
    name: 'Google Maps', 
    description: 'Location services, directions, and place search', 
    category: 'automation', 
    status: 'requires-key', 
    icon: '🗺️', 
    envRequired: ['GOOGLE_MAPS_API_KEY'],
    latency: 34, 
    requestsToday: 2341 
  },
  { 
    id: 'mcp-googlecalendar', 
    name: 'Google Calendar', 
    description: 'Calendar integration - events, scheduling, OAuth2', 
    category: 'automation', 
    status: 'requires-key', 
    icon: '📅', 
    envRequired: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    latency: 45, 
    requestsToday: 1234 
  },
  { 
    id: 'mcp-artifacts', 
    name: 'Artifacts MMO', 
    description: 'Report rendering, dashboards, charts, and document generation', 
    category: 'design', 
    status: 'requires-key', 
    icon: '🎪', 
    envRequired: ['ARTIFACTS_MMO_TOKEN'],
    toolCount: 6,
    latency: 120, 
    requestsToday: 0 
  },

  // E-Commerce MCPs (User Keys Only - connects to user's stores)
  { 
    id: 'mcp-shopify', 
    name: 'Shopify', 
    description: 'Full e-commerce store management - products, orders, inventory, customers', 
    category: 'ecommerce', 
    status: 'requires-key', 
    icon: '🛍️', 
    envRequired: ['SHOPIFY_ACCESS_TOKEN', 'SHOPIFY_STORE_URL'],
    toolCount: 9,
    requiresUserKeys: true,
  },
  { 
    id: 'mcp-etsy', 
    name: 'Etsy', 
    description: 'Handmade marketplace - listings, shop management, orders, reviews', 
    category: 'ecommerce', 
    status: 'requires-key', 
    icon: '🧶', 
    envRequired: ['ETSY_API_KEY', 'ETSY_ACCESS_TOKEN'],
    toolCount: 8,
    requiresUserKeys: true,
  },
  { 
    id: 'mcp-woocommerce', 
    name: 'WooCommerce', 
    description: 'WordPress e-commerce - products, orders, coupons, reports', 
    category: 'ecommerce', 
    status: 'requires-key', 
    icon: '🛒', 
    envRequired: ['WOOCOMMERCE_URL', 'WOOCOMMERCE_CONSUMER_KEY', 'WOOCOMMERCE_CONSUMER_SECRET'],
    toolCount: 10,
    requiresUserKeys: true,
  },

  // Trading MCPs (User Keys Only - connects to user's brokerage accounts)
  { 
    id: 'mcp-alpaca', 
    name: 'Alpaca Trading', 
    description: 'Stock trading API - orders, positions, market data, portfolio history', 
    category: 'trading', 
    status: 'requires-key', 
    icon: '📈', 
    envRequired: ['ALPACA_API_KEY', 'ALPACA_SECRET_KEY'],
    toolCount: 12,
    requiresUserKeys: true,
  },
  { 
    id: 'mcp-coinbase', 
    name: 'Coinbase', 
    description: 'Crypto trading - accounts, orders, portfolios, market data', 
    category: 'trading', 
    status: 'requires-key', 
    icon: '🪙', 
    envRequired: ['COINBASE_API_KEY', 'COINBASE_API_SECRET'],
    toolCount: 10,
    requiresUserKeys: true,
  },
  { 
    id: 'mcp-binance', 
    name: 'Binance', 
    description: 'Crypto exchange - spot trading, orders, balances, market data', 
    category: 'trading', 
    status: 'requires-key', 
    icon: '💹', 
    envRequired: ['BINANCE_API_KEY', 'BINANCE_SECRET_KEY'],
    toolCount: 11,
    requiresUserKeys: true,
  },
];

export const categoryColors: Record<MCPServer['category'], { bg: string; text: string; border: string }> = {
  development: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/30' },
  communication: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  automation: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  analytics: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  ai: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  storage: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  marketing: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
  voice: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  design: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/30' },
  social: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/30' },
  ecommerce: { bg: 'bg-lime-500/10', text: 'text-lime-400', border: 'border-lime-500/30' },
  trading: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
};

// Map agents to their connected MCP servers based on AMROGEN architecture
export const agentMCPConnections: Record<string, string[]> = {
  // Market Intelligence Division
  'agent-1': ['mcp-perplexity', 'mcp-contentcore', 'mcp-twitter'],
  'agent-2': ['mcp-perplexity', 'mcp-browseruse', 'mcp-contentcore'],
  
  // Product Development Division
  'agent-3': ['mcp-github', 'mcp-21stdev', 'mcp-shadcn'],
  'agent-4': ['mcp-github', 'mcp-playwright', 'mcp-chrome'],
  'agent-5': ['mcp-playwright', 'mcp-chrome', 'mcp-browseruse'],
  
  // Creative & Brand Division
  'agent-6': ['mcp-canva', 'mcp-falai', 'mcp-21stdev'],
  'agent-7': ['mcp-perplexity', 'mcp-contentcore', 'mcp-falai'],
  'agent-8': ['mcp-canva', 'mcp-falai', 'mcp-shadcn'],
  
  // Marketing & Growth Division
  'agent-9': ['mcp-perplexity', 'mcp-contentcore', 'mcp-browseruse'],
  'agent-10': ['mcp-twitter', 'mcp-linkedin', 'mcp-facebook'],
  'agent-11': ['mcp-facebookads', 'mcp-googleads', 'mcp-stripe'],
  'agent-12': ['mcp-linkedin', 'mcp-twitter', 'mcp-whatsapp'],
  
  // Sales & Customer Division
  'agent-13': ['mcp-vapi', 'mcp-callcenter', 'mcp-whatsapp'],
  'agent-14': ['mcp-vapi', 'mcp-callcenter', 'mcp-stripe'],
  'agent-15': ['mcp-whatsapp', 'mcp-vapi', 'mcp-kokorotts'],
  'agent-16': ['mcp-whatsapp', 'mcp-twitter', 'mcp-linkedin'],
  
  // Operations & Analytics Division
  'agent-17': ['mcp-linear', 'mcp-github', 'mcp-googlecalendar'],
  'agent-18': ['mcp-stripe', 'mcp-fs', 'mcp-github'],
  'agent-19': ['mcp-contentcore', 'mcp-perplexity', 'mcp-browseruse'],
  'agent-20': ['mcp-browseruse', 'mcp-playwright', 'mcp-contentcore'],
  
  // Strategic & Compliance Division
  'agent-21': ['mcp-perplexity', 'mcp-contentcore', 'mcp-github'],
  'agent-22': ['mcp-perplexity', 'mcp-agentmcp', 'mcp-browseruse'],
  
  // Special Operations Division
  'agent-23': ['mcp-twitter', 'mcp-linkedin', 'mcp-facebookads'],
  'agent-24': ['mcp-linear', 'mcp-stripe', 'mcp-vapi'],
  'agent-25': ['mcp-stripe', 'mcp-perplexity', 'mcp-agentmcp'],
};
