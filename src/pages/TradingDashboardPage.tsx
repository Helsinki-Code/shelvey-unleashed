import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, RefreshCw, AlertCircle, Bot, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { SimpleDashboardSidebar } from '@/components/SimpleDashboardSidebar';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ExchangeConnectionCard } from '@/components/trading/ExchangeConnectionCard';
import { PortfolioOverview } from '@/components/trading/PortfolioOverview';
import { PositionsTable } from '@/components/trading/PositionsTable';
import { OrdersTable } from '@/components/trading/OrdersTable';
import { MarketDataTicker } from '@/components/trading/MarketDataTicker';
import { QuickTradePanel } from '@/components/trading/QuickTradePanel';
import { TradingStrategyBuilder } from '@/components/trading/TradingStrategyBuilder';
import { StrategyList } from '@/components/trading/StrategyList';

interface ExchangeConfig {
  id: string;
  name: string;
  icon: string;
  mcpId: string;
  requiredKeys: string[];
  color: string;
  type: 'stocks' | 'crypto';
  testnetKey?: string;
}

const EXCHANGES: ExchangeConfig[] = [
  { 
    id: 'alpaca', 
    name: 'Alpaca', 
    icon: '📈', 
    mcpId: 'mcp-alpaca', 
    requiredKeys: ['ALPACA_API_KEY', 'ALPACA_SECRET_KEY'], 
    color: 'from-yellow-500 to-yellow-600',
    type: 'stocks',
    testnetKey: 'ALPACA_PAPER'
  },
  { 
    id: 'coinbase', 
    name: 'Coinbase', 
    icon: '🪙', 
    mcpId: 'mcp-coinbase', 
    requiredKeys: ['COINBASE_API_KEY', 'COINBASE_PRIVATE_KEY'], 
    color: 'from-blue-500 to-blue-600',
    type: 'crypto'
  },
  { 
    id: 'binance', 
    name: 'Binance', 
    icon: '💹', 
    mcpId: 'mcp-binance', 
    requiredKeys: ['BINANCE_API_KEY', 'BINANCE_SECRET_KEY'], 
    color: 'from-amber-500 to-amber-600',
    type: 'crypto',
    testnetKey: 'BINANCE_TESTNET'
  },
];

const TradingDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [connectedExchanges, setConnectedExchanges] = useState<Record<string, boolean>>({});
  const [selectedExchange, setSelectedExchange] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('positions');
  const [refreshing, setRefreshing] = useState(false);
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      checkConnectedExchanges();
    }
  }, [user]);

  const checkConnectedExchanges = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const { data: userKeys } = await supabase
        .from('user_api_keys')
        .select('key_name, is_configured')
        .eq('user_id', user.id);

      const configuredKeys = new Set(userKeys?.filter(k => k.is_configured).map(k => k.key_name) || []);
      
      const connections: Record<string, boolean> = {};
      EXCHANGES.forEach(exchange => {
        connections[exchange.id] = exchange.requiredKeys.every(key => configuredKeys.has(key));
      });
      
      setConnectedExchanges(connections);
      
      // Auto-select first connected exchange
      const firstConnected = EXCHANGES.find(e => connections[e.id]);
      if (firstConnected && !selectedExchange) {
        setSelectedExchange(firstConnected.id);
        fetchExchangeData(firstConnected.id);
      }
    } catch (error) {
      console.error('Error checking exchange connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExchangeData = async (exchangeId: string) => {
    const exchange = EXCHANGES.find(e => e.id === exchangeId);
    if (!exchange || !user) return;

    setRefreshing(true);
    try {
      // Fetch account/portfolio data
      const { data: accountData, error: accountError } = await supabase.functions.invoke(exchange.mcpId, {
        body: {
          tool: 'get_account',
          arguments: {},
          userId: user.id
        }
      });

      if (accountError) throw accountError;
      setPortfolioData(accountData?.data || accountData);

      // Fetch positions
      const { data: positionsData } = await supabase.functions.invoke(exchange.mcpId, {
        body: {
          tool: 'get_positions',
          arguments: {},
          userId: user.id
        }
      });
      setPositions(positionsData?.data || positionsData || []);

      // Fetch orders
      const { data: ordersData } = await supabase.functions.invoke(exchange.mcpId, {
        body: {
          tool: 'get_orders',
          arguments: { status: 'open', limit: 50 },
          userId: user.id
        }
      });
      setOrders(ordersData?.data || ordersData || []);

    } catch (error: any) {
      console.error('Error fetching exchange data:', error);
      if (error.message?.includes('credentials')) {
        toast({
          title: 'API Keys Required',
          description: `Please configure your ${exchange.name} API keys in Settings.`,
          variant: 'destructive'
        });
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleExchangeSelect = (exchangeId: string) => {
    if (!connectedExchanges[exchangeId]) {
      navigate('/settings?tab=apikeys');
      return;
    }
    setSelectedExchange(exchangeId);
    setPortfolioData(null);
    setPositions([]);
    setOrders([]);
    fetchExchangeData(exchangeId);
  };

  const handleRefresh = () => {
    if (selectedExchange) {
      fetchExchangeData(selectedExchange);
    }
  };

  const handleOrderPlaced = () => {
    handleRefresh();
    toast({
      title: 'Order Submitted',
      description: 'Your order has been placed successfully.',
    });
  };

  const selectedExchangeConfig = EXCHANGES.find(e => e.id === selectedExchange);

  return (
    <div className="min-h-screen bg-background flex">
      <SimpleDashboardSidebar />
      
      <main className="flex-1 ml-[260px] p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Trading AI Agents</h1>
            <p className="text-muted-foreground">Autonomous trading with AI-powered strategies</p>
          </div>
          <PageHeader />
        </div>

        {/* Exchange Connection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {EXCHANGES.map((exchange) => (
            <ExchangeConnectionCard
              key={exchange.id}
              exchange={exchange}
              isConnected={connectedExchanges[exchange.id]}
              isSelected={selectedExchange === exchange.id}
              isLoading={loading}
              onSelect={() => handleExchangeSelect(exchange.id)}
            />
          ))}
        </div>

        {/* Main Content Area */}
        {selectedExchange && connectedExchanges[selectedExchange] ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Portfolio Overview */}
            <PortfolioOverview 
              data={portfolioData} 
              exchangeType={selectedExchangeConfig?.type || 'stocks'}
              isLoading={refreshing}
            />

            {/* Market Data Ticker */}
            <MarketDataTicker 
              exchangeId={selectedExchange}
              mcpId={selectedExchangeConfig?.mcpId || ''}
              exchangeType={selectedExchangeConfig?.type || 'stocks'}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Data Tabs - Takes 2 columns */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{selectedExchangeConfig?.icon}</span>
                      <div>
                        <CardTitle>{selectedExchangeConfig?.name}</CardTitle>
                        <CardDescription>
                          {selectedExchangeConfig?.type === 'stocks' ? 'Stock Trading' : 'Crypto Trading'}
                        </CardDescription>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                      <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="positions">Positions</TabsTrigger>
                        <TabsTrigger value="orders">Orders</TabsTrigger>
                        <TabsTrigger value="strategies" className="flex items-center gap-1">
                          <Bot className="h-3 w-3" />
                          AI Strategies
                        </TabsTrigger>
                        <TabsTrigger value="create" className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          New Strategy
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="positions" className="mt-4">
                        <PositionsTable 
                          positions={positions}
                          exchangeType={selectedExchangeConfig?.type || 'stocks'}
                          isLoading={refreshing}
                        />
                      </TabsContent>

                      <TabsContent value="orders" className="mt-4">
                        <OrdersTable 
                          orders={orders}
                          exchangeId={selectedExchange}
                          mcpId={selectedExchangeConfig?.mcpId || ''}
                          onOrderCancelled={handleRefresh}
                          isLoading={refreshing}
                        />
                      </TabsContent>

                      <TabsContent value="strategies" className="mt-4">
                        <StrategyList exchange={selectedExchange} />
                      </TabsContent>

                      <TabsContent value="create" className="mt-4">
                        <TradingStrategyBuilder 
                          exchange={selectedExchange}
                          exchangeType={selectedExchangeConfig?.type || 'stocks'}
                        />
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Trade Panel - Takes 1 column */}
              <QuickTradePanel 
                exchangeId={selectedExchange}
                mcpId={selectedExchangeConfig?.mcpId || ''}
                exchangeType={selectedExchangeConfig?.type || 'stocks'}
                onOrderPlaced={handleOrderPlaced}
              />
            </div>
          </motion.div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <TrendingUp className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Exchange Selected</h3>
              <p className="text-muted-foreground text-center max-w-md mb-4">
                Connect your trading accounts to enable AI-powered autonomous trading strategies.
              </p>
              <Button onClick={() => navigate('/settings?tab=apikeys')}>
                Configure API Keys
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default TradingDashboardPage;
