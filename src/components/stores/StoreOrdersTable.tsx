import { useState, useEffect } from 'react';
import { ShoppingCart, AlertCircle, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface StoreOrdersTableProps {
  storeId: string;
  mcpId: string;
  isLoading: boolean;
}

export const StoreOrdersTable = ({ storeId, mcpId, isLoading }: StoreOrdersTableProps) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && mcpId) {
      fetchOrders();
    }
  }, [user, mcpId, storeId]);

  const fetchOrders = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase.functions.invoke(mcpId, {
        body: {
          tool: 'get_orders',
          arguments: { limit: 50 },
          userId: user.id
        }
      });

      if (fetchError) throw fetchError;
      
      const orderList = data?.data?.orders || data?.data?.results || data?.data || data?.orders || [];
      setOrders(Array.isArray(orderList) ? orderList : []);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setError(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'fulfilled' || s === 'completed' || s === 'paid') return 'bg-green-500/10 text-green-500';
    if (s === 'pending' || s === 'processing') return 'bg-yellow-500/10 text-yellow-500';
    if (s === 'cancelled' || s === 'refunded') return 'bg-red-500/10 text-red-500';
    return 'bg-muted text-muted-foreground';
  };

  if (loading || isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="font-semibold mb-2">Failed to Load Orders</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No Orders Found</h3>
          <p className="text-sm text-muted-foreground">Your store doesn't have any orders yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order, index) => (
            <TableRow key={order.id || order.order_id || index}>
              <TableCell className="font-mono text-sm">
                #{order.order_number || order.id || order.order_id || index + 1}
              </TableCell>
              <TableCell>
                {order.customer?.first_name || order.buyer_user_id || order.billing?.first_name || 'Guest'}
                {' '}
                {order.customer?.last_name || order.billing?.last_name || ''}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {order.created_at || order.create_timestamp || order.date_created
                  ? format(new Date(order.created_at || order.create_timestamp * 1000 || order.date_created), 'MMM d, yyyy')
                  : 'N/A'}
              </TableCell>
              <TableCell className="font-semibold">
                ${order.total_price || order.grandtotal?.amount || order.total || '0.00'}
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(order.fulfillment_status || order.status || order.financial_status)}>
                  {order.fulfillment_status || order.status || order.financial_status || 'Unknown'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
