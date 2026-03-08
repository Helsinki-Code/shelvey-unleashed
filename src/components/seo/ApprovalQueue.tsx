import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, X, MessageSquare, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AGENT_DEFINITIONS } from '@/types/agent';
import type { ApprovalRequest } from '@/types/agent';

interface ApprovalQueueProps {
  approvals: ApprovalRequest[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  className?: string;
}

const PRIORITY_STYLES: Record<string, string> = {
  critical: 'border-destructive/50 bg-destructive/5',
  high: 'border-amber-500/50 bg-amber-500/5',
  medium: 'border-border',
  low: 'border-border/50',
};

export function ApprovalQueue({ approvals, onApprove, onReject, className }: ApprovalQueueProps) {
  if (approvals.length === 0) {
    return (
      <div className={cn("flex items-center justify-center py-8 text-muted-foreground text-sm", className)}>
        No pending approvals
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {approvals.map((approval) => {
        const agentDef = AGENT_DEFINITIONS.find(d => d.type === approval.agentType);
        return (
          <Card key={approval.id} className={cn("transition-all", PRIORITY_STYLES[approval.priority])}>
            <CardHeader className="py-3 px-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{agentDef?.icon || '🤖'}</span>
                  <div>
                    <CardTitle className="text-sm">{approval.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">{approval.agentName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant={approval.priority === 'critical' ? 'destructive' : approval.priority === 'high' ? 'default' : 'secondary'} className="text-[10px]">
                    {approval.priority}
                  </Badge>
                  {approval.blocking && (
                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 px-4 pb-3 space-y-3">
              <p className="text-xs text-muted-foreground">{approval.description}</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => onApprove(approval.id)} className="gap-1 flex-1">
                  <CheckCircle2 className="w-3 h-3" /> Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => onReject(approval.id)} className="gap-1">
                  <X className="w-3 h-3" /> Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
