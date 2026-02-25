export interface TradingAgent {
  id: string;
  name: string;
  title: string;
  emoji: string;
  description: string;
  responsibilities: string[];
  color: string;
  category: 'strategy' | 'analysis' | 'execution' | 'risk' | 'operations' | 'reporting';
}

export const TRADING_AGENTS: Record<string, TradingAgent> = {
  'chief-strategy': {
    id: 'chief-strategy',
    name: 'Chief Strategy Agent',
    title: 'The Macro Visionary',
    emoji: '🧠',
    description: 'Develops overarching trading strategy and investment thesis based on macroeconomic conditions',
    responsibilities: [
      'Macro analysis: rates, inflation, GDP, geopolitics',
      'Portfolio allocation across asset classes',
      'Market regime detection (bull/bear/sideways)',
      'Strategic directive setting',
      'Quarterly strategy recalibration',
    ],
    color: 'hsl(var(--primary))',
    category: 'strategy',
  },
  'market-research': {
    id: 'market-research',
    name: 'Market Research & Intelligence Agent',
    title: 'The All-Seeing Eye',
    emoji: '🔍',
    description: 'Continuously scans and processes data from global financial markets in real time',
    responsibilities: [
      'Scan thousands of assets across exchanges',
      'Track earnings, SEC filings, economic calendars',
      'Aggregate 500+ news sources',
      'Deep fundamental analysis',
      'Deliver intelligence briefs to all agents',
    ],
    color: 'hsl(var(--accent))',
    category: 'analysis',
  },
  'technical-analysis': {
    id: 'technical-analysis',
    name: 'Technical Analysis Agent',
    title: 'The Chart Surgeon',
    emoji: '📊',
    description: 'Multi-timeframe technical analysis with 100+ indicators and pattern detection',
    responsibilities: [
      'Multi-timeframe analysis (1m to Monthly)',
      'Chart pattern identification',
      '100+ indicator calculations',
      'Support/resistance mapping',
      'Trade signal generation with confidence scores',
    ],
    color: 'hsl(var(--chart-1))',
    category: 'analysis',
  },
  'quant-algo': {
    id: 'quant-algo',
    name: 'Quantitative & Algorithmic Agent',
    title: 'The Math Machine',
    emoji: '🤖',
    description: 'Develops, backtests, and deploys quantitative trading models and algorithms',
    responsibilities: [
      'Statistical analysis & regression models',
      'Momentum, mean reversion, pairs trading',
      'Monte Carlo simulations & stress testing',
      'Walk-forward optimization',
      'Strategy decay detection & rotation',
    ],
    color: 'hsl(var(--chart-2))',
    category: 'analysis',
  },
  'sentiment': {
    id: 'sentiment',
    name: 'Sentiment & Social Intelligence Agent',
    title: 'The Crowd Reader',
    emoji: '🧾',
    description: 'Monitors social media sentiment, whale movements, and crowd psychology',
    responsibilities: [
      'Social sentiment across X, Reddit, Telegram',
      'Whale wallet & insider tracking',
      'NLP-based news sentiment scoring',
      'Hype cycle & pump-and-dump detection',
      'Contrarian opportunity identification',
    ],
    color: 'hsl(var(--chart-3))',
    category: 'analysis',
  },
  'execution': {
    id: 'execution',
    name: 'Trade Execution Agent',
    title: 'The Precision Striker',
    emoji: '⚡',
    description: 'Executes orders with millisecond precision across all connected exchanges and brokers',
    responsibilities: [
      'Multi-order type execution (Market, Limit, Stop, etc.)',
      'Smart order routing for best price',
      'Slippage minimization',
      'Multi-platform simultaneous execution',
      'Position scaling & partial fills',
    ],
    color: 'hsl(var(--chart-4))',
    category: 'execution',
  },
  'risk-management': {
    id: 'risk-management',
    name: 'Risk Management Agent',
    title: 'The Capital Guardian',
    emoji: '🛡️',
    description: 'THE MOST CRITICAL AGENT — enforces strict risk parameters on every trade',
    responsibilities: [
      'Max risk per trade (1-2% capital)',
      'Daily/total drawdown limits',
      'Position sizing (Kelly Criterion, ATR-based)',
      'Correlation & leverage limits',
      'Circuit breakers for black swan events',
    ],
    color: 'hsl(0, 72%, 50%)',
    category: 'risk',
  },
  'portfolio': {
    id: 'portfolio',
    name: 'Portfolio Management Agent',
    title: 'The Wealth Architect',
    emoji: '💼',
    description: 'Maintains real-time portfolio overview, rebalancing, and diversification',
    responsibilities: [
      'Asset allocation & rebalancing',
      'Sector rotation strategies',
      'Tax-loss harvesting',
      'Dividend reinvestment & compounding',
      'Sharpe/Sortino/drawdown metrics',
    ],
    color: 'hsl(var(--chart-5))',
    category: 'operations',
  },
  'news-events': {
    id: 'news-events',
    name: 'News & Events Agent',
    title: 'The Breaking News Desk',
    emoji: '📰',
    description: 'Monitors global news feeds 24/7 and implements news-based trading triggers',
    responsibilities: [
      'Sub-second news monitoring',
      'FOMC, CPI, NFP tracking',
      'Earnings surprise reactions',
      'Event urgency classification',
      'Fake news detection',
    ],
    color: 'hsl(45, 93%, 47%)',
    category: 'analysis',
  },
  'session-manager': {
    id: 'session-manager',
    name: 'Multi-Market Session Manager Agent',
    title: 'The Global Clock',
    emoji: '🌐',
    description: 'Manages trading across all global market sessions: Asia, Europe, North America',
    responsibilities: [
      'Asia-Pacific session management',
      'European session strategies',
      'North American session execution',
      'Overnight risk & gap protection',
      'Session overlap opportunity capture',
    ],
    color: 'hsl(200, 80%, 50%)',
    category: 'operations',
  },
  'backtesting': {
    id: 'backtesting',
    name: 'Backtesting & Optimization Agent',
    title: 'The Time Traveler',
    emoji: '🔄',
    description: 'Backtests strategies against 10+ years of data and optimizes parameters',
    responsibilities: [
      '10+ years historical backtesting',
      'Walk-forward optimization',
      'Monte Carlo scenario simulation',
      'Strategy robustness evaluation',
      'Paper trading sandbox management',
    ],
    color: 'hsl(280, 60%, 55%)',
    category: 'analysis',
  },
  'performance': {
    id: 'performance',
    name: 'Performance & Analytics Agent',
    title: 'The Scorekeeper',
    emoji: '📈',
    description: 'Generates comprehensive performance reports and actionable insights',
    responsibilities: [
      'Total return tracking (daily to all-time)',
      'Win rate & profit factor analysis',
      'Sharpe/Sortino ratio calculation',
      'Equity curves & heat maps',
      'Index benchmarking (S&P 500, BTC)',
    ],
    color: 'hsl(140, 70%, 40%)',
    category: 'reporting',
  },
  'communication': {
    id: 'communication',
    name: 'User Communication & Reporting Agent',
    title: 'The Personal CFO',
    emoji: '💬',
    description: 'Provides real-time updates and clear explanations of every trade decision',
    responsibilities: [
      'Real-time portfolio updates',
      'Jargon-free trade explanations',
      'Multi-channel alerts (push, email, Telegram)',
      'Weekly portfolio briefings',
      'Transparent loss reporting',
    ],
    color: 'hsl(220, 70%, 55%)',
    category: 'reporting',
  },
  'infrastructure': {
    id: 'infrastructure',
    name: 'Infrastructure & Systems Agent',
    title: 'The Engine Room',
    emoji: '🛠️',
    description: 'Monitors uptime, API connections, and ensures redundant connectivity',
    responsibilities: [
      'System uptime monitoring',
      'API connection health checks',
      'Latency optimization',
      'Failover & backup routes',
      '60-second health check cycle',
    ],
    color: 'hsl(30, 70%, 50%)',
    category: 'operations',
  },
  'compliance': {
    id: 'compliance',
    name: 'Compliance & Security Agent',
    title: 'The Vault Keeper',
    emoji: '🔐',
    description: 'Ensures regulatory compliance, audit trails, and security protections',
    responsibilities: [
      'AML monitoring',
      'Complete audit trails',
      'API key encryption & access control',
      'Exchange security monitoring',
      'Tax reporting readiness',
    ],
    color: 'hsl(350, 60%, 45%)',
    category: 'risk',
  },
  'orchestrator': {
    id: 'orchestrator',
    name: 'Orchestrator / Master Controller Agent',
    title: 'The Conductor',
    emoji: '🔄',
    description: 'Coordinates all 15+ agents into a seamless, unified operation',
    responsibilities: [
      'Multi-agent coordination',
      'Consensus & voting mechanisms',
      'Conflict resolution between agents',
      'Priority & resource management',
      'Master operational dashboard',
    ],
    color: 'hsl(var(--primary))',
    category: 'operations',
  },
};

