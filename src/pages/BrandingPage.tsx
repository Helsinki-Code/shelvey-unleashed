import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Palette, Sparkles, Check, X, MessageSquare, Eye, ArrowRight, Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { BrandLogoGenerator } from '@/components/BrandLogoGenerator';
import { BrandAssetsPanel } from '@/components/BrandAssetsPanel';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface BrandDeliverable {
  id: string;
  name: string;
  deliverable_type: string;
  status: string;
  generated_content: any;
  ceo_approved: boolean | null;
  user_approved: boolean | null;
  feedback_history: any;
  version: number;
}

export default function BrandingPage() {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [deliverables, setDeliverables] = useState<BrandDeliverable[]>([]);
  const [selectedDeliverable, setSelectedDeliverable] = useState<BrandDeliverable | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userFeedback, setUserFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCEOReviewing, setIsCEOReviewing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchBrandDeliverables();
    }
  }, [user]);

  const fetchBrandDeliverables = async () => {
    try {
      const { data, error } = await supabase
        .from('phase_deliverables')
        .select(`
          id, name, deliverable_type, status, generated_content, 
          ceo_approved, user_approved, feedback_history, version,
          business_phases!inner(phase_number, user_id)
        `)
        .eq('business_phases.phase_number', 2)
        .eq('business_phases.user_id', user?.id)
        .in('deliverable_type', ['brand_identity', 'visual_identity', 'brand_strategy', 'logo_design']);

      if (error) throw error;
      setDeliverables(data || []);
      if (data && data.length > 0) {
        setSelectedDeliverable(data[0]);
      }
    } catch (error) {
      console.error('Error fetching deliverables:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const requestCEOReview = async (deliverable: BrandDeliverable) => {
    if (!session) return;
    setIsCEOReviewing(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/approve-deliverable`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            deliverableId: deliverable.id,
            action: 'ceo_review',
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      toast({
        title: 'CEO Review Complete',
        description: data.ceoApproved ? 'CEO Agent approved this deliverable!' : 'CEO Agent provided feedback for improvements.',
      });

      // Refresh deliverables
      await fetchBrandDeliverables();
    } catch (error) {
      toast({
        title: 'Review Error',
        description: error instanceof Error ? error.message : 'Failed to get CEO review',
        variant: 'destructive',
      });
    } finally {
      setIsCEOReviewing(false);
    }
  };

  const submitUserApproval = async (approved: boolean) => {
    if (!session || !selectedDeliverable) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/approve-deliverable`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            deliverableId: selectedDeliverable.id,
            action: approved ? 'user_approve' : 'user_reject',
            feedback: userFeedback || undefined,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      toast({
        title: approved ? 'Approved!' : 'Feedback Submitted',
        description: approved 
          ? 'Your approval has been recorded. Proceeding to next steps...'
          : 'Your feedback has been submitted for revision.',
      });

      setUserFeedback('');
      await fetchBrandDeliverables();

      // Check if both approved - proceed to website generation
      if (approved && selectedDeliverable.ceo_approved) {
        toast({
          title: 'Phase 2 Complete!',
          description: 'Both CEO and User approved. Ready to generate website!',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const proceedToWebsite = () => {
    navigate('/websites');
  };

  const allApproved = deliverables.every(d => d.ceo_approved && d.user_approved);

  return (
    <>
      <Helmet>
        <title>Brand Identity - Phase 2 | ShelVey</title>
        <meta name="description" content="Create premium brand identity with AI-powered logo generation and brand assets" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />

        <main className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold cyber-text mb-2">Phase 2: Brand Identity</h1>
                <p className="text-muted-foreground">Create your premium brand with AI-powered generation</p>
              </div>
              {allApproved && (
                <Button onClick={proceedToWebsite} className="gap-2">
                  Proceed to Website <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Deliverables List */}
            <Card className="glass-morphism cyber-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  Brand Deliverables
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : deliverables.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No brand deliverables yet. Start by generating content below.
                  </p>
                ) : (
                  deliverables.map((deliverable) => (
                    <motion.div
                      key={deliverable.id}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setSelectedDeliverable(deliverable)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedDeliverable?.id === deliverable.id
                          ? 'bg-primary/20 border border-primary/50'
                          : 'bg-muted/50 hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{deliverable.name}</span>
                        <Badge variant="outline" className="text-xs">
                          v{deliverable.version}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={deliverable.ceo_approved ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {deliverable.ceo_approved ? <Check className="w-3 h-3 mr-1" /> : null}
                          CEO
                        </Badge>
                        <Badge 
                          variant={deliverable.user_approved ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {deliverable.user_approved ? <Check className="w-3 h-3 mr-1" /> : null}
                          You
                        </Badge>
                      </div>
                    </motion.div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-6">
              <Tabs defaultValue="generator" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="generator">Logo Generator</TabsTrigger>
                  <TabsTrigger value="assets">Brand Assets</TabsTrigger>
                  <TabsTrigger value="review">Review & Approve</TabsTrigger>
                </TabsList>

                <TabsContent value="generator" className="mt-6">
                  <BrandLogoGenerator />
                </TabsContent>

                <TabsContent value="assets" className="mt-6">
                  <BrandAssetsPanel />
                </TabsContent>

                <TabsContent value="review" className="mt-6">
                  {selectedDeliverable ? (
                    <Card className="glass-morphism cyber-border">
                      <CardHeader>
                        <CardTitle>{selectedDeliverable.name}</CardTitle>
                        <CardDescription>
                          Review and approve this brand deliverable
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Preview */}
                        {selectedDeliverable.generated_content && (
                          <div className="p-4 bg-muted/50 rounded-lg">
                            <h4 className="font-medium mb-3 flex items-center gap-2">
                              <Eye className="w-4 h-4" />
                              Generated Content
                            </h4>
                            <pre className="text-xs overflow-auto max-h-48 p-3 bg-background rounded">
                              {JSON.stringify(selectedDeliverable.generated_content, null, 2)}
                            </pre>
                          </div>
                        )}

                        {/* Approval Status */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className={`p-4 rounded-lg border ${
                            selectedDeliverable.ceo_approved 
                              ? 'border-green-500/50 bg-green-500/10' 
                              : 'border-border'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">CEO Agent Review</span>
                              {selectedDeliverable.ceo_approved ? (
                                <Check className="w-5 h-5 text-green-500" />
                              ) : (
                                <X className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                            {!selectedDeliverable.ceo_approved && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => requestCEOReview(selectedDeliverable)}
                                disabled={isCEOReviewing}
                              >
                                {isCEOReviewing ? (
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                  <Sparkles className="w-4 h-4 mr-2" />
                                )}
                                Request CEO Review
                              </Button>
                            )}
                          </div>

                          <div className={`p-4 rounded-lg border ${
                            selectedDeliverable.user_approved 
                              ? 'border-green-500/50 bg-green-500/10' 
                              : 'border-border'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">Your Approval</span>
                              {selectedDeliverable.user_approved ? (
                                <Check className="w-5 h-5 text-green-500" />
                              ) : (
                                <X className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                            {selectedDeliverable.user_approved && (
                              <span className="text-sm text-green-500">Approved</span>
                            )}
                          </div>
                        </div>

                        {/* User Feedback & Approval */}
                        {!selectedDeliverable.user_approved && (
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium mb-2 block">
                                <MessageSquare className="w-4 h-4 inline mr-2" />
                                Your Feedback (Optional)
                              </label>
                              <Textarea
                                placeholder="Provide any feedback or suggestions for improvement..."
                                value={userFeedback}
                                onChange={(e) => setUserFeedback(e.target.value)}
                                rows={3}
                              />
                            </div>
                            <div className="flex gap-3">
                              <Button
                                onClick={() => submitUserApproval(true)}
                                disabled={isSubmitting}
                                className="flex-1"
                              >
                                {isSubmitting ? (
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                  <Check className="w-4 h-4 mr-2" />
                                )}
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => submitUserApproval(false)}
                                disabled={isSubmitting || !userFeedback.trim()}
                              >
                                <X className="w-4 h-4 mr-2" />
                                Request Changes
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Feedback History */}
                        {selectedDeliverable.feedback_history && selectedDeliverable.feedback_history.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-3">Feedback History</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {selectedDeliverable.feedback_history.map((fb: any, idx: number) => (
                                <div key={idx} className="p-3 bg-muted/50 rounded-lg text-sm">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="text-xs">
                                      {fb.source}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(fb.timestamp).toLocaleString()}
                                    </span>
                                  </div>
                                  <p>{fb.feedback}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Both Approved - Next Steps */}
                        {selectedDeliverable.ceo_approved && selectedDeliverable.user_approved && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-4 bg-green-500/10 border border-green-500/50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <Check className="w-6 h-6 text-green-500" />
                              <div>
                                <h4 className="font-medium text-green-500">Fully Approved!</h4>
                                <p className="text-sm text-muted-foreground">
                                  This deliverable is approved by both CEO Agent and you.
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="glass-morphism cyber-border">
                      <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground">
                          Select a deliverable to review, or generate new brand content.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
