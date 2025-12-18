export interface TradingAgent {
  id: string;
  name: string;
  phase: number;
  phaseName: string;
  description: string;
  mcpServers: string[];
  color: string;
  icon: string;
}

export const TRADING_AGENTS: Record<number, TradingAgent> = {
  1: {
    id: 'research-agent',
    name: 'Research Agent',
    phase: 1,
    phaseName: 'Research',
    description: 'Market analysis, trend detection, opportunity scanning',
    mcpServers: ['mcp-perplexity', 'mcp-alpaca', 'mcp-binance', 'mcp-coinbase'],
    color: 'hsl(var(--chart-1))',
    icon: 'Search'
  },
  2: {
    id: 'strategy-agent',
    name: 'Strategy Agent',
    phase: 2,
    phaseName: 'Strategy',
    description: 'Strategy formulation, risk parameters, entry/exit rules',
    mcpServers: ['mcp-openai', 'mcp-perplexity'],
    color: 'hsl(var(--chart-2))',
    icon: 'Brain'
  },
  3: {
    id: 'setup-agent',
    name: 'Setup Agent',
    phase: 3,
    phaseName: 'Setup',
    description: 'Exchange connection, fund allocation, position sizing',
    mcpServers: ['mcp-alpaca', 'mcp-binance', 'mcp-coinbase'],
    color: 'hsl(var(--chart-3))',
    icon: 'Settings'
  },
  4: {
    id: 'execution-agent',
    name: 'Execution Agent',
    phase: 4,
    phaseName: 'Execution',
    description: 'Order placement, fill monitoring, slippage management',
    mcpServers: ['mcp-alpaca', 'mcp-binance', 'mcp-coinbase'],
    color: 'hsl(var(--chart-4))',
    icon: 'Zap'
  },
  5: {
    id: 'monitor-agent',
    name: 'Monitor Agent',
    phase: 5,
    phaseName: 'Monitor',
    description: 'Real-time P&L tracking, alerts, risk monitoring',
    mcpServers: ['mcp-alpaca', 'mcp-binance', 'mcp-coinbase'],
    color: 'hsl(var(--chart-5))',
    icon: 'Activity'
  },
  6: {
    id: 'optimize-agent',
    name: 'Optimize Agent',
    phase: 6,
    phaseName: 'Optimize',
    description: 'Performance analysis, strategy refinement, rebalancing',
    mcpServers: ['mcp-openai', 'mcp-perplexity'],
    color: 'hsl(var(--primary))',
    icon: 'TrendingUp'
  }
};

export const TRADING_PHASES = [
  { number: 1, name: 'Research', agent: TRADING_AGENTS[1] },
  { number: 2, name: 'Strategy', agent: TRADING_AGENTS[2] },
  { number: 3, name: 'Setup', agent: TRADING_AGENTS[3] },
  { number: 4, name: 'Execution', agent: TRADING_AGENTS[4] },
  { number: 5, name: 'Monitor', agent: TRADING_AGENTS[5] },
  { number: 6, name: 'Optimize', agent: TRADING_AGENTS[6] }
];

export const getAgentByPhase = (phase: number): TradingAgent | undefined => {
  return TRADING_AGENTS[phase];
};

export const getPhaseRequiresApproval = (phase: number): boolean => {
  // Phases 3 (Setup) and 4 (Execution) require user approval before proceeding
  return phase === 3 || phase === 4;
};
