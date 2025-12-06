import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Printer, Sparkles, Loader2, Plus, ShoppingBag, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface PODProduct {
  id: string;
  name: string;
  design_url: string | null;
  printful_product_id: string | null;
  printify_product_id: string | null;
  synced_stores: any;
  status: string;
  sales_count: number;
  revenue: number;
  created_at: string;
}

export function PODProductsPanel() {
  const { user } = useAuth();
  const [products, setProducts] = useState<PODProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Create form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [designPrompt, setDesignPrompt] = useState('');
  const [podService, setPodService] = useState('printful');
  const [targetStores, setTargetStores] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchProducts();
    }
  }, [user]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('pod_products')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching POD products:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDesign = async () => {
    if (!designPrompt.trim()) {
      toast.error('Please enter a design prompt');
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('pod-automation-agent', {
        body: {
          action: 'generate_design',
          userId: user?.id,
          params: { prompt: designPrompt, style: 'modern minimalist' },
        },
      });

      if (error) throw error;
      toast.success('Design generated!');
      return data.designUrl;
    } catch (error) {
      console.error('Error generating design:', error);
      toast.error('Failed to generate design');
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const createProduct = async () => {
    if (!name.trim()) {
      toast.error('Please enter a product name');
      return;
    }

    setCreating(true);
    try {
      // Generate design if prompt provided
      let designUrl = null;
      if (designPrompt.trim()) {
        designUrl = await generateDesign();
      }

      const { data, error } = await supabase.functions.invoke('pod-automation-agent', {
        body: {
          action: 'create_product',
          userId: user?.id,
          params: {
            name,
            description,
            designUrl,
            podService,
            productType: 't-shirt',
          },
        },
      });

      if (error) throw error;

      // Sync to stores if selected
      if (targetStores.length > 0 && data.product?.id) {
        await supabase.functions.invoke('pod-automation-agent', {
          body: {
            action: 'sync_to_stores',
            userId: user?.id,
            params: {
              productId: data.product.id,
              targetStores,
            },
          },
        });
      }

      toast.success('Product created and synced!');
      setShowCreate(false);
      setName('');
      setDescription('');
      setDesignPrompt('');
      setTargetStores([]);
      fetchProducts();
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error('Failed to create product');
    } finally {
      setCreating(false);
    }
  };

  const launchProduct = async (productId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('pod-automation-agent', {
        body: {
          action: 'launch_product',
          userId: user?.id,
          params: {
            productId,
            targetStores: ['shopify'],
            generateMarketing: true,
          },
        },
      });

      if (error) throw error;
      toast.success('Product launched!');
      fetchProducts();
    } catch (error) {
      console.error('Error launching product:', error);
      toast.error('Failed to launch product');
    }
  };

  const toggleStore = (store: string) => {
    setTargetStores(prev => 
      prev.includes(store) 
        ? prev.filter(s => s !== store) 
        : [...prev, store]
    );
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

  return (
    <div className="space-y-4">
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Printer className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Print-on-Demand Products</CardTitle>
                <CardDescription>Create and sync products to your stores</CardDescription>
              </div>
            </div>
            <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
              <Plus className="h-4 w-4 mr-1" />
              Create Product
            </Button>
          </div>
        </CardHeader>

        {showCreate && (
          <CardContent className="border-t pt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Product Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Awesome T-Shirt"
                  />
                </div>
                <div className="space-y-2">
                  <Label>POD Service</Label>
                  <Select value={podService} onValueChange={setPodService}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="printful">Printful</SelectItem>
                      <SelectItem value="printify">Printify</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Product description..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI Design Prompt (optional)
                </Label>
                <Textarea
                  value={designPrompt}
                  onChange={(e) => setDesignPrompt(e.target.value)}
                  placeholder="A minimalist mountain landscape with sunset colors..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Sync to Stores</Label>
                <div className="flex gap-4">
                  {['shopify', 'etsy', 'woocommerce'].map((store) => (
                    <label key={store} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={targetStores.includes(store)}
                        onCheckedChange={() => toggleStore(store)}
                      />
                      <span className="text-sm capitalize">{store}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button 
                onClick={createProduct} 
                disabled={creating || generating}
                className="w-full"
              >
                {(creating || generating) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {generating ? 'Generating Design...' : creating ? 'Creating...' : 'Create Product'}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Products List */}
      {products.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Your Products ({products.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {products.map((product) => (
                <div 
                  key={product.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50"
                >
                  <div className="flex items-center gap-3">
                    {product.design_url ? (
                      <img 
                        src={product.design_url} 
                        alt={product.name}
                        className="w-12 h-12 rounded object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                        <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-sm">{product.name}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {product.printful_product_id ? 'Printful' : product.printify_product_id ? 'Printify' : 'Draft'}
                        </Badge>
                        <span>{product.sales_count} sales</span>
                        <span>${product.revenue.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={product.status === 'launched' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {product.status}
                    </Badge>
                    {product.status !== 'launched' && (
                      <Button size="sm" variant="secondary" onClick={() => launchProduct(product.id)}>
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Launch
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
