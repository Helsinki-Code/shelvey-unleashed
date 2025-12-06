import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, ExternalLink, Loader2, CheckCircle2, AlertCircle, Clock, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ConnectStatus {
  connected: boolean;
  status: string;
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  dashboardUrl: string | null;
}

export const StripeConnectSection = () => {
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    checkConnectStatus();
  }, []);

  const checkConnectStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-stripe-connect-status');
      
      if (error) throw error;
      setConnectStatus(data);
    } catch (error) {
      console.error('Error checking Stripe Connect status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectStripe = async () => {
    setIsConnecting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-onboarding');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
        toast.success('Stripe Connect setup opened in new tab');
      }
    } catch (error) {
      console.error('Error starting Stripe Connect:', error);
      toast.error('Failed to start Stripe Connect setup');
    } finally {
      setIsConnecting(false);
    }
  };

  const getStatusBadge = () => {
    if (!connectStatus?.connected) {
      return <Badge variant="secondary">Not Connected</Badge>;
    }
    
    switch (connectStatus.status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Active</Badge>;
      case 'pending_verification':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Pending Verification</Badge>;
      case 'pending':
        return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">Setup Incomplete</Badge>;
      default:
        return <Badge variant="secondary">{connectStatus.status}</Badge>;
    }
  };

  const getStatusIcon = () => {
    if (!connectStatus?.connected) {
      return <CreditCard className="w-5 h-5 text-muted-foreground" />;
    }
    
    switch (connectStatus.status) {
      case 'active':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'pending_verification':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'pending':
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
      default:
        return <CreditCard className="w-5 h-5 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <CardTitle>Stripe Connect</CardTitle>
              <CardDescription>Receive payments on your generated websites</CardDescription>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!connectStatus?.connected ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Alert>
              <DollarSign className="h-4 w-4" />
              <AlertTitle>Earn money from your websites</AlertTitle>
              <AlertDescription>
                Connect your Stripe account to receive payments directly when customers buy from your AI-generated websites. 
                ShelVey takes a 3% platform fee on all transactions.
              </AlertDescription>
            </Alert>
            
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <h4 className="font-medium">Benefits of connecting Stripe:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Receive payments directly to your bank account
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Automatic payment buttons on generated websites
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Real-time sale notifications
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Automatic payouts to your bank
                </li>
              </ul>
            </div>

            <Button 
              onClick={handleConnectStripe} 
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Connect with Stripe
                </>
              )}
            </Button>
          </motion.div>
        ) : connectStatus.status === 'active' ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">Your Stripe account is active!</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                You can now receive payments on your generated websites. All payments will be automatically deposited to your connected bank account.
              </p>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => window.open(connectStatus.dashboardUrl || 'https://dashboard.stripe.com', '_blank')}
                className="flex-1"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Stripe Dashboard
              </Button>
              <Button 
                variant="ghost"
                onClick={checkConnectStatus}
              >
                Refresh Status
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Alert variant="default" className="border-yellow-500/30 bg-yellow-500/10">
              <Clock className="h-4 w-4 text-yellow-500" />
              <AlertTitle className="text-yellow-500">Setup Incomplete</AlertTitle>
              <AlertDescription>
                {connectStatus.status === 'pending_verification' 
                  ? 'Your account is under review by Stripe. This usually takes 1-2 business days.'
                  : 'Please complete the Stripe onboarding process to start receiving payments.'}
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button 
                onClick={handleConnectStripe}
                disabled={isConnecting}
                className="flex-1"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Opening...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {connectStatus.status === 'pending_verification' ? 'Check Status' : 'Complete Setup'}
                  </>
                )}
              </Button>
              <Button 
                variant="ghost"
                onClick={checkConnectStatus}
              >
                Refresh
              </Button>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};
