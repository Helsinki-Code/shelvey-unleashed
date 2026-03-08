import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, X, Edit, HelpCircle, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAgentDef } from '@/types/agent';
import type { ApprovalRequest } from '@/types/agent';

interface ApprovalQueueProps {
  approvals: ApprovalRequest[];
  onApprove: (id: string, optionId: string, userInput?: string) => void;
  className?: string;
}

export function ApprovalQueue({ approvals, onApprove, className }: ApprovalQueueProps) {
  const [modifyInputs, setModifyInputs] = useState<Record<string, string>>({});
  const [showModify, setShowModify] = useState<string | null>(null);

  const pending = approvals.filter(a => a.status === 'pending');

  if (pending.length === 0) {
    return (
      <div className={cn("flex items-center justify-center py-8 text-muted-foreground text-sm", className)}>
        No pending approvals
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {pending.map((approval) => {
        const agentDef = getAgentDef(approval.agentId);
        const elapsed = Math.round((Date.now() - approval.createdAt) / 1000);
        const timeoutSec = Math.round(approval.timeoutMs / 1000);
        const remaining = Math.max(0, timeoutSec - elapsed);

        return (
          <Card key={approval.id} className="border-amber-500/50 bg-amber-500/5">
            <CardHeader className="py-3 px-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{agentDef.icon}</span>
                  <div>
                    <CardTitle className="text-sm">{approval.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">{agentDef.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {approval.blocking && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {Math.floor(remaining / 60)}:{(remaining % 60).toString().padStart(2, '0')}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 px-4 pb-3 space-y-3">
              <p className="text-xs text-muted-foreground">{approval.description}</p>
              {approval.workCompleted && (
                <p className="text-xs text-foreground/80 border-l-2 border-primary/30 pl-2">{approval.workCompleted}</p>
              )}

              {showModify === approval.id && (
                <Textarea
                  value={modifyInputs[approval.id] || ''}
                  onChange={(e) => setModifyInputs(prev => ({ ...prev, [approval.id]: e.target.value }))}
                  placeholder="Enter modifications..."
                  className="min-h-[60px] text-xs"
                />
              )}

              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={() => onApprove(approval.id, 'approve')} className="gap-1 flex-1">
                  <CheckCircle2 className="w-3 h-3" /> Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => onApprove(approval.id, 'reject')} className="gap-1">
                  <X className="w-3 h-3" /> Reject
                </Button>
                {showModify === approval.id ? (
                  <Button size="sm" variant="secondary" onClick={() => { onApprove(approval.id, 'modify', modifyInputs[approval.id]); setShowModify(null); }} className="gap-1">
                    <Edit className="w-3 h-3" /> Submit
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setShowModify(approval.id)} className="gap-1">
                    <Edit className="w-3 h-3" /> Modify
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
