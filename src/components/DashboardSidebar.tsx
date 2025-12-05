import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home, MessageSquare, Briefcase, Users, Server, Key, Globe,
  Building2, HelpCircle, ChevronLeft, ChevronRight,
  Phone, BarChart, Zap, BookOpen, Sparkles, Mic
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import shelveyLogo from '@/assets/shelvey-logo.png';

interface NavItem {
  id: string;
  label: string;
  icon: typeof Home;
  path?: string;
  onClick?: () => void;
  badge?: string;
  helpText: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

interface DashboardSidebarProps {
  onNavigate?: (section: string) => void;
  activeSection?: string;
}

export const DashboardSidebar = ({ onNavigate, activeSection }: DashboardSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navGroups: NavGroup[] = [
    {
      title: 'Main',
      items: [
        { 
          id: 'home', 
          label: 'Dashboard', 
          icon: Home, 
          path: '/dashboard',
          helpText: 'Your main command center - see everything at a glance'
        },
        { 
          id: 'ceo', 
          label: 'Talk to CEO', 
          icon: MessageSquare, 
          onClick: () => onNavigate?.('ceo'),
          helpText: 'Chat with your AI CEO to plan and execute business ideas'
        },
        { 
          id: 'voice', 
          label: 'Voice Calls', 
          icon: Mic, 
          path: '/voice',
          badge: 'New',
          helpText: 'Have real-time voice conversations with any AI agent'
        },
      ]
    },
    {
      title: 'Your Business',
      items: [
        { 
          id: 'projects', 
          label: 'Projects', 
          icon: Briefcase, 
          onClick: () => onNavigate?.('projects'),
          helpText: 'View and manage all your business projects'
        },
        { 
          id: 'websites', 
          label: 'Websites', 
          icon: Globe, 
          path: '/websites',
          helpText: 'See websites your AI team has built for you'
        },
        { 
          id: 'branding', 
          label: 'Branding', 
          icon: Sparkles, 
          path: '/branding',
          helpText: 'Logos, colors, and brand assets created for you'
        },
      ]
    },
    {
      title: 'Your AI Team',
      items: [
        { 
          id: 'organization', 
          label: 'Organization', 
          icon: Building2, 
          path: '/organization',
          helpText: 'See your 25 AI agents organized by department'
        },
        { 
          id: 'team', 
          label: 'Team Activity', 
          icon: Users, 
          onClick: () => onNavigate?.('team'),
          helpText: 'Watch your AI team collaborate in real-time'
        },
        { 
          id: 'meetings', 
          label: 'Meetings', 
          icon: Phone, 
          path: '/meetings',
          helpText: 'View AI team meetings and standups'
        },
      ]
    },
    {
      title: 'Settings & Tools',
      items: [
        { 
          id: 'servers', 
          label: 'Integrations', 
          icon: Server, 
          onClick: () => onNavigate?.('servers'),
          helpText: 'Connect apps like Twitter, Stripe, and more'
        },
        { 
          id: 'keys', 
          label: 'API Keys', 
          icon: Key, 
          onClick: () => onNavigate?.('keys'),
          helpText: 'Manage your API keys for external services'
        },
        { 
          id: 'analytics', 
          label: 'Analytics', 
          icon: BarChart, 
          path: '/admin',
          helpText: 'Track performance and business metrics'
        },
      ]
    },
    {
      title: 'Learn',
      items: [
        { 
          id: 'help', 
          label: 'Help Center', 
          icon: HelpCircle, 
          onClick: () => onNavigate?.('help'),
          helpText: 'Get help and learn how to use ShelVey'
        },
        { 
          id: 'features', 
          label: 'Features Guide', 
          icon: BookOpen, 
          onClick: () => onNavigate?.('features'),
          helpText: 'Explore all ShelVey features with tutorials'
        },
      ]
    },
  ];

  const handleItemClick = (item: NavItem) => {
    if (item.path) {
      navigate(item.path);
    } else if (item.onClick) {
      item.onClick();
    }
  };

  const isActive = (item: NavItem) => {
    if (item.path) {
      return location.pathname === item.path;
    }
    return activeSection === item.id;
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
            className="h-8 w-8 cursor-pointer" 
            onClick={() => navigate('/')}
          />
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="shrink-0"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {navGroups.map((group) => (
          <div key={group.title} className="mb-6">
            {!isCollapsed && (
              <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {group.title}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <Tooltip key={item.id} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleItemClick(item)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                        'hover:bg-primary/10 hover:text-primary',
                        isActive(item) 
                          ? 'bg-primary/15 text-primary border border-primary/20' 
                          : 'text-muted-foreground',
                        isCollapsed && 'justify-center'
                      )}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!isCollapsed && (
                        <>
                          <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                          {item.badge && (
                            <Badge variant="secondary" className="text-xs bg-primary/20 text-primary">
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                    </button>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="right" className="max-w-xs">
                      <p className="font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.helpText}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Help */}
      {!isCollapsed && (
        <div className="p-4 border-t border-border">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Need Help?</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Click any <HelpCircle className="h-3 w-3 inline" /> icon for instant explanations
            </p>
          </div>
        </div>
      )}
    </motion.aside>
  );
};
