import { TrendingUp, TrendingDown, DollarSign, Wallet, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface PortfolioOverviewProps {
  data: any;
  exchangeType: 'stocks' | 'crypto';
  isLoading: boolean;
}

export const PortfolioOverview = ({ data, exchangeType, isLoading }: PortfolioOverviewProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Parse data from different exchange formats
  const equity = data?.equity || data?.portfolio_value || data?.balance || 0;
  const cash = data?.cash || data?.buying_power || data?.available_balance || 0;
  const dayPL = data?.daily_profit_loss || data?.unrealized_pl || 0;
  const totalPL = data?.unrealized_pl || data?.profit_loss || 0;
  
  const dayPLPercent = equity > 0 ? ((dayPL / equity) * 100).toFixed(2) : '0.00';
  const isPositive = parseFloat(String(dayPL)) >= 0;

  const formatCurrency = (value: any) => {
    const num = parseFloat(String(value)) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const metrics = [
    {
      label: 'Portfolio Value',
      value: formatCurrency(equity),
      icon: Wallet,
      color: 'text-primary'
    },
    {
      label: exchangeType === 'stocks' ? 'Buying Power' : 'Available Balance',
      value: formatCurrency(cash),
      icon: DollarSign,
      color: 'text-blue-500'
    },
    {
      label: "Today's P&L",
      value: `${isPositive ? '+' : ''}${formatCurrency(dayPL)}`,
      subvalue: `${isPositive ? '+' : ''}${dayPLPercent}%`,
      icon: isPositive ? TrendingUp : TrendingDown,
      color: isPositive ? 'text-green-500' : 'text-red-500'
    },
    {
      label: 'Unrealized P&L',
      value: `${parseFloat(String(totalPL)) >= 0 ? '+' : ''}${formatCurrency(totalPL)}`,
      icon: BarChart3,
      color: parseFloat(String(totalPL)) >= 0 ? 'text-green-500' : 'text-red-500'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {metrics.map((metric, index) => (
        <Card key={index} className="bg-gradient-to-br from-card to-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{metric.label}</span>
              <metric.icon className={cn("h-4 w-4", metric.color)} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-2xl font-bold", metric.color)}>
                {metric.value}
              </span>
              {metric.subvalue && (
                <span className={cn("text-sm", metric.color)}>
                  {metric.subvalue}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
