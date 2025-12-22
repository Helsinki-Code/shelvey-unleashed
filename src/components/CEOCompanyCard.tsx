import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, ArrowRight, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CEOCompanyCardProps {
  companyType: string;
  companyName: string;
  ceoName?: string;
  ceoAvatar?: string | null;
  ceoPersona?: string;
  icon: string;
  route: string;
  isActive: boolean;
  status: 'built' | 'building' | 'planned';
  revenue?: number;
  projectCount?: number;
  description: string;
  onChat?: () => void;
}

export function CEOCompanyCard({
  companyName,
  ceoName,
  ceoPersona,
  icon,
  route,
  isActive,
  status,
  revenue = 0,
  projectCount = 0,
  description,
  onChat,
}: CEOCompanyCardProps) {
  const navigate = useNavigate();
  const isBuilt = status === 'built' || status === 'building';

  const statusBadge = {
    built: { variant: 'default' as const, text: isActive ? 'Active' : 'Ready' },
    building: { variant: 'secondary' as const, text: 'In Development' },
    planned: { variant: 'outline' as const, text: 'Coming Soon' },
  }[status];

  return (
    <Card 
      className={`transition-all duration-200 ${
        isBuilt 
          ? 'hover:border-primary/50 hover:shadow-lg cursor-pointer' 
          : 'opacity-60 cursor-not-allowed'
      }`}
      onClick={() => isBuilt && navigate(route)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{icon}</span>
            <div>
              <CardTitle className="text-base">{companyName}</CardTitle>
              {ceoName && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  CEO: {ceoName}
                </p>
              )}
            </div>
          </div>
          <Badge variant={statusBadge.variant} className="text-xs">
            {isActive && <Activity className="w-3 h-3 mr-1 animate-pulse" />}
            {statusBadge.text}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isActive ? (
          <>
            {/* Active company stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Revenue</p>
                <p className="text-lg font-bold text-emerald-500">
                  ${revenue.toLocaleString()}/mo
                </p>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Projects</p>
                <p className="text-lg font-bold">{projectCount}</p>
              </div>
            </div>

            {ceoPersona && (
              <div className="flex items-center gap-2 pt-2 border-t">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                  {ceoName?.charAt(0) || 'C'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{ceoName}</p>
                  <p className="text-xs text-muted-foreground">{ceoPersona} CEO</p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {onChat && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChat();
                  }}
                >
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Chat
                </Button>
              )}
              <Button
                size="sm"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(route);
                }}
              >
                Open
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Inactive company */}
            <p className="text-sm text-muted-foreground">{description}</p>
            
            {isBuilt && (
              <Button 
                size="sm" 
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(route);
                }}
              >
                Activate Company
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
