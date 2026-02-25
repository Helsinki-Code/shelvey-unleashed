import React, { createContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UserCEO {
  id: string;
  ceo_name: string;
  ceo_image_url: string | null;
  persona: string | null;
  voice_id: string | null;
  communication_style: string | null;
  language: string | null;
  personality_traits: Record<string, unknown> | null;
}

export interface CEOContextType {
  ceo: UserCEO | null;
  ceoName: string;
  ceoAvatarUrl: string | null;
  ceoPersona: string | null;
  voiceId: string | null;
  communicationStyle: string | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export const CEOContext = createContext<CEOContextType | undefined>(undefined);

export const CEOProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [ceo, setCeo] = useState<UserCEO | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCEO = async () => {
    if (!user?.id) {
      setCeo(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('ceo-profile-gateway', {
        body: {},
      });

      if (error) {
        console.error('Failed to fetch CEO:', error);
        setCeo(null);
      } else {
        setCeo((data?.ceo || null) as UserCEO | null);
      }
    } catch (err) {
      console.error('Error fetching CEO:', err);
      setCeo(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCEO();
  }, [user?.id]);

  const value: CEOContextType = {
    ceo,
    ceoName: ceo?.ceo_name || 'CEO',
    ceoAvatarUrl: ceo?.ceo_image_url || null,
    ceoPersona: ceo?.persona || null,
    voiceId: ceo?.voice_id || null,
    communicationStyle: ceo?.communication_style || null,
    isLoading,
    refetch: fetchCEO,
  };

  return <CEOContext.Provider value={value}>{children}</CEOContext.Provider>;
};
