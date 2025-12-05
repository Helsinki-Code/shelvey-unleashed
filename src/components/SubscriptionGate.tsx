import { ReactNode } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Loader2, Lock } from 'lucide-react';

interface SubscriptionGateProps {
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
}

export const SubscriptionGate = ({ 
  children, 
  fallback,
  showUpgradePrompt = true 
}: SubscriptionGateProps) => {
  const { subscribed, isLoading, createCheckout } = useSubscription();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (subscribed) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="flex items-center justify-center gap-2 text-2xl">
          <Crown className="h-6 w-6 text-yellow-500" />
          Premium Feature
        </CardTitle>
        <CardDescription className="text-base">
          Unlock full access to ShelVey AI agents and automation tools
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted/50 p-4">
          <div className="mb-2 text-sm font-medium">ShelVey Subscription includes:</div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              All 26+ MCP Server Integrations
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Unlimited AI Agent Conversations
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Voice Agent Interface
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Business Pipeline Automation
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Website Generation Tools
            </li>
          </ul>
        </div>
        
        <div className="flex flex-col gap-2">
          <div className="text-center">
            <span className="text-3xl font-bold">$2,999</span>
            <span className="text-muted-foreground">/month</span>
            <span className="ml-2 text-sm text-muted-foreground">+ $999 setup fee</span>
          </div>
          <Button 
            onClick={() => createCheckout(true)} 
            className="w-full"
            size="lg"
          >
            <Crown className="mr-2 h-4 w-4" />
            Subscribe Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
