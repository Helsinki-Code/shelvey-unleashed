import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Bot, TrendingUp, Grid3X3, Repeat, Loader2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface TradingStrategyBuilderProps {
  projectId?: string;
  exchange?: string;
  exchangeType?: 'stocks' | 'crypto';
  onStrategyCreated?: () => void;
}

type StrategyType = 'dca' | 'grid' | 'momentum';

const strategyConfigs: Record<StrategyType, { name: string; description: string; icon: any }> = {
  dca: {
    name: 'Dollar Cost Averaging',
    description: 'Buy a fixed amount at regular intervals',
    icon: Repeat,
  },
  grid: {
    name: 'Grid Trading',
    description: 'Place buy/sell orders at price intervals',
    icon: Grid3X3,
  },
  momentum: {
    name: 'Momentum Trading',
    description: 'Trade based on price momentum signals',
    icon: TrendingUp,
  },
};

export function TradingStrategyBuilder({ projectId, exchange: propExchange, exchangeType, onStrategyCreated }: TradingStrategyBuilderProps) {
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const [strategyType, setStrategyType] = useState<StrategyType>('dca');
  const [exchange, setExchange] = useState(propExchange || 'alpaca');
  const [paperMode, setPaperMode] = useState(true);
  const [name, setName] = useState('');
  
  // DCA parameters
  const [dcaSymbol, setDcaSymbol] = useState('AAPL');
  const [dcaAmount, setDcaAmount] = useState(100);
  const [dcaFrequency, setDcaFrequency] = useState('daily');

  // Grid parameters
  const [gridSymbol, setGridSymbol] = useState('BTC/USD');
  const [gridUpper, setGridUpper] = useState(50000);
  const [gridLower, setGridLower] = useState(40000);
  const [gridLevels, setGridLevels] = useState(10);
  const [gridTotal, setGridTotal] = useState(1000);

  // Momentum parameters
  const [momentumSymbol, setMomentumSymbol] = useState('SPY');
  const [momentumLookback, setMomentumLookback] = useState(14);
  const [momentumThreshold, setMomentumThreshold] = useState(5);

  const createStrategy = async () => {
    if (!name.trim()) {
      toast.error('Please enter a strategy name');
      return;
    }

    setCreating(true);
    try {
      let parameters: Record<string, any> = {};

      switch (strategyType) {
        case 'dca':
          parameters = { symbol: dcaSymbol, amount: dcaAmount, frequency: dcaFrequency };
          break;
        case 'grid':
          parameters = { 
            symbol: gridSymbol, 
            upperPrice: gridUpper, 
            lowerPrice: gridLower, 
            gridLevels, 
            totalAmount: gridTotal 
          };
          break;
        case 'momentum':
          parameters = { 
            symbol: momentumSymbol, 
            lookbackPeriod: momentumLookback, 
            threshold: momentumThreshold 
          };
          break;
      }

      const { data, error } = await supabase.functions.invoke('trading-ai-agent', {
        body: {
          action: 'create_strategy',
          userId: user?.id,
          params: {
            name,
            exchange,
            strategyType,
            parameters,
            paperMode,
            projectId,
          },
        },
      });

      if (error) throw error;
      
      toast.success(`Strategy "${name}" created!`);
      setName('');
      onStrategyCreated?.();
    } catch (error) {
      console.error('Error creating strategy:', error);
      toast.error('Failed to create strategy');
    } finally {
      setCreating(false);
    }
  };

  const StrategyIcon = strategyConfigs[strategyType].icon;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Create Trading Strategy</CardTitle>
            <CardDescription>Configure an AI-powered trading strategy</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Strategy Name */}
        <div className="space-y-2">
          <Label>Strategy Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My DCA Strategy"
          />
        </div>

        {/* Exchange Selection */}
        <div className="space-y-2">
          <Label>Exchange</Label>
          <Select value={exchange} onValueChange={setExchange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alpaca">Alpaca (Stocks)</SelectItem>
              <SelectItem value="coinbase">Coinbase (Crypto)</SelectItem>
              <SelectItem value="binance">Binance (Crypto)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Strategy Type Selection */}
        <div className="space-y-2">
          <Label>Strategy Type</Label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(strategyConfigs) as StrategyType[]).map((type) => {
              const config = strategyConfigs[type];
              const Icon = config.icon;
              return (
                <Button
                  key={type}
                  variant={strategyType === type ? 'default' : 'outline'}
                  className="h-auto py-3 flex flex-col gap-1"
                  onClick={() => setStrategyType(type)}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs">{config.name.split(' ')[0]}</span>
                </Button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">{strategyConfigs[strategyType].description}</p>
        </div>

        {/* Strategy Parameters */}
        <div className="space-y-4 p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <StrategyIcon className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">{strategyConfigs[strategyType].name} Settings</span>
          </div>

          {strategyType === 'dca' && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Symbol</Label>
                  <Input value={dcaSymbol} onChange={(e) => setDcaSymbol(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Amount ($)</Label>
                  <Input 
                    type="number" 
                    value={dcaAmount} 
                    onChange={(e) => setDcaAmount(Number(e.target.value))} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Frequency</Label>
                <Select value={dcaFrequency} onValueChange={setDcaFrequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {strategyType === 'grid' && (
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Symbol</Label>
                <Input value={gridSymbol} onChange={(e) => setGridSymbol(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Upper Price ($)</Label>
                  <Input 
                    type="number" 
                    value={gridUpper} 
                    onChange={(e) => setGridUpper(Number(e.target.value))} 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Lower Price ($)</Label>
                  <Input 
                    type="number" 
                    value={gridLower} 
                    onChange={(e) => setGridLower(Number(e.target.value))} 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Grid Levels</Label>
                  <Input 
                    type="number" 
                    value={gridLevels} 
                    onChange={(e) => setGridLevels(Number(e.target.value))} 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Total Amount ($)</Label>
                  <Input 
                    type="number" 
                    value={gridTotal} 
                    onChange={(e) => setGridTotal(Number(e.target.value))} 
                  />
                </div>
              </div>
            </div>
          )}

          {strategyType === 'momentum' && (
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Symbol</Label>
                <Input value={momentumSymbol} onChange={(e) => setMomentumSymbol(e.target.value)} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs">Lookback Period</Label>
                  <span className="text-xs text-muted-foreground">{momentumLookback} days</span>
                </div>
                <Slider
                  value={[momentumLookback]}
                  onValueChange={([v]) => setMomentumLookback(v)}
                  min={5}
                  max={50}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs">Signal Threshold</Label>
                  <span className="text-xs text-muted-foreground">{momentumThreshold}%</span>
                </div>
                <Slider
                  value={[momentumThreshold]}
                  onValueChange={([v]) => setMomentumThreshold(v)}
                  min={1}
                  max={20}
                />
              </div>
            </div>
          )}
        </div>

        {/* Paper Mode Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div>
            <Label className="font-medium">Paper Trading Mode</Label>
            <p className="text-xs text-muted-foreground">Test strategy without real money</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={paperMode ? 'secondary' : 'destructive'} className="text-xs">
              {paperMode ? 'PAPER' : 'LIVE'}
            </Badge>
            <Switch checked={paperMode} onCheckedChange={setPaperMode} />
          </div>
        </div>

        {/* Create Button */}
        <Button onClick={createStrategy} disabled={creating} className="w-full">
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Create Strategy
        </Button>
      </CardContent>
    </Card>
  );
}
