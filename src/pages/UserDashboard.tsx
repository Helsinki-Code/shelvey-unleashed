import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { SimpleDashboardSidebar } from '@/components/SimpleDashboardSidebar';
import { NotificationBell } from '@/components/NotificationBell';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UserProjects } from '@/components/UserProjects';
import { CEOChatSheet } from '@/components/CEOChatSheet';

const UserDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, isLoading, isSubscribed, isSuperAdmin } = useAuth();
  const [ceoChecked, setCeoChecked] = useState(false);
  const [userCeo, setUserCeo] = useState<any>(null);

  const section = searchParams.get('section') || 'home';

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
      return;
    }
    
    if (!isLoading && user && !isSubscribed && !isSuperAdmin) {
      navigate('/pricing');
      return;
    }
  }, [user, isLoading, isSubscribed, isSuperAdmin, navigate]);

  useEffect(() => {
    const checkCeo = async () => {
      if (!user || (!isSubscribed && !isSuperAdmin)) return;
      
      const { data, error } = await supabase
        .from('user_ceos')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setCeoChecked(true);
      
      if (!data && !error) {
        navigate('/create-ceo');
        return;
      }
      
      if (data) {
        setUserCeo(data);
      }
    };

    if (user && (isSubscribed || isSuperAdmin) && !isLoading) {
      checkCeo();
    }
  }, [user, isSubscribed, isSuperAdmin, isLoading, navigate]);

  if (isLoading || !ceoChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const ceoName = userCeo?.ceo_name || 'Ava';
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <SimpleDashboardSidebar />

      {/* Main Content */}
      <main className="flex-1 ml-[260px] p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold">
              {greeting}, {firstName}!
            </h1>
            <p className="text-muted-foreground">
              {ceoName} and your AI team are ready to work
            </p>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <ThemeToggle />
          </div>
        </motion.div>

        {/* Content based on section */}
        {section === 'home' && (
          <div className="max-w-6xl mx-auto">
            <UserProjects />
          </div>
        )}

        {section === 'projects' && (
          <div className="max-w-6xl mx-auto">
            <UserProjects />
          </div>
        )}
      </main>

      {/* Floating CEO Chat Button + Sheet */}
      <CEOChatSheet ceoName={ceoName} />
    </div>
  );
};

export default UserDashboard;
