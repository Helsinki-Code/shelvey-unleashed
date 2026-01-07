import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileCode,
  ChevronRight,
  Rocket,
  Loader2,
  Eye,
  Code2,
  RefreshCw,
  Lock,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ReactCodePreview } from './ReactCodePreview';

interface WebsitePage {
  id: string;
  page_name: string;
  page_route: string;
  page_code: string;
  status: string;
  user_approved: boolean;
  feedback: string | null;
  version: number;
  created_at: string;
}

interface WebsitePageApprovalPanelProps {
  projectId: string;
  websiteId: string | null;
  availablePages: { name: string; route: string }[];
  onAllPagesApproved?: () => void;
  onDeployReady?: (pages: WebsitePage[]) => void;
}

export const WebsitePageApprovalPanel = ({
  projectId,
  websiteId,
  availablePages,
  onAllPagesApproved,
  onDeployReady,
}: WebsitePageApprovalPanelProps) => {
  const [pages, setPages] = useState<WebsitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPage, setSelectedPage] = useState<WebsitePage | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');

  // Calculate progress
  const approvedCount = pages.filter((p) => p.user_approved).length;
  const totalExpectedPages = availablePages.length || 1;
  const generatedCount = pages.length;
  const progressPercent = totalExpectedPages > 0 ? (approvedCount / totalExpectedPages) * 100 : 0;
  const allPagesApproved = approvedCount === totalExpectedPages && totalExpectedPages > 0;

  useEffect(() => {
    fetchPages();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('website-pages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'website_pages',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          fetchPages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, websiteId]);

  useEffect(() => {
    if (allPagesApproved && onAllPagesApproved) {
      onAllPagesApproved();
    }
  }, [allPagesApproved, onAllPagesApproved]);

  const fetchPages = async () => {
    try {
      const { data, error } = await supabase
        .from('website_pages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPages((data as WebsitePage[]) || []);
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePage = async (page: WebsitePage) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('website_pages')
        .update({
          user_approved: true,
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('id', page.id);

      if (error) throw error;

      toast.success(`${page.page_name} approved!`);
      setPreviewOpen(false);
      fetchPages();
    } catch (error) {
      console.error('Error approving page:', error);
      toast.error('Failed to approve page');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestChanges = async (page: WebsitePage) => {
    if (!feedback.trim()) {
      toast.error('Please provide feedback for the changes you want');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('website_pages')
        .update({
          status: 'revision_requested',
          user_approved: false,
          feedback,
        })
        .eq('id', page.id);

      if (error) throw error;

      toast.success('Revision requested - regenerate this page with your feedback');
      setFeedbackOpen(false);
      setFeedback('');
      fetchPages();
    } catch (error) {
      console.error('Error requesting changes:', error);
      toast.error('Failed to request changes');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeployWebsite = async () => {
    if (!websiteId) {
      toast.error('No website ID found. Please generate a website first.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast.error('Please sign in to deploy');
        return;
      }

      // Call deploy-to-vercel which properly bundles and deploys the website
      const response = await supabase.functions.invoke('deploy-to-vercel', {
        body: { websiteId, projectId },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Deployment failed');
      }

      const { productionUrl, deploymentUrl } = response.data;
      const liveUrl = productionUrl || deploymentUrl;
      
      toast.success(`Website deployed successfully!`, {
        description: `Live at: ${liveUrl}`,
        action: {
          label: 'View Site',
          onClick: () => window.open(liveUrl, '_blank'),
        },
      });

      if (onDeployReady) {
        onDeployReady(pages);
      }
    } catch (error: any) {
      console.error('Deployment error:', error);
      toast.error('Deployment failed', {
        description: error.message || 'Please try again',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPageStatus = (route: string) => {
    return pages.find((p) => p.page_route === route);
  };

  const getStatusBadge = (page: WebsitePage | undefined) => {
    if (!page) {
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="w-3 h-3" />
          Not Generated
        </Badge>
      );
    }
    if (page.user_approved) {
      return (
        <Badge className="gap-1 bg-green-500">
          <CheckCircle2 className="w-3 h-3" />
          Approved
        </Badge>
      );
    }
    if (page.status === 'revision_requested') {
      return (
        <Badge variant="destructive" className="gap-1">
          <RefreshCw className="w-3 h-3" />
          Needs Revision
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <Eye className="w-3 h-3" />
        Pending Review
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-primary" />
                Page Approval Workflow
              </CardTitle>
              <CardDescription>
                Approve each page before deploying. {approvedCount} of {totalExpectedPages} pages approved.
              </CardDescription>
            </div>
            {allPagesApproved && (
              <Button 
                onClick={handleDeployWebsite} 
                className="gap-2" 
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Rocket className="w-4 h-4" />
                )}
                {isSubmitting ? 'Deploying...' : 'Deploy Website'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Approval Progress</span>
              <span className="font-medium">{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Page Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {availablePages.map((availablePage, index) => {
          const page = getPageStatus(availablePage.route);
          const isApproved = page?.user_approved;

          return (
            <motion.div
              key={availablePage.route}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={`relative transition-all hover:shadow-md ${
                  isApproved
                    ? 'border-green-500/50 bg-green-500/5'
                    : page
                    ? 'border-primary/30'
                    : 'border-dashed'
                }`}
              >
                {isApproved && (
                  <div className="absolute top-3 right-3">
                    <Lock className="w-4 h-4 text-green-500" />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{availablePage.name}</CardTitle>
                      <p className="text-xs text-muted-foreground font-mono">{availablePage.route}</p>
                    </div>
                    {getStatusBadge(page)}
                  </div>
                </CardHeader>
                <CardContent>
                  {page ? (
                    <div className="space-y-3">
                      {/* Mini preview thumbnail */}
                      <div className="relative h-24 bg-muted rounded-lg overflow-hidden border">
                        <div className="absolute inset-0 scale-[0.25] origin-top-left w-[400%] h-[400%] pointer-events-none">
                          <ReactCodePreview code={page.page_code} />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1"
                          onClick={() => {
                            setSelectedPage(page);
                            setPreviewOpen(true);
                          }}
                        >
                          <Eye className="w-3 h-3" />
                          Review
                        </Button>
                        {!isApproved && (
                          <Button
                            size="sm"
                            className="flex-1 gap-1"
                            onClick={() => handleApprovePage(page)}
                            disabled={isSubmitting}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Approve
                          </Button>
                        )}
                      </div>

                      {page.feedback && (
                        <div className="p-2 bg-destructive/10 rounded text-xs text-destructive">
                          <strong>Feedback:</strong> {page.feedback}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <p className="text-sm">Generate this page to review</p>
                      <ChevronRight className="w-4 h-4 mx-auto mt-1 animate-pulse" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Full Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedPage?.page_name}
              <Badge variant="outline" className="font-mono text-xs">
                {selectedPage?.page_route}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Review this page carefully before approving. Once approved, it will be locked.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'preview' | 'code')}>
            <TabsList>
              <TabsTrigger value="preview" className="gap-1">
                <Eye className="w-4 h-4" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="code" className="gap-1">
                <Code2 className="w-4 h-4" />
                Code
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="mt-4">
              <div className="h-[500px] border rounded-lg overflow-hidden">
                {selectedPage && <ReactCodePreview code={selectedPage.page_code} />}
              </div>
            </TabsContent>

            <TabsContent value="code" className="mt-4">
              <ScrollArea className="h-[500px] border rounded-lg bg-zinc-950 p-4">
                <pre className="text-sm text-zinc-300 font-mono whitespace-pre-wrap">
                  {selectedPage?.page_code}
                </pre>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setFeedbackOpen(true);
                setPreviewOpen(false);
              }}
              className="gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Request Changes
            </Button>
            <Button
              onClick={() => selectedPage && handleApprovePage(selectedPage)}
              disabled={isSubmitting || selectedPage?.user_approved}
              className="gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Approve Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Changes for {selectedPage?.page_name}</DialogTitle>
            <DialogDescription>
              Describe what changes you'd like made to this page. The AI will regenerate it with your feedback.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Example: Make the hero section more bold, change the button colors to blue, add more spacing..."
            className="min-h-[120px]"
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedPage && handleRequestChanges(selectedPage)}
              disabled={isSubmitting || !feedback.trim()}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Feedback'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* All Approved State */}
      <AnimatePresence>
        {allPagesApproved && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className="border-green-500/50 bg-green-500/10">
              <CardContent className="py-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">All Pages Approved!</h3>
                <p className="text-muted-foreground mb-4">
                  Your website is ready for deployment. Click below to proceed.
                </p>
                <Button onClick={handleDeployWebsite} size="lg" className="gap-2">
                  <Rocket className="w-5 h-5" />
                  Deploy Website Now
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
