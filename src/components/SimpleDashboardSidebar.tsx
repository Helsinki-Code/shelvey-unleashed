import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home, Briefcase, Key, Settings, LogOut, ChevronLeft, ChevronRight, Store, TrendingUp, Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { UserProfileSheet } from '@/components/UserProfileSheet';
import shelveyLogo from '@/assets/shelvey-logo.png';

interface NavItem {
  id: string;
  label: string;
  icon: typeof Home;
  path: string;
  helpText: string;
}

export const SimpleDashboardSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems: NavItem[] = [
    { id: 'command', label: 'Command Center', icon: Building2, path: '/command-center', helpText: 'AI Conglomerate overview' },
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard', helpText: 'Your main command center' },
    { id: 'projects', label: 'Business Projects', icon: Briefcase, path: '/projects', helpText: 'View and manage business projects' },
    { id: 'stores', label: 'E-Commerce', icon: Store, path: '/stores', helpText: 'Manage Shopify, Etsy, WooCommerce' },
    { id: 'trading', label: 'Trading AI', icon: TrendingUp, path: '/trading', helpText: 'Stocks and crypto trading' },
    { id: 'apikeys', label: 'API Keys', icon: Key, path: '/settings?tab=apikeys', helpText: 'Manage your API keys' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings', helpText: 'Account and preferences' },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string) => {
    if (path.includes('?')) {
      return location.pathname + location.search === path;
    }
    return location.pathname === path;
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 72 : 260 }}
      className="fixed left-0 top-0 h-screen bg-card border-r border-border z-40 flex flex-col"
    >
      {/* Logo */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <img src={shelveyLogo} alt="ShelVey" className="h-8 w-8" />
            <span className="font-bold text-lg text-gradient">ShelVey</span>
          </motion.div>
        )}
        {isCollapsed && (
          <img 
            src={shelveyLogo} 
            alt="ShelVey" 
            className="h-8 w-8 cursor-pointer mx-auto" 
            onClick={() => navigate('/')}
          />
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn("shrink-0", isCollapsed && "mx-auto")}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* User Profile */}
      <div className={cn("p-3 border-b border-border", isCollapsed && "px-2")}>
        {isCollapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div>
                <UserProfileSheet />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Edit Profile</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <UserProfileSheet />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <div className="space-y-1">
          {navItems.map((item) => (
            <Tooltip key={item.id} delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleNavigation(item.path)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                    'hover:bg-primary/10 hover:text-primary',
                    isActive(item.path) 
                      ? 'bg-primary/15 text-primary border border-primary/20' 
                      : 'text-muted-foreground',
                    isCollapsed && 'justify-center'
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!isCollapsed && (
                    <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                  )}
                </button>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.helpText}</p>
                </TooltipContent>
              )}
            </Tooltip>
          ))}
        </div>
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-border">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10",
                isCollapsed && "justify-center px-0"
              )}
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span>Logout</span>}
            </Button>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right">
              <p>Logout</p>
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </motion.aside>
  );
};
