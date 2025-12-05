import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, Check, Clock, AlertCircle, Eye, 
  ThumbsUp, ThumbsDown, Loader2, ChevronDown, ChevronUp 
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface Deliverable {
  id: string;
  name: string;
  description: string | null;
  deliverable_type: string;
  status: string;
  content: any;
  assigned_agent_id: string | null;
  feedback: string | null;
  approved_at: string | null;
  phase_id: string;
}

interface DeliverableTrackerProps {
  projectId: string;
}

export function DeliverableTracker({ projectId }: DeliverableTrackerProps) {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDeliverable, setSelectedDeliverable] = useState<Deliverable | null>(null);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [rejectionFeedback, setRejectionFeedback] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (projectId) {
      fetchDeliverables();

      const channel = supabase
        .channel('deliverable-updates')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'phase_deliverables' 
        }, () => {
          fetchDeliverables();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [projectId]);

  const fetchDeliverables = async () => {
    // Get all phases for this project
    const { data: phases } = await supabase
      .from('business_phases')
      .select('id')
      .eq('project_id', projectId);

    if (phases && phases.length > 0) {
      const phaseIds = phases.map(p => p.id);
      
      const { data } = await supabase
        .from('phase_deliverables')
        .select('*')
        .in('phase_id', phaseIds)
        .order('created_at');

      if (data) setDeliverables(data);
    }
    setIsLoading(false);
  };

  const handleApprove = async (deliverable: Deliverable) => {
    setProcessingId(deliverable.id);
    try {
      const { data: phase } = await supabase
        .from('business_phases')
        .select('team_id')
        .eq('id', deliverable.phase_id)
        .single();

      const response = await supabase.functions.invoke('team-manager', {
        body: {
          action: 'approve_deliverable',
          teamId: phase?.team_id,
          deliverableId: deliverable.id,
          managerId: 'manager'
        }
      });

      if (response.error) throw response.error;
      toast.success(`${deliverable.name} approved!`);
      fetchDeliverables();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedDeliverable) return;
    
    setProcessingId(selectedDeliverable.id);
    try {
      const { data: phase } = await supabase
        .from('business_phases')
        .select('team_id')
        .eq('id', selectedDeliverable.phase_id)
        .single();

      const response = await supabase.functions.invoke('team-manager', {
        body: {
          action: 'reject_deliverable',
          teamId: phase?.team_id,
          deliverableId: selectedDeliverable.id,
          feedback: rejectionFeedback
        }
      });

      if (response.error) throw response.error;
      toast.info(`${selectedDeliverable.name} sent back for revision`);
      setShowRejectionDialog(false);
      setRejectionFeedback('');
      setSelectedDeliverable(null);
      fetchDeliverables();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject');
    } finally {
      setProcessingId(null);
    }
  };

  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phaseId)) {
        next.delete(phaseId);
      } else {
        next.add(phaseId);
      }
      return next;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <Check className="w-4 h-4 text-green-500" />;
      case 'in_progress': return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'review': return <Eye className="w-4 h-4 text-blue-500" />;
      case 'rejected': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-muted text-muted-foreground',
      in_progress: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
      review: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
      approved: 'bg-green-500/20 text-green-500 border-green-500/30',
      rejected: 'bg-red-500/20 text-red-500 border-red-500/30'
    };
    return colors[status] || colors.pending;
  };

  // Group deliverables by phase
  const deliverablesByPhase = deliverables.reduce((acc, d) => {
    if (!acc[d.phase_id]) acc[d.phase_id] = [];
    acc[d.phase_id].push(d);
    return acc;
  }, {} as Record<string, Deliverable[]>);

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card/50 backdrop-blur border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Deliverable Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deliverables.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No deliverables yet. Start a business project to begin.
            </p>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {deliverables.map((deliverable, index) => (
                  <motion.div
                    key={deliverable.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-3 rounded-lg border ${getStatusColor(deliverable.status)}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {getStatusIcon(deliverable.status)}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{deliverable.name}</div>
                          {deliverable.description && (
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {deliverable.description}
                            </div>
                          )}
                          {deliverable.feedback && (
                            <div className="text-xs text-red-500 mt-1">
                              Feedback: {deliverable.feedback}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className="text-xs capitalize">
                          {deliverable.deliverable_type}
                        </Badge>

                        {deliverable.status === 'review' && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleApprove(deliverable)}
                              disabled={processingId === deliverable.id}
                              className="h-7 w-7 p-0 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                            >
                              <ThumbsUp className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedDeliverable(deliverable);
                                setShowRejectionDialog(true);
                              }}
                              disabled={processingId === deliverable.id}
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            >
                              <ThumbsDown className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Deliverable</DialogTitle>
            <DialogDescription>
              Provide feedback for {selectedDeliverable?.name}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectionFeedback}
            onChange={(e) => setRejectionFeedback(e.target.value)}
            placeholder="What needs to be improved..."
            className="min-h-[100px]"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowRejectionDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectionFeedback.trim() || processingId !== null}
            >
              {processingId ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Back'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
