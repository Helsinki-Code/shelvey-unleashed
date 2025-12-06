import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface PositionsTableProps {
  positions: any[];
  exchangeType: 'stocks' | 'crypto';
  isLoading: boolean;
}

export const PositionsTable = ({ positions, exchangeType, isLoading }: PositionsTableProps) => {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!positions || positions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No Open Positions</h3>
          <p className="text-sm text-muted-foreground">You don't have any open positions right now.</p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: any) => {
    const num = parseFloat(String(value)) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(num);
  };

  const formatPercent = (value: any) => {
    const num = parseFloat(String(value)) || 0;
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Symbol</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Avg Cost</TableHead>
            <TableHead className="text-right">Current Price</TableHead>
            <TableHead className="text-right">Market Value</TableHead>
            <TableHead className="text-right">P&L</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {positions.map((position, index) => {
            const symbol = position.symbol || position.asset_id || 'Unknown';
            const qty = parseFloat(position.qty || position.quantity || position.size || 0);
            const avgCost = parseFloat(position.avg_entry_price || position.average_cost || position.entry_price || 0);
            const currentPrice = parseFloat(position.current_price || position.mark_price || avgCost);
            const marketValue = parseFloat(position.market_value || (qty * currentPrice) || 0);
            const pl = parseFloat(position.unrealized_pl || position.profit_loss || (marketValue - (qty * avgCost)) || 0);
            const plPercent = parseFloat(position.unrealized_plpc || position.pl_percent || ((pl / (qty * avgCost)) * 100) || 0);
            const isPositive = pl >= 0;

            return (
              <TableRow key={position.asset_id || symbol || index}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono font-bold">
                      {symbol}
                    </Badge>
                    {position.side && (
                      <Badge variant={position.side === 'long' ? 'default' : 'destructive'} className="text-xs">
                        {position.side.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {qty.toFixed(exchangeType === 'crypto' ? 6 : 0)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(avgCost)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(currentPrice)}
                </TableCell>
                <TableCell className="text-right font-mono font-semibold">
                  {formatCurrency(marketValue)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {isPositive ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <div className={cn("text-right", isPositive ? "text-green-500" : "text-red-500")}>
                      <div className="font-mono font-semibold">
                        {isPositive ? '+' : ''}{formatCurrency(pl)}
                      </div>
                      <div className="text-xs">
                        {formatPercent(plPercent * 100)}
                      </div>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
