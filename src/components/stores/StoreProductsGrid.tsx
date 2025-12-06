import { useState, useEffect } from 'react';
import { Package, DollarSign, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface StoreProductsGridProps {
  storeId: string;
  mcpId: string;
  isLoading: boolean;
}

export const StoreProductsGrid = ({ storeId, mcpId, isLoading }: StoreProductsGridProps) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && mcpId) {
      fetchProducts();
    }
  }, [user, mcpId, storeId]);

  const fetchProducts = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase.functions.invoke(mcpId, {
        body: {
          tool: 'get_products',
          arguments: { limit: 50 },
          userId: user.id
        }
      });

      if (fetchError) throw fetchError;
      
      // Handle different response structures from different store APIs
      const productList = data?.data?.products || data?.data?.results || data?.data || data?.products || [];
      setProducts(Array.isArray(productList) ? productList : []);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError(err.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="h-40 w-full" />
            <CardContent className="p-4">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="font-semibold mb-2">Failed to Load Products</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (products.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No Products Found</h3>
          <p className="text-sm text-muted-foreground">Your store doesn't have any products yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {products.map((product, index) => (
        <Card key={product.id || index} className="overflow-hidden hover:border-primary/50 transition-colors">
          <div className="h-40 bg-muted flex items-center justify-center">
            {product.images?.[0]?.src || product.image?.src || product.image_url || product.images?.[0] ? (
              <img 
                src={product.images?.[0]?.src || product.image?.src || product.image_url || product.images?.[0]}
                alt={product.title || product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Package className="h-12 w-12 text-muted-foreground" />
            )}
          </div>
          <CardContent className="p-4">
            <h4 className="font-medium text-sm mb-2 line-clamp-2">
              {product.title || product.name}
            </h4>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-primary font-semibold">
                <DollarSign className="h-4 w-4" />
                {product.variants?.[0]?.price || product.price || 'N/A'}
              </div>
              <Badge variant={product.status === 'active' || product.state === 'active' ? 'default' : 'secondary'}>
                {product.status || product.state || 'Unknown'}
              </Badge>
            </div>
            {(product.variants?.[0]?.inventory_quantity !== undefined || product.quantity !== undefined) && (
              <p className="text-xs text-muted-foreground mt-2">
                Stock: {product.variants?.[0]?.inventory_quantity ?? product.quantity ?? 'N/A'}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
