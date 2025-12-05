import { ReactNode } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Loader2, Lock, Sparkles } from 'lucide-react';

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
  const { subscriptionTier, isSuperAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Super admin always has full access
  if (isSuperAdmin || subscribed) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Standard Plan */}
      <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Crown className="h-6 w-6 text-primary" />
            Standard Plan
          </CardTitle>
          <CardDescription className="text-base">
            Full access with your own API keys
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-4">
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
                <span className="text-muted-foreground">Bring your own API keys</span>
              </li>
            </ul>
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="text-center">
              <span className="text-3xl font-bold">$2,999</span>
              <span className="text-muted-foreground">/month</span>
              <span className="ml-2 text-sm text-muted-foreground">+ $999 setup</span>
            </div>
            <Button 
              onClick={() => createCheckout(true, 'standard')} 
              className="w-full"
              size="lg"
            >
              <Crown className="mr-2 h-4 w-4" />
              Choose Standard
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* DFY Plan */}
      <Card className="border-yellow-500/30 bg-gradient-to-br from-background to-yellow-500/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-yellow-500 text-yellow-950 px-3 py-1 text-xs font-bold rounded-bl-lg">
          RECOMMENDED
        </div>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/20">
            <Sparkles className="h-8 w-8 text-yellow-500" />
          </div>
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-yellow-500" />
            DFY Plan
          </CardTitle>
          <CardDescription className="text-base">
            Done-For-You with pre-configured API keys
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-yellow-500/10 p-4 border border-yellow-500/20">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                Everything in Standard Plan
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                <strong className="text-foreground">No API keys needed!</strong>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                Pre-configured integrations
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                Start building immediately
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                Priority support
              </li>
            </ul>
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="text-center">
              <span className="text-3xl font-bold text-yellow-500">$4,999</span>
              <span className="text-muted-foreground">/month</span>
              <span className="ml-2 text-sm text-muted-foreground">+ $1,499 setup</span>
            </div>
            <Button 
              onClick={() => createCheckout(true, 'dfy')} 
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-yellow-950"
              size="lg"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Choose DFY
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
