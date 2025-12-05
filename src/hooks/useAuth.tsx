import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  subscription_status: 'trial' | 'active' | 'canceled' | 'expired';
  subscription_expires_at: string | null;
  subscription_tier?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isSubscribed: boolean;
  isSuperAdmin: boolean;
  subscriptionTier: string;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data as Profile;
  };

  const checkSuperAdminStatus = async (userId: string) => {
    const { data, error } = await supabase.rpc('is_super_admin', {
      _user_id: userId,
    });

    if (!error) {
      setIsSuperAdmin(data === true);
    }
  };

  const initializeMCPServers = async (userId: string) => {
    // Check if user already has MCP servers
    const { data: existing } = await supabase
      .from('user_mcp_servers')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (!existing || existing.length === 0) {
      // Initialize default MCP servers for new user
      await supabase.rpc('initialize_user_mcp_servers', { _user_id: userId });
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Defer profile fetch to avoid deadlock
          setTimeout(async () => {
            const profileData = await fetchProfile(session.user.id);
            setProfile(profileData);
            await checkSuperAdminStatus(session.user.id);
            await initializeMCPServers(session.user.id);
            setIsLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setIsSuperAdmin(false);
          setIsLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchProfile(session.user.id).then((profileData) => {
          setProfile(profileData);
          checkSuperAdminStatus(session.user.id);
          initializeMCPServers(session.user.id);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName || '' },
      },
    });

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsSuperAdmin(false);
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
      await checkSuperAdminStatus(user.id);
    }
  };

  const isSubscribed = profile 
    ? (profile.subscription_status === 'active' || profile.subscription_status === 'trial') &&
      (!profile.subscription_expires_at || new Date(profile.subscription_expires_at) > new Date())
    : false;

  const subscriptionTier = profile?.subscription_tier || 'standard';

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      isLoading,
      isSubscribed,
      isSuperAdmin,
      subscriptionTier,
      signUp,
      signIn,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
