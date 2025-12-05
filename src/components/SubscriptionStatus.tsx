import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Settings, RefreshCw, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export const SubscriptionStatus = () => {
  const { 
    subscribed, 
    subscriptionEnd, 
    isLoading, 
    checkSubscription, 
    createCheckout, 
    openCustomerPortal 
  } = useSubscription();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={subscribed ? 'border-green-500/30 bg-green-500/5' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Crown className={subscribed ? 'text-yellow-500' : 'text-muted-foreground'} />
            Subscription Status
          </CardTitle>
          <Badge variant={subscribed ? 'default' : 'secondary'}>
            {subscribed ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <CardDescription>
          {subscribed 
            ? 'You have full access to all ShelVey features' 
            : 'Subscribe to unlock all premium features'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {subscribed && subscriptionEnd && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Renews on {format(new Date(subscriptionEnd), 'MMMM d, yyyy')}</span>
          </div>
        )}
        
        <div className="flex flex-wrap gap-2">
          {subscribed ? (
            <Button variant="outline" onClick={openCustomerPortal}>
              <Settings className="mr-2 h-4 w-4" />
              Manage Subscription
            </Button>
          ) : (
            <Button onClick={() => createCheckout(true)}>
              <Crown className="mr-2 h-4 w-4" />
              Subscribe Now
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={checkSubscription}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
