import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Package, ShoppingCart, Users, Plus, RefreshCw, BarChart3, ExternalLink, AlertCircle, Bot, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { SimpleDashboardSidebar } from '@/components/SimpleDashboardSidebar';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { StoreConnectionCard } from '@/components/stores/StoreConnectionCard';
import { StoreProductsGrid } from '@/components/stores/StoreProductsGrid';
import { StoreOrdersTable } from '@/components/stores/StoreOrdersTable';
import { StoreCustomersTable } from '@/components/stores/StoreCustomersTable';
import { StoreAutomationPanel } from '@/components/stores/StoreAutomationPanel';
import { PODProductsPanel } from '@/components/stores/PODProductsPanel';
import { ECommerceCEOHeader } from '@/components/ecommerce/ECommerceCEOHeader';

interface StoreConfig {
  id: string;
  name: string;
  icon: string;
  mcpId: string;
  requiredKeys: string[];
  color: string;
}

const STORES: StoreConfig[] = [
  { id: 'shopify', name: 'Shopify', icon: '🛍️', mcpId: 'mcp-shopify', requiredKeys: ['SHOPIFY_ACCESS_TOKEN', 'SHOPIFY_STORE_URL'], color: 'from-green-500 to-green-600' },
  { id: 'etsy', name: 'Etsy', icon: '🧶', mcpId: 'mcp-etsy', requiredKeys: ['ETSY_API_KEY', 'ETSY_ACCESS_TOKEN'], color: 'from-orange-500 to-orange-600' },
  { id: 'woocommerce', name: 'WooCommerce', icon: '🛒', mcpId: 'mcp-woocommerce', requiredKeys: ['WOOCOMMERCE_URL', 'WOOCOMMERCE_CONSUMER_KEY', 'WOOCOMMERCE_CONSUMER_SECRET'], color: 'from-purple-500 to-purple-600' },
  { id: 'amazon', name: 'Amazon', icon: '📦', mcpId: 'mcp-amazon', requiredKeys: ['AMAZON_SELLER_ID', 'AMAZON_MWS_AUTH_TOKEN'], color: 'from-yellow-500 to-yellow-600' },
  { id: 'printful', name: 'Printful', icon: '👕', mcpId: 'mcp-printful', requiredKeys: ['PRINTFUL_API_KEY'], color: 'from-cyan-500 to-cyan-600' },
  { id: 'printify', name: 'Printify', icon: '🎨', mcpId: 'mcp-printify', requiredKeys: ['PRINTIFY_API_KEY'], color: 'from-pink-500 to-pink-600' },
];

const OnlineStoresPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [connectedStores, setConnectedStores] = useState<Record<string, boolean>>({});
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('products');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      checkConnectedStores();
    }
  }, [user]);

  const checkConnectedStores = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const { data: userKeys } = await supabase
        .from('user_api_keys')
        .select('key_name, is_configured')
        .eq('user_id', user.id);

      const configuredKeys = new Set(userKeys?.filter(k => k.is_configured).map(k => k.key_name) || []);
      
      const connections: Record<string, boolean> = {};
      STORES.forEach(store => {
        connections[store.id] = store.requiredKeys.every(key => configuredKeys.has(key));
      });
      
      setConnectedStores(connections);
      
      // Auto-select first connected store
      const firstConnected = STORES.find(s => connections[s.id]);
      if (firstConnected && !selectedStore) {
        setSelectedStore(firstConnected.id);
        fetchStoreData(firstConnected.id);
      }
    } catch (error) {
      console.error('Error checking store connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStoreData = async (storeId: string) => {
    const store = STORES.find(s => s.id === storeId);
    if (!store || !user) return;

    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke(store.mcpId, {
        body: {
          tool: 'get_products',
          arguments: { limit: 50 },
          userId: user.id
        }
      });

      if (error) throw error;
      setStoreData(data?.data || data);
    } catch (error: any) {
      console.error('Error fetching store data:', error);
      if (error.message?.includes('credentials')) {
        toast({
          title: 'API Keys Required',
          description: `Please configure your ${store.name} API keys in Settings.`,
          variant: 'destructive'
        });
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleStoreSelect = (storeId: string) => {
    if (!connectedStores[storeId]) {
      navigate('/settings?tab=apikeys');
      return;
    }
    setSelectedStore(storeId);
    setStoreData(null);
    fetchStoreData(storeId);
  };

  const handleRefresh = () => {
    if (selectedStore) {
      fetchStoreData(selectedStore);
    }
  };

  const selectedStoreConfig = STORES.find(s => s.id === selectedStore);

  return (
    <div className="min-h-screen bg-background flex">
      <SimpleDashboardSidebar />
      
      <main className="flex-1 ml-[260px] p-6">
        {/* E-Commerce CEO Header */}
        <ECommerceCEOHeader />
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Store Operations</h1>
            <p className="text-muted-foreground">Manage all your e-commerce stores with AI automation</p>
          </div>
          <PageHeader />
        </div>

        {/* Store Connection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {STORES.map((store) => (
            <StoreConnectionCard
              key={store.id}
              store={store}
              isConnected={connectedStores[store.id]}
              isSelected={selectedStore === store.id}
              isLoading={loading}
              onSelect={() => handleStoreSelect(store.id)}
            />
          ))}
        </div>

        {/* Main Content Area */}
        {selectedStore && connectedStores[selectedStore] ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Store Header */}
            <Card className="border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedStoreConfig?.icon}</span>
                  <div>
                    <CardTitle>{selectedStoreConfig?.name} Dashboard</CardTitle>
                    <CardDescription>Real-time data from your store</CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Sync
                  </Button>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {/* Data Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full max-w-2xl grid-cols-5">
                <TabsTrigger value="products" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Products
                </TabsTrigger>
                <TabsTrigger value="orders" className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Orders
                </TabsTrigger>
                <TabsTrigger value="customers" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Customers
                </TabsTrigger>
                <TabsTrigger value="automation" className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Automation
                </TabsTrigger>
                <TabsTrigger value="pod" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  POD
                </TabsTrigger>
              </TabsList>

              <TabsContent value="products" className="mt-6">
                <StoreProductsGrid 
                  storeId={selectedStore} 
                  mcpId={selectedStoreConfig?.mcpId || ''} 
                  isLoading={refreshing}
                />
              </TabsContent>

              <TabsContent value="orders" className="mt-6">
                <StoreOrdersTable 
                  storeId={selectedStore} 
                  mcpId={selectedStoreConfig?.mcpId || ''}
                  isLoading={refreshing}
                />
              </TabsContent>

              <TabsContent value="customers" className="mt-6">
                <StoreCustomersTable 
                  storeId={selectedStore} 
                  mcpId={selectedStoreConfig?.mcpId || ''}
                  isLoading={refreshing}
                />
              </TabsContent>

              <TabsContent value="automation" className="mt-6">
                <StoreAutomationPanel />
              </TabsContent>

              <TabsContent value="pod" className="mt-6">
                <PODProductsPanel />
              </TabsContent>
            </Tabs>
          </motion.div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Store className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Store Selected</h3>
              <p className="text-muted-foreground text-center max-w-md mb-4">
                Connect your e-commerce stores to manage products, orders, and customers from one place with AI automation.
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

export default OnlineStoresPage;
