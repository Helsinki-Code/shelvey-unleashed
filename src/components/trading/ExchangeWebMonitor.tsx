import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Wallet, TrendingUp, TrendingDown } from "lucide-react";

interface Position {
  symbol: string;
  quantity: number;
  avg_cost: number;
  current_price: number;
  value: number;
}

interface ExchangeWebMonitorProps {
  exchange: string;
  isConnected: boolean;
  portfolio?: {
    account_value: number;
    cash_balance: number;
    buying_power: number;
    day_pl: number;
    day_pl_percent: number;
    positions: Position[];
  };
}

export function ExchangeWebMonitor({
  exchange,
  isConnected,
  portfolio,
}: ExchangeWebMonitorProps) {
  if (!portfolio) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            {exchange.toUpperCase()} Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-8 text-center text-gray-500">
            <p>Connect to {exchange} to view portfolio data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const gainLoss = portfolio.day_pl;
  const isPositive = gainLoss >= 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              {exchange.toUpperCase()} Monitor
            </span>
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </CardTitle>
          <CardDescription>Real-time portfolio overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Account Value</p>
              <p className="text-xl font-bold">${portfolio.account_value.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Cash Balance</p>
              <p className="text-xl font-bold">${portfolio.cash_balance.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Buying Power</p>
              <p className="text-xl font-bold">${portfolio.buying_power.toLocaleString()}</p>
            </div>
            <div className={`p-4 rounded-lg ${isPositive ? "bg-green-50" : "bg-red-50"}`}>
              <p className={`text-xs mb-1 ${isPositive ? "text-green-600" : "text-red-600"}`}>
                Day P&L
              </p>
              <div className="flex items-center gap-1">
                {isPositive ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <p className={`text-xl font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}>
                  ${Math.abs(gainLoss).toLocaleString()} ({portfolio.day_pl_percent.toFixed(2)}%)
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Open Positions ({portfolio.positions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Symbol</th>
                  <th className="text-right py-2 font-medium">Qty</th>
                  <th className="text-right py-2 font-medium">Avg Cost</th>
                  <th className="text-right py-2 font-medium">Price</th>
                  <th className="text-right py-2 font-medium">Value</th>
                  <th className="text-right py-2 font-medium">Return</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.positions.map((pos) => {
                  const gain = pos.value - pos.quantity * pos.avg_cost;
                  const gainPercent = (gain / (pos.quantity * pos.avg_cost)) * 100;
                  const isGain = gain >= 0;

                  return (
                    <tr key={pos.symbol} className="border-b hover:bg-gray-50">
                      <td className="py-2 font-medium">{pos.symbol}</td>
                      <td className="text-right py-2">{pos.quantity}</td>
                      <td className="text-right py-2">${pos.avg_cost.toFixed(2)}</td>
                      <td className="text-right py-2">${pos.current_price.toFixed(2)}</td>
                      <td className="text-right py-2 font-medium">${pos.value.toLocaleString()}</td>
                      <td className={`text-right py-2 font-medium ${isGain ? "text-green-600" : "text-red-600"}`}>
                        {isGain ? "+" : ""}
                        {gainPercent.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