export const AGENT_CATEGORIES = {
  strategy: { label: 'Strategy', emoji: '🧠', color: 'hsl(var(--primary))' },
  analysis: { label: 'Analysis', emoji: '📊', color: 'hsl(var(--accent))' },
  execution: { label: 'Execution', emoji: '⚡', color: 'hsl(var(--chart-4))' },
  risk: { label: 'Risk & Compliance', emoji: '🛡️', color: 'hsl(0, 72%, 50%)' },
  operations: { label: 'Operations', emoji: '🌐', color: 'hsl(200, 80%, 50%)' },
  reporting: { label: 'Reporting', emoji: '📈', color: 'hsl(140, 70%, 40%)' },
};

export const RISK_PROFILES = [
  { id: 'conservative', label: 'Conservative', emoji: '🟢', maxRiskPerTrade: '0.5%', maxDailyDD: '2%', targetMonthly: '3-5%', style: 'Slow & steady, capital preservation' },
  { id: 'moderate', label: 'Moderate', emoji: '🟡', maxRiskPerTrade: '1%', maxDailyDD: '4%', targetMonthly: '5-10%', style: 'Balanced growth with controlled risk' },
  { id: 'aggressive', label: 'Aggressive', emoji: '🟠', maxRiskPerTrade: '2%', maxDailyDD: '6%', targetMonthly: '10-20%', style: 'Higher returns, higher volatility' },
  { id: 'degen', label: 'Degen Mode', emoji: '🔴', maxRiskPerTrade: '3-5%', maxDailyDD: '10%', targetMonthly: '20%+', style: 'Maximum opportunity, maximum risk' },
];

