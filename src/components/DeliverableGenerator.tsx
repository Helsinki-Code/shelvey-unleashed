import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  MessageSquare, 
  RefreshCw,
  Sparkles,
  Clock,
  User,
  Bot
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DeliverableGeneratorProps {
  deliverable: {
    id: string;
    name: string;
    deliverable_type: string;
    status: string;
    generated_content: any;
    feedback_history: any[];
    ceo_approved: boolean;
    user_approved: boolean;
    version: number;
  };
  projectId: string;
  businessContext?: any;
  onUpdate: () => void;
}

export const DeliverableGenerator = ({ 
  deliverable, 
  projectId, 
  businessContext,
  onUpdate 
}: DeliverableGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 500);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to generate deliverables');
        return;
      }

      const response = await supabase.functions.invoke('generate-deliverable', {
        body: {
          deliverableId: deliverable.id,
          deliverableType: deliverable.deliverable_type,
          projectId,
          businessContext,
        },
      });

      if (response.error) throw response.error;

      setProgress(100);
      toast.success(`${deliverable.name} generated successfully!`);
      onUpdate();
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Failed to generate deliverable');
    } finally {
      clearInterval(progressInterval);
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const handleApprove = async (approver: 'ceo' | 'user') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke('approve-deliverable', {
        body: {
          deliverableId: deliverable.id,
          approver,
          approved: true,
        },
      });

      if (response.error) throw response.error;

      toast.success(`${approver === 'ceo' ? 'CEO' : 'Your'} approval recorded!`);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve');
    }
  };

  const handleSubmitFeedback = async (from: 'ceo' | 'user') => {
    if (!feedback.trim()) return;
    
    setIsSubmittingFeedback(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke('approve-deliverable', {
        body: {
          deliverableId: deliverable.id,
          approver: from,
          approved: false,
          feedback: feedback.trim(),
        },
      });

      if (response.error) throw response.error;

      setFeedback('');
      toast.success('Feedback submitted. Regenerating...');
      
      // Auto-regenerate with feedback
      await handleGenerate();
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit feedback');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-muted text-muted-foreground',
    'in-progress': 'bg-primary/20 text-primary',
    review: 'bg-amber-500/20 text-amber-400',
    approved: 'bg-emerald-500/20 text-emerald-400',
    rejected: 'bg-destructive/20 text-destructive',
  };

  const renderContent = () => {
    if (!deliverable.generated_content || Object.keys(deliverable.generated_content).length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No content generated yet</p>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Generate with AI
              </>
            )}
          </Button>
        </div>
      );
    }

    return (
      <ScrollArea className="h-[300px]">
        <pre className="text-xs bg-muted/50 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(deliverable.generated_content, null, 2)}
        </pre>
      </ScrollArea>
    );
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">{deliverable.name}</CardTitle>
            <Badge className={statusColors[deliverable.status] || statusColors.pending}>
              {deliverable.status}
            </Badge>
            <Badge variant="outline" className="text-xs">
              v{deliverable.version}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {deliverable.ceo_approved && (
              <Badge className="bg-emerald-500/20 text-emerald-400">
                <Bot className="h-3 w-3 mr-1" />
                CEO ✓
              </Badge>
            )}
            {deliverable.user_approved && (
              <Badge className="bg-blue-500/20 text-blue-400">
                <User className="h-3 w-3 mr-1" />
                You ✓
              </Badge>
            )}
          </div>
        </div>
        {isGenerating && (
          <Progress value={progress} className="h-2 mt-2" />
        )}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="feedback">
              Feedback ({deliverable.feedback_history?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="approve">Approve</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="mt-4">
            {renderContent()}
            {deliverable.generated_content && Object.keys(deliverable.generated_content).length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            )}
          </TabsContent>

          <TabsContent value="feedback" className="mt-4 space-y-4">
            {/* Feedback History */}
            <ScrollArea className="h-[150px]">
              {deliverable.feedback_history?.length > 0 ? (
                <div className="space-y-3">
                  {deliverable.feedback_history.map((fb: any, idx: number) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-lg text-sm ${
                        fb.from === 'ceo' ? 'bg-primary/10 border-l-2 border-primary' : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {fb.from === 'ceo' ? (
                          <Bot className="h-3 w-3" />
                        ) : (
                          <User className="h-3 w-3" />
                        )}
                        <span className="font-medium capitalize">{fb.from}</span>
                        <span className="text-muted-foreground text-xs">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {new Date(fb.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-muted-foreground">{fb.feedback}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No feedback yet</p>
              )}
            </ScrollArea>

            {/* Add Feedback */}
            <div className="space-y-2">
              <Textarea
                placeholder="Add feedback for improvements..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleSubmitFeedback('user')}
                  disabled={!feedback.trim() || isSubmittingFeedback}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Submit as User
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => handleSubmitFeedback('ceo')}
                  disabled={!feedback.trim() || isSubmittingFeedback}
                >
                  <Bot className="h-4 w-4 mr-2" />
                  Submit as CEO
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="approve" className="mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Bot className="h-5 w-5 text-primary" />
                      <span className="font-medium">CEO Approval</span>
                    </div>
                    {deliverable.ceo_approved ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => handleApprove('ceo')}
                    disabled={deliverable.ceo_approved || !deliverable.generated_content}
                  >
                    {deliverable.ceo_approved ? 'Approved' : 'Approve as CEO'}
                  </Button>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-blue-500" />
                      <span className="font-medium">Your Approval</span>
                    </div>
                    {deliverable.user_approved ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => handleApprove('user')}
                    disabled={deliverable.user_approved || !deliverable.generated_content}
                  >
                    {deliverable.user_approved ? 'Approved' : 'Approve'}
                  </Button>
                </Card>
              </div>

              {deliverable.ceo_approved && deliverable.user_approved && (
                <div className="flex items-center justify-center gap-2 p-4 bg-emerald-500/10 rounded-lg text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Fully Approved! Ready for next phase.</span>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
