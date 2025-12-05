import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface AdminAPIKey {
  id: string;
  key_name: string;
  encrypted_value: string | null;
  display_name: string;
  category: string;
  is_configured: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserWithProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  subscription_status: string | null;
  subscription_tier: string | null;
  subscription_expires_at: string | null;
  created_at: string | null;
}

export const useSuperAdmin = () => {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [adminAPIKeys, setAdminAPIKeys] = useState<AdminAPIKey[]>([]);
  const [allUsers, setAllUsers] = useState<UserWithProfile[]>([]);

  // Check super admin status
  const checkSuperAdminStatus = useCallback(async () => {
    if (!user) {
      setIsSuperAdmin(false);
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase.rpc('is_super_admin', {
      _user_id: user.id,
    });

    if (!error) {
      setIsSuperAdmin(data === true);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    checkSuperAdminStatus();
  }, [checkSuperAdminStatus]);

  // Fetch admin API keys
  const fetchAdminAPIKeys = useCallback(async () => {
    if (!isSuperAdmin) return;

    const { data, error } = await supabase
      .from('admin_api_keys')
      .select('*')
      .order('category', { ascending: true });

    if (!error && data) {
      setAdminAPIKeys(data as AdminAPIKey[]);
    }
  }, [isSuperAdmin]);

  // Fetch all users (for super admin dashboard)
  const fetchAllUsers = useCallback(async () => {
    if (!isSuperAdmin) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAllUsers(data as UserWithProfile[]);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAdminAPIKeys();
      fetchAllUsers();
    }
  }, [isSuperAdmin, fetchAdminAPIKeys, fetchAllUsers]);

  // Save admin API key
  const saveAdminAPIKey = async (
    keyName: string,
    displayName: string,
    encryptedValue: string,
    category: string = 'general'
  ) => {
    const { data, error } = await supabase
      .from('admin_api_keys')
      .upsert(
        {
          key_name: keyName,
          display_name: displayName,
          encrypted_value: encryptedValue,
          category,
          is_configured: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key_name' }
      )
      .select()
      .single();

    if (!error) {
      await fetchAdminAPIKeys();
    }

    return { data, error };
  };

  // Delete admin API key
  const deleteAdminAPIKey = async (keyName: string) => {
    const { error } = await supabase
      .from('admin_api_keys')
      .delete()
      .eq('key_name', keyName);

    if (!error) {
      await fetchAdminAPIKeys();
    }

    return { error };
  };

  return {
    isSuperAdmin,
    isLoading,
    adminAPIKeys,
    allUsers,
    fetchAdminAPIKeys,
    fetchAllUsers,
    saveAdminAPIKey,
    deleteAdminAPIKey,
    refetch: checkSuperAdminStatus,
  };
};
