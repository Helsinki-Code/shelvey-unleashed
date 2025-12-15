import { useState } from 'react';
import { Eye, CheckCircle2, Clock, Bot, User, Loader2, ThumbsUp, ThumbsDown, FileText, Camera, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ReportExporter } from '@/components/ReportExporter';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DeliverableCardProps {
  deliverable: {
    id: string;
    name: string;
    description: string | null;
    deliverable_type: string;
    status: string | null;
    ceo_approved: boolean | null;
    user_approved: boolean | null;
    feedback: string | null;
    generated_content: any;
    screenshots: any;
    citations: any;
    assigned_agent_id: string | null;
  };
  onViewWork: () => void;
  onRefresh: () => void;
}

export const DeliverableCard = ({ deliverable, onViewWork, onRefresh }: DeliverableCardProps) => {
  const [isApproving, setIsApproving] = useState(false);
  const [isRequestingReview, setIsRequestingReview] = useState(false);

  const content = deliverable.generated_content || {};
  const screenshots = deliverable.screenshots || [];
  const citations = deliverable.citations || [];
  const hasContent = Object.keys(content).length > 0 || content.report;

  // Safely derive a short preview text for the card without ever rendering raw objects
  const getPreviewText = (): string => {
    const candidate =
      content.executive_summary ||
      (Array.isArray(content.key_findings) ? content.key_findings[0] : undefined) ||
      content.report;

    if (!candidate) {
      return 'Content available - click View Work to see full report';
    }

    // If it's already a simple string
    if (typeof candidate === 'string') {
      return candidate.slice(0, 200);
    }

    // Handle objects with known keys from Phase 1 reports
    if (typeof candidate === 'object') {
      const obj = candidate as Record<string, any>;
      const text =
        obj.summary ||
        obj.description ||
        obj.project_name ||
        obj.industry ||
        JSON.stringify(obj);
      return String(text).slice(0, 200);
    }

    // Fallback for other primitive types
    return String(candidate).slice(0, 200);
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'review': return 'bg-blue-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'revision_requested': return 'bg-orange-500';
      default: return 'bg-muted';
    }
  };

  const requestCEOReview = async () => {
    setIsRequestingReview(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ceo-agent-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({
            action: 'review_deliverable',
            deliverableId: deliverable.id,
          }),
        }
      );

      toast.success('CEO has reviewed the deliverable!');
      onRefresh();
    } catch (error) {
      toast.error('Failed to request review');
    } finally {
      setIsRequestingReview(false);
    }
  };

  const approveDeliverable = async () => {
    setIsApproving(true);
    try {
      await supabase
        .from('phase_deliverables')
        .update({ user_approved: true, status: 'approved' })
        .eq('id', deliverable.id);

      toast.success('Deliverable approved!');
      onRefresh();
    } catch (error) {
      toast.error('Failed to approve');
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {deliverable.name}
            </CardTitle>
            <CardDescription className="mt-1">
              {deliverable.description || deliverable.deliverable_type}
            </CardDescription>
          </div>
          <Badge className={getStatusColor(deliverable.status)}>
            {deliverable.status || 'pending'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Preview Section */}
        {hasContent && (
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Preview</h4>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {getPreviewText()}
            </p>
          </div>
        )}

        {/* Stats Row */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Camera className="w-4 h-4" />
            <span>{screenshots.length} screenshots</span>
          </div>
          <div className="flex items-center gap-1">
            <Link2 className="w-4 h-4" />
            <span>{citations.length} citations</span>
          </div>
        </div>

        {/* Approval Status */}
        <div className="flex items-center gap-4 pt-2 border-t">
          <div className="flex items-center gap-2">
            {deliverable.ceo_approved ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <Clock className="w-5 h-5 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium flex items-center gap-1">
                <Bot className="w-3 h-3" /> CEO
              </p>
              <p className="text-xs text-muted-foreground">
                {deliverable.ceo_approved ? 'Approved' : 'Pending'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {deliverable.user_approved ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <Clock className="w-5 h-5 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium flex items-center gap-1">
                <User className="w-3 h-3" /> You
              </p>
              <p className="text-xs text-muted-foreground">
                {deliverable.user_approved ? 'Approved' : 'Pending'}
              </p>
            </div>
          </div>
        </div>

        {/* Feedback */}
        {deliverable.feedback && (
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-sm font-medium mb-1">CEO Feedback:</p>
            <p className="text-sm text-muted-foreground">{deliverable.feedback}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="outline" onClick={onViewWork} className="gap-2">
            <Eye className="w-4 h-4" />
            View Work
          </Button>

          {hasContent && !deliverable.ceo_approved && (
            <Button
              variant="outline"
              onClick={requestCEOReview}
              disabled={isRequestingReview}
              className="gap-2"
            >
              {isRequestingReview ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
              Request CEO Review
            </Button>
          )}

          {deliverable.ceo_approved && !deliverable.user_approved && (
            <Button
              onClick={approveDeliverable}
              disabled={isApproving}
              className="gap-2"
            >
              {isApproving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ThumbsUp className="w-4 h-4" />
              )}
              Approve
            </Button>
          )}

          {hasContent && (
            <ReportExporter 
              deliverableId={deliverable.id} 
              deliverableName={deliverable.name} 
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};