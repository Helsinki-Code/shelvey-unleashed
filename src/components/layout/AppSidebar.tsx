import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, MessageSquare, Briefcase, Users, Plug, Settings, 
  Crown, Building2, Globe, BarChart, Shield, HelpCircle,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useExperienceMode } from '@/contexts/ExperienceModeContext';
import { getTerm } from '@/lib/terminology';
import shelveyLogo from '@/assets/shelvey-logo.png';

interface NavItem {
  title: string;
  icon: typeof Home;
  path: string;
  tab?: string;
  techTerm?: string;
}

const mainNavItems: NavItem[] = [
  { title: 'Home', icon: Home, path: '/dashboard' },
  { title: 'Talk to CEO', icon: MessageSquare, path: '/dashboard', tab: 'ceo' },
  { title: 'My Projects', icon: Briefcase, path: '/dashboard', tab: 'projects' },
  { title: 'AI Team', icon: Users, path: '/organization' },
  { title: 'Connected Apps', icon: Plug, path: '/dashboard', tab: 'servers', techTerm: 'MCP Servers' },
];

const businessNavItems: NavItem[] = [
  { title: 'Organization', icon: Building2, path: '/organization' },
  { title: 'Websites', icon: Globe, path: '/websites' },
  { title: 'Analytics', icon: BarChart, path: '/admin' },
];

const settingsNavItems: NavItem[] = [
  { title: 'App Connections', icon: Plug, path: '/integrations', techTerm: 'API Keys' },
  { title: 'Settings', icon: Settings, path: '/dashboard', tab: 'keys' },
];

export const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSuperAdmin, profile } = useAuth();
  const { mode } = useExperienceMode();
  const { state, toggleSidebar } = useSidebar();

  const isCollapsed = state === 'collapsed';

  const handleNavigation = (path: string, tab?: string) => {
    if (tab) {
      navigate(path, { state: { activeTab: tab } });
    } else {
      navigate(path);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const renderNavItem = (item: NavItem) => {
    const displayTitle = item.techTerm ? getTerm(item.techTerm, mode) : item.title;
    const active = isActive(item.path);

    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton
          onClick={() => handleNavigation(item.path, item.tab)}
          isActive={active}
          tooltip={displayTitle}
        >
          <item.icon className="w-4 h-4" />
          <span>{displayTitle}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-3 px-2 py-3">
          <img src={shelveyLogo} alt="ShelVey" className="w-8 h-8 rounded-lg" />
          {!isCollapsed && (
            <div className="flex-1">
              <h2 className="font-bold text-sm">ShelVey</h2>
              <p className="text-xs text-muted-foreground">AI Business Team</p>
            </div>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 shrink-0"
            onClick={toggleSidebar}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Business</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {businessNavItems.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate('/super-admin')}
                    isActive={isActive('/super-admin')}
                    tooltip="Super Admin"
                  >
                    <Crown className="w-4 h-4" />
                    <span>Super Admin</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate('/developer-tools')}
                    isActive={isActive('/developer-tools')}
                    tooltip="Developer Tools"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Dev Tools</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNavItems.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Need Help?">
              <HelpCircle className="w-4 h-4" />
              <span>Need help?</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!isCollapsed && profile && (
          <div className="px-2 py-2 text-xs text-muted-foreground">
            {profile.subscription_status === 'trial' ? (
              <span className="flex items-center gap-1">
                <Crown className="w-3 h-3 text-amber-500" />
                Trial Active
              </span>
            ) : profile.subscription_status === 'active' ? (
              <span className="flex items-center gap-1">
                <Crown className="w-3 h-3 text-primary" />
                Pro Member
              </span>
            ) : null}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};
