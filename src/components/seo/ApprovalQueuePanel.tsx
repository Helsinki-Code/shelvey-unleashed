import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Check, X, Edit, Clock, AlertCircle } from 'lucide-react';
import type { ApprovalRequest } from '@/types/agent';
import { AGENT_DEFINITIONS } from '@/types/agent';

interface ApprovalQueuePanelProps {
  approvals: ApprovalRequest[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onModify: (id: string, input: string) => void;
}

export function ApprovalQueuePanel({ approvals, onApprove, onReject, onModify }: ApprovalQueuePanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modifyInput, setModifyInput] = useState('');

  if (approvals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">No pending approvals</p>
        <p className="text-xs">Approvals will appear here when agents complete phases</p>
      </div>
    );
  }

  const getAgentIcon = (agentId: string) => {
    const agent = AGENT_DEFINITIONS.find(a => a.id === agentId);
    return agent?.icon || '🤖';
  };

  return (
    <div className="space-y-3">
      {approvals.map((approval) => (
        <div
          key={approval.id}
          className="p-3 rounded-lg border border-orange-500/30 bg-orange-500/5 space-y-2"
        >
          <div className="flex items-start gap-2">
            <span className="text-lg">{getAgentIcon(approval.agentId)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{approval.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{approval.description}</p>
            </div>
            {approval.blocking && (
              <Badge variant="destructive" className="text-[10px]">
                <AlertCircle className="h-3 w-3 mr-1" />
                BLOCKING
              </Badge>
            )}
          </div>

          {editingId === approval.id ? (
            <div className="space-y-2">
              <Input
                placeholder="Enter modifications..."
                value={modifyInput}
                onChange={(e) => setModifyInput(e.target.value)}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    onModify(approval.id, modifyInput);
                    setEditingId(null);
                    setModifyInput('');
                  }}
                >
                  Submit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" className="gap-1 flex-1" onClick={() => onApprove(approval.id)}>
                <Check className="h-3 w-3" />
                Approve
              </Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setEditingId(approval.id)}>
                <Edit className="h-3 w-3" />
                Modify
              </Button>
              <Button size="sm" variant="destructive" className="gap-1" onClick={() => onReject(approval.id)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
