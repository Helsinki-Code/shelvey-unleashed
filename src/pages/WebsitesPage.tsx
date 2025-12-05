import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WebsiteBuilder } from "@/components/WebsiteBuilder";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Globe, Rocket, Eye, Trash2, ExternalLink, 
  Loader2, FolderOpen 
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
  metadata: any;
}

const WebsitesPage = () => {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");

  useEffect(() => {
    fetchWebsites();
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

  const previewWebsite = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('generated_websites')
        .select('html_content')
        .eq('id', id)
        .single();

      if (error) throw error;
      setPreviewHtml(data.html_content);
      setSelectedPreview(id);
    } catch (error) {
      console.error('Error fetching preview:', error);
      toast.error("Failed to load preview");
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
      toast.success("Website deleted");
    } catch (error) {
      console.error('Error deleting website:', error);
      toast.error("Failed to delete website");
    }
  };

  const deployWebsite = async (id: string) => {
    try {
      const response = await supabase.functions.invoke('deploy-website', {
        body: { websiteId: id }
      });

      if (response.error) throw response.error;

      toast.success(`Deployed! ${response.data.deployment.deployedUrl}`);
      fetchWebsites();
    } catch (error: any) {
      console.error('Deployment error:', error);
      toast.error(error.message || "Failed to deploy");
    }
  };

  const statusColors = {
    draft: "bg-yellow-500/20 text-yellow-500",
    published: "bg-blue-500/20 text-blue-500",
    deployed: "bg-green-500/20 text-green-500"
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
                Create stunning landing pages in seconds with our AI-powered website generator.
                No coding required.
              </p>
            </motion.div>

            <SubscriptionGate>
              {/* Website Builder */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-12"
              >
                <WebsiteBuilder />
              </motion.div>

              {/* Generated Websites List */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FolderOpen className="h-5 w-5 text-primary" />
                      Your Generated Websites
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : websites.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Globe className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>No websites generated yet. Create your first one above!</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {websites.map((website) => (
                          <Card key={website.id} className="bg-background/50 border-border/50">
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h3 className="font-semibold">{website.name}</h3>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(website.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                                <Badge className={statusColors[website.status as keyof typeof statusColors]}>
                                  {website.status}
                                </Badge>
                              </div>
                              
                              {website.deployed_url && (
                                <a
                                  href={website.deployed_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline flex items-center gap-1 mb-3"
                                >
                                  {website.deployed_url}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}

                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => previewWebsite(website.id)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Preview
                                </Button>
                                {website.status !== 'deployed' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => deployWebsite(website.id)}
                                  >
                                    <Rocket className="h-4 w-4 mr-1" />
                                    Deploy
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteWebsite(website.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Preview Modal */}
              {selectedPreview && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
                  onClick={() => setSelectedPreview(null)}
                >
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="bg-card border border-border rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-4 border-b border-border flex items-center justify-between">
                      <h3 className="font-semibold">Website Preview</h3>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedPreview(null)}>
                        Close
                      </Button>
                    </div>
                    <iframe
                      srcDoc={previewHtml}
                      className="w-full h-[80vh] bg-white"
                      title="Website Preview"
                      sandbox="allow-scripts"
                    />
                  </motion.div>
                </motion.div>
              )}
            </SubscriptionGate>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default WebsitesPage;
