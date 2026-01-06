import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  MessageSquare, 
  Bot, 
  User,
  Clock,
  Eye,
  Globe,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCEO } from '@/hooks/useCEO';
import { toast } from 'sonner';

interface WebsiteFeedbackPanelProps {
  website: {
    id: string;
    name: string;
    html_content: string;
    css_content?: string;
    status: string;
    version: number;
    feedback_history: any[];
    ceo_approved: boolean;
    user_approved: boolean;
  };
  onUpdate: () => void;
  onHostingSetup: () => void;
}

export const WebsiteFeedbackPanel = ({ 
  website, 
  onUpdate,
  onHostingSetup 
}: WebsiteFeedbackPanelProps) => {
  const { ceoName } = useCEO();
  const [feedback, setFeedback] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isGettingCeoFeedback, setIsGettingCeoFeedback] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleRegenerate = async (from: 'ceo' | 'user') => {
    if (!feedback.trim()) {
      toast.error('Please provide feedback for regeneration');
      return;
    }

    setIsRegenerating(true);
    try {
      const response = await supabase.functions.invoke('regenerate-website', {
        body: {
          websiteId: website.id,
          feedback: feedback.trim(),
          feedbackFrom: from,
        },
      });

      if (response.error) throw response.error;

      setFeedback('');
      toast.success(`Website regenerated to v${website.version + 1}!`);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to regenerate');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleGetCeoFeedback = async () => {
    setIsGettingCeoFeedback(true);
    try {
      const response = await supabase.functions.invoke('approve-deliverable', {
        body: {
          websiteId: website.id,
          approver: 'ceo',
          approved: false, // This triggers feedback generation
        },
      });

      if (response.error) throw response.error;

      toast.success('CEO Agent feedback received!');
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to get CEO feedback');
    } finally {
      setIsGettingCeoFeedback(false);
    }
  };

  const handleApprove = async (approver: 'ceo' | 'user') => {
    try {
      const response = await supabase.functions.invoke('approve-deliverable', {
        body: {
          websiteId: website.id,
          approver,
          approved: true,
        },
      });

      if (response.error) throw response.error;

      toast.success(`${approver === 'ceo' ? ceoName : 'Your'} approval recorded!`);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve');
    }
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    review: 'bg-amber-500/20 text-amber-400',
    approved: 'bg-emerald-500/20 text-emerald-400',
    deployed: 'bg-blue-500/20 text-blue-400',
    'pending-dns': 'bg-purple-500/20 text-purple-400',
  };

  const previewHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>${website.css_content || ''}</style>
    </head>
    <body>${website.html_content}</body>
    </html>
  `;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{website.name}</CardTitle>
            <Badge className={statusColors[website.status] || statusColors.draft}>
              {website.status}
            </Badge>
            <Badge variant="outline" className="text-xs">
              v{website.version}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {website.ceo_approved && (
              <Badge className="bg-emerald-500/20 text-emerald-400">
                <Bot className="h-3 w-3 mr-1" />
                {ceoName} ✓
              </Badge>
            )}
            {website.user_approved && (
              <Badge className="bg-blue-500/20 text-blue-400">
                <User className="h-3 w-3 mr-1" />
                You ✓
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="preview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="feedback">
              Feedback ({website.feedback_history?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="approve">Approve</TabsTrigger>
            <TabsTrigger value="host" disabled={!website.ceo_approved || !website.user_approved}>
              Host
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-4">
            <div className="space-y-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
              
              {showPreview && (
                <div className="border border-border rounded-lg overflow-hidden">
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full h-[400px] bg-white"
                    title="Website Preview"
                  />
                </div>
              )}
              
              {!showPreview && (
                <div className="flex items-center justify-center py-12 bg-muted/30 rounded-lg">
                  <div className="text-center">
                    <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Click "Show Preview" to view the website</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="feedback" className="mt-4 space-y-4">
            {/* Get CEO Feedback Button */}
            <Button 
              variant="secondary" 
              size="sm"
              onClick={handleGetCeoFeedback}
              disabled={isGettingCeoFeedback}
            >
              {isGettingCeoFeedback ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Getting CEO Feedback...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Get CEO Agent Feedback
                </>
              )}
            </Button>

            {/* Feedback History */}
            <ScrollArea className="h-[150px]">
              {website.feedback_history?.length > 0 ? (
                <div className="space-y-3">
                  {website.feedback_history.map((fb: any, idx: number) => (
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
                          v{fb.version} • {new Date(fb.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-muted-foreground whitespace-pre-wrap">{fb.feedback}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No feedback yet</p>
              )}
            </ScrollArea>

            {/* Add Feedback & Regenerate */}
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
                  onClick={() => handleRegenerate('user')}
                  disabled={!feedback.trim() || isRegenerating}
                >
                  {isRegenerating ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <MessageSquare className="h-4 w-4 mr-2" />
                  )}
                  Regenerate (Your Feedback)
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => handleRegenerate('ceo')}
                  disabled={!feedback.trim() || isRegenerating}
                >
                  <Bot className="h-4 w-4 mr-2" />
                  Regenerate (CEO Feedback)
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
                      <span className="font-medium">{ceoName}'s Approval</span>
                    </div>
                    {website.ceo_approved ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => handleApprove('ceo')}
                    disabled={website.ceo_approved}
                  >
                    {website.ceo_approved ? 'Approved' : `Approve as ${ceoName}`}
                  </Button>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-blue-500" />
                      <span className="font-medium">Your Approval</span>
                    </div>
                    {website.user_approved ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => handleApprove('user')}
                    disabled={website.user_approved}
                  >
                    {website.user_approved ? 'Approved' : 'Approve'}
                  </Button>
                </Card>
              </div>

              {website.ceo_approved && website.user_approved && (
                <div className="flex items-center justify-center gap-2 p-4 bg-emerald-500/10 rounded-lg text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Fully Approved! Ready for hosting.</span>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="host" className="mt-4">
            {website.ceo_approved && website.user_approved ? (
              <div className="text-center py-8">
                <Globe className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Ready to Go Live!</h3>
                <p className="text-muted-foreground mb-4">
                  Your website is approved and ready to be hosted.
                </p>
                <Button onClick={onHostingSetup}>
                  <Globe className="h-4 w-4 mr-2" />
                  Set Up Hosting
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Both CEO and user approval required before hosting.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
