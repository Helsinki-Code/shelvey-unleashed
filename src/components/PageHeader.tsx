import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationBell } from '@/components/NotificationBell';
import { useAuth } from '@/hooks/useAuth';

interface PageHeaderProps {
  showNotifications?: boolean;
  showLogout?: boolean;
  className?: string;
}

export const PageHeader = ({ 
  showNotifications = true, 
  showLogout = true,
  className = ''
}: PageHeaderProps) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {showNotifications && user && <NotificationBell />}
      <ThemeToggle />
      {showLogout && user && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleLogout}
          className="gap-2 text-muted-foreground hover:text-destructive"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      )}
    </div>
  );
};
