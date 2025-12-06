import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Play, Pause, TrendingUp, TrendingDown, Loader2, Trash2, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Strategy {
  id: string;
  name: string;
  exchange: string;
  strategy_type: string;
  parameters: any;
  is_active: boolean;
  paper_mode: boolean;
  total_profit: number;
  total_trades: number;
  win_rate: number;
  created_at: string;
}

interface StrategyListProps {
  refreshTrigger: number;
}

export function StrategyList({ refreshTrigger }: StrategyListProps) {
  const { user } = useAuth();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [executing, setExecuting] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchStrategies();
    }
  }, [user, refreshTrigger]);

  const fetchStrategies = async () => {
    try {
      const { data, error } = await supabase
        .from('trading_strategies')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStrategies(data || []);
    } catch (error) {
      console.error('Error fetching strategies:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStrategy = async (strategyId: string, currentState: boolean) => {
    setToggling(strategyId);
    try {
      const { data, error } = await supabase.functions.invoke('trading-ai-agent', {
        body: {
          action: 'toggle_strategy',
          userId: user?.id,
          params: { strategyId, isActive: !currentState },
        },
      });

      if (error) throw error;
      
      setStrategies(strategies.map(s => 
        s.id === strategyId ? { ...s, is_active: !currentState } : s
      ));
      toast.success(`Strategy ${!currentState ? 'activated' : 'paused'}`);
    } catch (error) {
      console.error('Error toggling strategy:', error);
      toast.error('Failed to update strategy');
    } finally {
      setToggling(null);
    }
  };

  const executeStrategy = async (strategyId: string) => {
    setExecuting(strategyId);
    try {
      const { data, error } = await supabase.functions.invoke('trading-ai-agent', {
        body: {
          action: 'execute_strategy',
          userId: user?.id,
          params: { strategyId },
        },
      });

      if (error) throw error;
      
      toast.success(data.message || 'Strategy executed');
      fetchStrategies();
    } catch (error) {
      console.error('Error executing strategy:', error);
      toast.error('Failed to execute strategy');
    } finally {
      setExecuting(null);
    }
  };

  const deleteStrategy = async (strategyId: string) => {
    try {
      const { error } = await supabase
        .from('trading_strategies')
        .delete()
        .eq('id', strategyId)
        .eq('user_id', user?.id);

      if (error) throw error;
      
      setStrategies(strategies.filter(s => s.id !== strategyId));
      toast.success('Strategy deleted');
    } catch (error) {
      console.error('Error deleting strategy:', error);
      toast.error('Failed to delete strategy');
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (strategies.length === 0) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No strategies yet</p>
          <p className="text-xs text-muted-foreground">Create your first trading strategy to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Your Strategies</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {strategies.map((strategy) => (
          <div 
            key={strategy.id} 
            className="p-4 rounded-lg bg-muted/50 border border-border/50 space-y-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">{strategy.name}</span>
                <Badge variant="outline" className="text-xs">
                  {strategy.strategy_type.toUpperCase()}
                </Badge>
                <Badge 
                  variant={strategy.paper_mode ? 'secondary' : 'destructive'} 
                  className="text-xs"
                >
                  {strategy.paper_mode ? 'PAPER' : 'LIVE'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{strategy.exchange}</span>
                <Switch
                  checked={strategy.is_active}
                  onCheckedChange={() => toggleStrategy(strategy.id, strategy.is_active)}
                  disabled={toggling === strategy.id}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2 rounded bg-background/50">
                <div className={`text-sm font-bold flex items-center justify-center gap-1 ${
                  strategy.total_profit >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {strategy.total_profit >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  ${Math.abs(strategy.total_profit).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">P&L</p>
              </div>
              <div className="p-2 rounded bg-background/50">
                <div className="text-sm font-bold">{strategy.total_trades}</div>
                <p className="text-xs text-muted-foreground">Trades</p>
              </div>
              <div className="p-2 rounded bg-background/50">
                <div className="text-sm font-bold">{strategy.win_rate}%</div>
                <p className="text-xs text-muted-foreground">Win Rate</p>
              </div>
            </div>

            {/* Parameters */}
            <div className="text-xs text-muted-foreground">
              {strategy.strategy_type === 'dca' && (
                <span>
                  {strategy.parameters?.symbol} • ${strategy.parameters?.amount} • {strategy.parameters?.frequency}
                </span>
              )}
              {strategy.strategy_type === 'grid' && (
                <span>
                  {strategy.parameters?.symbol} • ${strategy.parameters?.lowerPrice} - ${strategy.parameters?.upperPrice} • {strategy.parameters?.gridLevels} levels
                </span>
              )}
              {strategy.strategy_type === 'momentum' && (
                <span>
                  {strategy.parameters?.symbol} • {strategy.parameters?.lookbackPeriod}d lookback • {strategy.parameters?.threshold}% threshold
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="secondary"
                className="flex-1"
                onClick={() => executeStrategy(strategy.id)}
                disabled={executing === strategy.id || !strategy.is_active}
              >
                {executing === strategy.id ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Play className="h-3 w-3 mr-1" />
                )}
                Execute Now
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                className="text-destructive hover:text-destructive"
                onClick={() => deleteStrategy(strategy.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
