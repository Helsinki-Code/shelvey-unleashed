import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ExperienceModeToggle } from '@/components/ExperienceModeToggle';
import { NotificationBell } from '@/components/NotificationBell';
import { useAuth } from '@/hooks/useAuth';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

export const DashboardLayout = ({ children, title }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const { user, profile, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  // Show onboarding wizard for new users
  const showOnboarding = profile && !(profile as any).onboarding_completed;

  if (showOnboarding) {
    return <OnboardingWizard />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          {/* Top bar */}
          <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <SidebarTrigger className="-ml-1" />
            
            {title && (
              <h1 className="font-semibold text-lg">{title}</h1>
            )}

            <div className="ml-auto flex items-center gap-2">
              <ExperienceModeToggle />
              <ThemeToggle />
              <NotificationBell />
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
