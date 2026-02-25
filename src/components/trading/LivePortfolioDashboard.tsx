import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp, TrendingDown, DollarSign, Activity, Shield, Clock,
} from 'lucide-react';

interface LivePortfolioDashboardProps {
  portfolioValue: number;
  todayPL: number;
  monthPL: number;
  allTimeReturn: number;
  allTimeReturnPct: number;
  activePositions: number;
  pendingOrders: number;
  tradesToday: number;
  winRateToday: number;
  riskLevel: string;
  riskExposure: number;
  systemStatus: 'operational' | 'degraded' | 'down';
  uptime: number;
  allocation: { label: string; pct: number }[];
}

const defaults: LivePortfolioDashboardProps = {
  portfolioValue: 127482.63,
  todayPL: 1247.80,
  monthPL: 8932.15,
  allTimeReturn: 27482.63,
  allTimeReturnPct: 27.48,
  activePositions: 12,
  pendingOrders: 4,
  tradesToday: 23,
  winRateToday: 74,
  riskLevel: 'MODERATE',
  riskExposure: 3.2,
  systemStatus: 'operational',
  uptime: 99.97,
  allocation: [
    { label: 'Stocks', pct: 40 },
    { label: 'Crypto', pct: 30 },
    { label: 'Forex', pct: 15 },
    { label: 'Cash', pct: 15 },
  ],
};

export const LivePortfolioDashboard = (props: Partial<LivePortfolioDashboardProps>) => {
  const d = { ...defaults, ...props };
  const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  const statCards = [
    { label: 'Total Portfolio Value', value: fmt(d.portfolioValue), sub: `+${d.allTimeReturnPct}%`, icon: DollarSign, positive: true },
    { label: "Today's P&L", value: `+${fmt(d.todayPL)}`, sub: `+${((d.todayPL / d.portfolioValue) * 100).toFixed(2)}%`, icon: TrendingUp, positive: d.todayPL >= 0 },
    { label: 'This Month', value: `+${fmt(d.monthPL)}`, sub: `+${((d.monthPL / d.portfolioValue) * 100).toFixed(2)}%`, icon: TrendingUp, positive: d.monthPL >= 0 },
    { label: 'All-Time Return', value: `+${fmt(d.allTimeReturn)}`, sub: `+${d.allTimeReturnPct}%`, icon: TrendingUp, positive: d.allTimeReturn >= 0 },
  ];

  return (
    <div className="space-y-4">
      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <s.icon className={`h-4 w-4 ${s.positive ? 'text-green-500' : 'text-destructive'}`} />
                </div>
                <p className={`text-xl font-bold ${s.positive ? 'text-green-500' : 'text-destructive'}`}>
                  {s.value}
                </p>
                <p className={`text-xs ${s.positive ? 'text-green-500/70' : 'text-destructive/70'}`}>{s.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Activity & Risk Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground">Active Positions</span>
            <p className="text-2xl font-bold">{d.activePositions}</p>
            <p className="text-xs text-muted-foreground">⏳ {d.pendingOrders} pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <span className="text-xs text-muted-foreground">Trades Today</span>
            <p className="text-2xl font-bold">{d.tradesToday}</p>
            <p className="text-xs text-green-500">Win Rate: {d.winRateToday}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1 mb-1">
              <Shield className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Risk Level</span>
            </div>
            <p className="text-xl font-bold">{d.riskLevel}</p>
            <p className="text-xs text-muted-foreground">{d.riskExposure}% exposure</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1 mb-1">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">System Status</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-semibold">ALL AGENTS OPERATIONAL</span>
            </div>
            <p className="text-xs text-muted-foreground">⏱️ {d.uptime}% uptime (30d)</p>
          </CardContent>
        </Card>
      </div>

      {/* Asset Allocation */}
      <Card>
        <CardContent className="p-4">
          <span className="text-xs text-muted-foreground mb-3 block">📊 Asset Allocation</span>
          <div className="space-y-2">
            {d.allocation.map((a, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-sm w-16">{a.label}</span>
                <span className="text-xs text-muted-foreground w-10 text-right">{a.pct}%</span>
                <Progress value={a.pct} className="h-2 flex-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
