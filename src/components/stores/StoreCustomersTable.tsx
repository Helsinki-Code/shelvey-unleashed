import { useState, useEffect } from 'react';
import { Users, AlertCircle, Mail } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface StoreCustomersTableProps {
  storeId: string;
  mcpId: string;
  isLoading: boolean;
}

export const StoreCustomersTable = ({ storeId, mcpId, isLoading }: StoreCustomersTableProps) => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && mcpId) {
      fetchCustomers();
    }
  }, [user, mcpId, storeId]);

  const fetchCustomers = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase.functions.invoke(mcpId, {
        body: {
          tool: 'get_customers',
          arguments: { limit: 50 },
          userId: user.id
        }
      });

      if (fetchError) throw fetchError;
      
      const customerList = data?.data?.customers || data?.data || data?.customers || [];
      setCustomers(Array.isArray(customerList) ? customerList : []);
    } catch (err: any) {
      console.error('Error fetching customers:', err);
      setError(err.message || 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
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
          <h3 className="font-semibold mb-2">Failed to Load Customers</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (customers.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No Customers Found</h3>
          <p className="text-sm text-muted-foreground">Your store doesn't have any customers yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Orders</TableHead>
            <TableHead>Total Spent</TableHead>
            <TableHead>Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer, index) => (
            <TableRow key={customer.id || index}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {(customer.first_name?.[0] || customer.name?.[0] || 'C').toUpperCase()}
                      {(customer.last_name?.[0] || '').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">
                    {customer.first_name || customer.name || 'Unknown'} {customer.last_name || ''}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {customer.email || 'N/A'}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{customer.orders_count || customer.total_orders || 0}</Badge>
              </TableCell>
              <TableCell className="font-semibold">
                ${customer.total_spent || customer.lifetime_value || '0.00'}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {customer.created_at || customer.date_created
                  ? format(new Date(customer.created_at || customer.date_created), 'MMM d, yyyy')
                  : 'N/A'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
