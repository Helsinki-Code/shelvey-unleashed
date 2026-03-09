import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface SubscriptionState {
  subscribed: boolean;
  productId: string | null;
  subscriptionEnd: string | null;
  status: string;
  isLoading: boolean;
  error: string | null;
}

export const useSubscription = () => {
  const { user, session, isSuperAdmin } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionState>({
    subscribed: false,
    productId: null,
    subscriptionEnd: null,
    status: 'none',
    isLoading: true,
    error: null,
  });

  const checkSubscription = useCallback(async () => {
    // Super admin always has full subscription access
    if (isSuperAdmin) {
      setSubscription({
        subscribed: true,
        productId: 'super_admin',
        subscriptionEnd: null,
        status: 'active',
        isLoading: false,
        error: null,
      });
      return;
    }

    if (!session?.access_token) {
      setSubscription(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      setSubscription(prev => ({ ...prev, isLoading: true, error: null }));
      
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      const isActive = data.subscribed === true;
      setSubscription({
        subscribed: isActive,
        productId: data.product_id || null,
        subscriptionEnd: data.subscription_end || null,
        status: isActive ? 'active' : 'none',
        isLoading: false,
        error: null,
      });

      // Sync profiles table if Stripe says active but profile doesn't reflect it
      if (isActive && user) {
        const tier = data.product_id === 'prod_TXysVPTCBGfrbU' ? 'dfy' : 'standard';
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'active',
            subscription_tier: tier,
            subscription_expires_at: data.subscription_end || null,
          })
          .eq('id', user.id);
      }
    } catch (err) {
      console.error('Error checking subscription:', err);
      setSubscription(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to check subscription',
      }));
    }
  }, [session?.access_token, isSuperAdmin]);

  const createCheckout = useCallback(async (includeSetupFee: boolean = true, planType: string = 'standard') => {
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { includeSetupFee, planType },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) throw error;
    if (data.url) {
      window.open(data.url, '_blank');
    }
    return data;
  }, [session?.access_token]);

  const openCustomerPortal = useCallback(async () => {
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase.functions.invoke('customer-portal', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) throw error;
    if (data.url) {
      window.open(data.url, '_blank');
    }
    return data;
  }, [session?.access_token]);

  // Check subscription on mount and when user changes
  useEffect(() => {
    if (user) {
      checkSubscription();
    } else {
      setSubscription({
        subscribed: false,
        productId: null,
        subscriptionEnd: null,
        status: 'none',
        isLoading: false,
        error: null,
      });
    }
  }, [user, checkSubscription]);

  // Auto-refresh subscription every minute
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  return {
    ...subscription,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
  };
};
