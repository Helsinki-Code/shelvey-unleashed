import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WebsiteBuilder } from "@/components/WebsiteBuilder";
import { WebsiteFeedbackPanel } from "@/components/WebsiteFeedbackPanel";
import { HostingSetup } from "@/components/HostingSetup";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Globe, Eye, Trash2, ExternalLink, 
  Loader2, FolderOpen, Settings, MessageSquare,
  CheckCircle2, Clock, Bot, User
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SubscriptionGate } from "@/components/SubscriptionGate";

interface Website {
  id: string;
  name: string;
  status: string;
  deployed_url: string | null;
  created_at: string;
  html_content: string;
  css_content?: string | null;
  metadata: any;
  version: number;
  feedback_history: any;
  ceo_approved: boolean;
  user_approved: boolean;
  hosting_type?: string | null;
  custom_domain?: string | null;
  dns_records?: any;
  ssl_status?: string | null;
}

const WebsitesPage = () => {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null);
  const [showHostingDialog, setShowHostingDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("builder");

  useEffect(() => {
    fetchWebsites();

    // Real-time subscription
    const channel = supabase
      .channel('websites-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'generated_websites' },
        () => fetchWebsites()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchWebsites = async () => {
    try {
      const { data, error } = await supabase
        .from('generated_websites')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWebsites(data || []);
    } catch (error) {
      console.error('Error fetching websites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteWebsite = async (id: string) => {
    try {
      const { error } = await supabase
        .from('generated_websites')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setWebsites(prev => prev.filter(w => w.id !== id));
      setSelectedWebsite(null);
      toast.success("Website deleted");
    } catch (error) {
      console.error('Error deleting website:', error);
      toast.error("Failed to delete website");
    }
  };

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    review: "bg-amber-500/20 text-amber-400",
    approved: "bg-emerald-500/20 text-emerald-400",
    'pending-dns': "bg-purple-500/20 text-purple-400",
    'dns-verified': "bg-blue-500/20 text-blue-400",
    deployed: "bg-emerald-500/20 text-emerald-400"
  };

  return (
    <>
      <Helmet>
        <title>Website Generator | ShelVey</title>
        <meta name="description" content="Generate AI-powered landing pages for your business" />
      </Helmet>
      
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        
        <main className="flex-1 pt-24 pb-16">
          <div className="container mx-auto px-4">
            {/* Hero Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  AI Website Generator
                </span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Create stunning landing pages with your approved branding. Get CEO feedback, iterate, and deploy.
              </p>
            </motion.div>

            <SubscriptionGate>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
                  <TabsTrigger value="builder">Create New</TabsTrigger>
                  <TabsTrigger value="websites">
                    My Websites ({websites.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="builder">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <WebsiteBuilder />
                  </motion.div>
                </TabsContent>

                <TabsContent value="websites">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Website List */}
                    <div className="lg:col-span-1">
                      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <FolderOpen className="h-5 w-5 text-primary" />
                            Your Websites
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                          {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                              <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                          ) : websites.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                              <Globe className="h-12 w-12 mx-auto mb-4 opacity-20" />
                              <p>No websites yet</p>
                            </div>
                          ) : (
                            websites.map((website) => (
                              <div
                                key={website.id}
                                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                  selectedWebsite?.id === website.id 
                                    ? 'border-primary bg-primary/5' 
                                    : 'border-border/50 hover:border-border'
                                }`}
                                onClick={() => setSelectedWebsite(website)}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <h3 className="font-medium text-sm">{website.name}</h3>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(website.created_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <Badge className={`text-xs ${statusColors[website.status]}`}>
                                    {website.status}
                                  </Badge>
                                </div>
                                
                                <div className="flex items-center gap-2 mt-2">
                                  {website.ceo_approved && (
                                    <Badge variant="outline" className="text-xs">
                                      <Bot className="h-3 w-3 mr-1" />
                                      CEO ✓
                                    </Badge>
                                  )}
                                  {website.user_approved && (
                                    <Badge variant="outline" className="text-xs">
                                      <User className="h-3 w-3 mr-1" />
                                      You ✓
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="text-xs">
                                    v{website.version}
                                  </Badge>
                                </div>

                                {website.deployed_url && (
                                  <a
                                    href={website.deployed_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline flex items-center gap-1 mt-2"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    {website.deployed_url}
                                  </a>
                                )}
                              </div>
                            ))
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Website Details */}
                    <div className="lg:col-span-2 space-y-6">
                      {selectedWebsite ? (
                        <>
                          {/* Feedback Panel */}
                          <WebsiteFeedbackPanel
                            website={selectedWebsite}
                            onUpdate={fetchWebsites}
                            onHostingSetup={() => setShowHostingDialog(true)}
                          />

                          {/* Actions */}
                          <div className="flex gap-3">
                            {selectedWebsite.ceo_approved && selectedWebsite.user_approved && (
                              <Button onClick={() => setShowHostingDialog(true)}>
                                <Globe className="h-4 w-4 mr-2" />
                                Set Up Hosting
                              </Button>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteWebsite(selectedWebsite.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </>
                      ) : (
                        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                          <CardContent className="flex flex-col items-center justify-center py-20">
                            <Eye className="h-16 w-16 text-muted-foreground/20 mb-4" />
                            <p className="text-muted-foreground">
                              Select a website to view details
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Hosting Dialog */}
              <Dialog open={showHostingDialog} onOpenChange={setShowHostingDialog}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Website Hosting Setup
                    </DialogTitle>
                  </DialogHeader>
                  {selectedWebsite && (
                    <HostingSetup
                      website={selectedWebsite}
                      onUpdate={() => {
                        fetchWebsites();
                        setShowHostingDialog(false);
                      }}
                    />
                  )}
                </DialogContent>
              </Dialog>
            </SubscriptionGate>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default WebsitesPage;
