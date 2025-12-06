import { useState } from 'react';
import { X, AlertCircle, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface OrdersTableProps {
  orders: any[];
  exchangeId: string;
  mcpId: string;
  onOrderCancelled: () => void;
  isLoading: boolean;
}

export const OrdersTable = ({ orders, exchangeId, mcpId, onOrderCancelled, isLoading }: OrdersTableProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancelOrder = async (orderId: string) => {
    if (!user) return;
    setCancellingId(orderId);

    try {
      const { error } = await supabase.functions.invoke(mcpId, {
        body: {
          tool: 'cancel_order',
          arguments: { order_id: orderId },
          userId: user.id
        }
      });

      if (error) throw error;

      toast({
        title: 'Order Cancelled',
        description: `Order ${orderId} has been cancelled.`
      });
      onOrderCancelled();
    } catch (err: any) {
      console.error('Error cancelling order:', err);
      toast({
        title: 'Failed to Cancel',
        description: err.message || 'Could not cancel the order.',
        variant: 'destructive'
      });
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'filled' || s === 'complete') return 'bg-green-500/10 text-green-500';
    if (s === 'pending' || s === 'new' || s === 'open' || s === 'accepted') return 'bg-yellow-500/10 text-yellow-500';
    if (s === 'cancelled' || s === 'canceled' || s === 'rejected') return 'bg-red-500/10 text-red-500';
    if (s === 'partially_filled') return 'bg-blue-500/10 text-blue-500';
    return 'bg-muted text-muted-foreground';
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Clock className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No Open Orders</h3>
          <p className="text-sm text-muted-foreground">You don't have any open orders right now.</p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: any) => {
    const num = parseFloat(String(value)) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(num);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Symbol</TableHead>
            <TableHead>Side</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Time</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order, index) => {
            const orderId = order.id || order.order_id || index;
            const symbol = order.symbol || order.product_id || 'Unknown';
            const side = order.side || 'unknown';
            const type = order.type || order.order_type || 'market';
            const qty = order.qty || order.size || order.quantity || 0;
            const price = order.limit_price || order.price || order.stop_price || 'Market';
            const status = order.status || 'unknown';
            const createdAt = order.created_at || order.submitted_at || order.created_time;

            return (
              <TableRow key={orderId}>
                <TableCell>
                  <Badge variant="outline" className="font-mono font-bold">
                    {symbol}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={side.toLowerCase() === 'buy' ? 'default' : 'destructive'}
                    className={cn(
                      side.toLowerCase() === 'buy' 
                        ? 'bg-green-500/10 text-green-500' 
                        : 'bg-red-500/10 text-red-500'
                    )}
                  >
                    {side.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="capitalize text-sm">
                  {type.replace('_', ' ')}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {parseFloat(qty).toFixed(4)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {typeof price === 'number' ? formatCurrency(price) : price}
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(status)}>
                    {status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {createdAt ? format(new Date(createdAt), 'MMM d, HH:mm') : 'N/A'}
                </TableCell>
                <TableCell>
                  {['new', 'open', 'pending', 'accepted'].includes(status.toLowerCase()) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleCancelOrder(orderId)}
                      disabled={cancellingId === orderId}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
