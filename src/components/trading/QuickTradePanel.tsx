import { useState } from 'react';
import { ArrowUpCircle, ArrowDownCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface QuickTradePanelProps {
  projectId?: string;
  exchangeId: string;
  mcpId: string;
  exchangeType: 'stocks' | 'crypto';
  onOrderPlaced: () => void;
}

export const QuickTradePanel = ({ projectId, exchangeId, mcpId, exchangeType, onOrderPlaced }: QuickTradePanelProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [limitPrice, setLimitPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !symbol || !quantity) return;
    if (!projectId) {
      toast({
        title: 'Project Required',
        description: 'Select a trading project before placing live orders.',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('trading-order-gateway', {
        body: {
          projectId,
          symbol: symbol.toUpperCase(),
          side,
          orderType,
          quantity: parseFloat(quantity),
          limitPrice: orderType === 'limit' && limitPrice ? parseFloat(limitPrice) : undefined,
          source: `quick-trade-panel:${exchangeId}:${mcpId}:${exchangeType}`,
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Trade execution rejected');

      toast({
        title: 'Order Placed!',
        description: `${side.toUpperCase()} ${quantity} ${symbol.toUpperCase()} at ${orderType === 'market' ? 'market price' : `$${limitPrice}`}`,
      });

      // Reset form
      setSymbol('');
      setQuantity('');
      setLimitPrice('');
      onOrderPlaced();
    } catch (err: any) {
      console.error('Error placing order:', err);
      toast({
        title: 'Order Failed',
        description: err.message || 'Could not place the order. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const popularSymbols = exchangeType === 'stocks' 
    ? ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA']
    : ['BTC-USD', 'ETH-USD', 'SOL-USD', 'DOGE-USD'];

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          {side === 'buy' ? (
            <ArrowUpCircle className="h-5 w-5 text-green-500" />
          ) : (
            <ArrowDownCircle className="h-5 w-5 text-red-500" />
          )}
          Quick Trade
        </CardTitle>
        <CardDescription>Place orders instantly</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Buy/Sell Toggle */}
          <Tabs value={side} onValueChange={(v) => setSide(v as 'buy' | 'sell')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger 
                value="buy" 
                className="data-[state=active]:bg-green-500 data-[state=active]:text-white"
              >
                Buy
              </TabsTrigger>
              <TabsTrigger 
                value="sell"
                className="data-[state=active]:bg-red-500 data-[state=active]:text-white"
              >
                Sell
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Symbol Input */}
          <div className="space-y-2">
            <Label htmlFor="symbol">Symbol</Label>
            <Input
              id="symbol"
              placeholder={exchangeType === 'stocks' ? 'AAPL' : 'BTC-USD'}
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="font-mono"
            />
            <div className="flex flex-wrap gap-1">
              {popularSymbols.map((s) => (
                <Button
                  key={s}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setSymbol(s)}
                >
                  {s.replace('-USD', '')}
                </Button>
              ))}
            </div>
          </div>

          {/* Quantity Input */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              step={exchangeType === 'crypto' ? '0.0001' : '1'}
              min="0"
              placeholder="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="font-mono"
            />
          </div>

          {/* Order Type */}
          <div className="space-y-2">
            <Label>Order Type</Label>
            <Select value={orderType} onValueChange={(v) => setOrderType(v as 'market' | 'limit')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="market">Market</SelectItem>
                <SelectItem value="limit">Limit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Limit Price (conditional) */}
          {orderType === 'limit' && (
            <div className="space-y-2">
              <Label htmlFor="limitPrice">Limit Price ($)</Label>
              <Input
                id="limitPrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                className="font-mono"
              />
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className={cn(
              "w-full",
              side === 'buy' 
                ? "bg-green-500 hover:bg-green-600" 
                : "bg-red-500 hover:bg-red-600"
            )}
            disabled={submitting || !symbol || !quantity}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Placing Order...
              </>
            ) : (
              <>
                {side === 'buy' ? 'Buy' : 'Sell'} {symbol || 'Symbol'}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
