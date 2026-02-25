import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface MarketDataTickerProps {
  exchangeId: string;
  mcpId: string;
  exchangeType: 'stocks' | 'crypto';
}

const STOCK_SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA'];
const CRYPTO_SYMBOLS = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'DOGE-USD', 'XRP-USD'];

export const MarketDataTicker = ({ exchangeId, mcpId, exchangeType }: MarketDataTickerProps) => {
  const { user } = useAuth();
  const [tickers, setTickers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && mcpId) {
      fetchMarketData();
      // Refresh every 30 seconds
      const interval = setInterval(fetchMarketData, 30000);
      return () => clearInterval(interval);
    }
  }, [user, mcpId, exchangeType]);

  const fetchMarketData = async () => {
    if (!user) return;
    
    try {
      const symbols = exchangeType === 'stocks' ? STOCK_SYMBOLS : CRYPTO_SYMBOLS;
      
      const { data, error } = await supabase.functions.invoke(mcpId, {
        body: {
          tool: exchangeType === 'stocks' ? 'get_market_data' : 'get_ticker_price',
          arguments: { 
            symbols: symbols.join(','),
            symbol: symbols[0] // For single-symbol APIs
          },
          userId: user.id
        }
      });

      if (error) throw error;

      // Handle different response formats
      let tickerData = [];
      if (Array.isArray(data?.data)) {
        tickerData = data.data;
      } else if (data?.data?.quotes) {
        tickerData = data.data.quotes;
      } else if (data?.data) {
        // Single ticker response
        tickerData = [data.data];
      }

      setTickers(tickerData);
    } catch (err) {
      console.error('Error fetching market data:', err);
      setTickers([]);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: any) => {
    const num = parseFloat(String(price)) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: num > 100 ? 2 : 4
    }).format(num);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 overflow-x-auto">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-32 shrink-0" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex gap-4 overflow-x-auto pb-2">
          {tickers.map((ticker, index) => {
            const symbol = ticker.symbol || ticker.S || 'Unknown';
            const price = ticker.price || ticker.ap || ticker.c || ticker.last || 0;
            const change = ticker.change || ticker.d || 0;
            const changePercent = ticker.changePercent || ticker.dp || ticker.change_percent || 0;
            const isPositive = parseFloat(String(changePercent)) >= 0;

            return (
              <div
                key={symbol || index}
                className={cn(
                  "shrink-0 p-3 rounded-lg border transition-colors",
                  isPositive ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="font-mono text-xs">
                    {symbol.replace('-USD', '')}
                  </Badge>
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                </div>
                <div className="font-bold font-mono">
                  {formatPrice(price)}
                </div>
                <div className={cn(
                  "text-xs font-mono",
                  isPositive ? "text-green-500" : "text-red-500"
                )}>
                  {isPositive ? '+' : ''}{parseFloat(String(changePercent)).toFixed(2)}%
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