export const MARKET_SESSIONS = [
  { id: 'asia', label: 'Asia-Pacific', emoji: '🌏', hours: '00:00 – 09:00 UTC', markets: 'Forex, Asian equities, crypto', cities: 'Tokyo, Sydney, Shanghai' },
  { id: 'europe', label: 'European', emoji: '🌍', hours: '07:00 – 16:00 UTC', markets: 'Forex, European equities, commodities', cities: 'London, Frankfurt, Zurich' },
  { id: 'americas', label: 'North American', emoji: '🌎', hours: '13:00 – 21:00 UTC', markets: 'US equities, options, futures, forex', cities: 'New York, Chicago, Toronto' },
  { id: 'crypto', label: 'Overnight / Crypto', emoji: '🌙', hours: '24/7 Global', markets: 'Crypto, forex, futures', cities: 'Always active' },
];

export const SUPPORTED_MARKETS = [
  { category: 'US Stocks', emoji: '🏦', assets: 'NYSE, NASDAQ — 8,000+ equities, ETFs', hours: 'Market hours + pre/post' },
  { category: 'Forex', emoji: '💱', assets: '80+ currency pairs', hours: '24/5 (Sun–Fri)' },
  { category: 'Cryptocurrency', emoji: '₿', assets: 'BTC, ETH, SOL, 500+ altcoins', hours: '24/7/365' },
  { category: 'Commodities', emoji: '📦', assets: 'Gold, silver, oil, natural gas', hours: 'Exchange hours' },
  { category: 'Futures', emoji: '📋', assets: 'Index, commodity, bond futures', hours: 'Nearly 24/5' },
  { category: 'Options', emoji: '🎯', assets: 'Equity, index, crypto options', hours: 'Market hours' },
];

// Legacy compatibility
export const TRADING_PHASES = [
  { number: 1, name: 'Research', agent: { id: 'market-research', name: 'Market Research & Intelligence Agent', phase: 1, phaseName: 'Research', description: 'Market analysis, trend detection, opportunity scanning', mcpServers: ['mcp-perplexity', 'mcp-alpaca', 'mcp-binance', 'mcp-coinbase'], color: 'hsl(var(--chart-1))', icon: 'Search' } },
  { number: 2, name: 'Strategy', agent: { id: 'chief-strategy', name: 'Chief Strategy Agent', phase: 2, phaseName: 'Strategy', description: 'Strategy formulation, risk parameters, entry/exit rules', mcpServers: ['mcp-openai', 'mcp-perplexity'], color: 'hsl(var(--chart-2))', icon: 'Brain' } },
  { number: 3, name: 'Setup', agent: { id: 'infrastructure', name: 'Infrastructure & Systems Agent', phase: 3, phaseName: 'Setup', description: 'Exchange connection, fund allocation, position sizing', mcpServers: ['mcp-alpaca', 'mcp-binance', 'mcp-coinbase'], color: 'hsl(var(--chart-3))', icon: 'Settings' } },
  { number: 4, name: 'Execution', agent: { id: 'execution', name: 'Trade Execution Agent', phase: 4, phaseName: 'Execution', description: 'Order placement, fill monitoring, slippage management', mcpServers: ['mcp-alpaca', 'mcp-binance', 'mcp-coinbase'], color: 'hsl(var(--chart-4))', icon: 'Zap' } },
  { number: 5, name: 'Monitor', agent: { id: 'risk-management', name: 'Risk Management Agent', phase: 5, phaseName: 'Monitor', description: 'Real-time P&L tracking, alerts, risk monitoring', mcpServers: ['mcp-alpaca', 'mcp-binance', 'mcp-coinbase'], color: 'hsl(var(--chart-5))', icon: 'Activity' } },
  { number: 6, name: 'Optimize', agent: { id: 'backtesting', name: 'Backtesting & Optimization Agent', phase: 6, phaseName: 'Optimize', description: 'Performance analysis, strategy refinement, rebalancing', mcpServers: ['mcp-openai', 'mcp-perplexity'], color: 'hsl(var(--primary))', icon: 'TrendingUp' } },
];

export const getAgentByPhase = (phase: number) => {
  return TRADING_PHASES.find(p => p.number === phase)?.agent;
};

export const getPhaseRequiresApproval = (phase: number): boolean => {
  return phase === 3 || phase === 4;
};
