import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Globe, ArrowLeft, RefreshCw, Loader2, Calendar, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { DomainMarketplace } from "@/components/DomainMarketplace";
import { format } from "date-fns";

interface UserDomain {
  id: string;
  domain_name: string;
  registrar: string;
  purchase_price: number;
  our_price: number;
  is_premium: boolean;
  purchased_at: string;
  expires_at: string;
  auto_renew: boolean;
  privacy_enabled: boolean;
  status: string;
  connected_website_id: string | null;
  dns_configured: boolean;
}

export default function DomainsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [domains, setDomains] = useState<UserDomain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompletingPurchase, setIsCompletingPurchase] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchDomains();
    }
  }, [user]);

  // Finalize a domain purchase after Stripe redirects back
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!user || !sessionId || isCompletingPurchase) return;

    (async () => {
      setIsCompletingPurchase(true);
      try {
        const { data, error } = await supabase.functions.invoke("complete-domain-purchase", {
          body: { sessionId },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        toast({
          title: "Domain purchased!",
          description: data?.domain ? `${data.domain} is now active.` : "Your domain is now active.",
        });
        await fetchDomains();
      } catch (err: any) {
        console.error("Complete purchase error:", err);
        toast({
          title: "Could not finalize domain purchase",
          description: err?.message || "Please try refreshing this page.",
          variant: "destructive",
        });
      } finally {
        setIsCompletingPurchase(false);
        // Remove query params to prevent re-running on refresh
        navigate("/domains", { replace: true });
      }
    })();
  }, [user, searchParams, navigate, toast, isCompletingPurchase]);

  const fetchDomains = async () => {
    try {
      const { data, error } = await supabase
        .from("user_domains")
        .select("*")
        .eq("user_id", user?.id)
        .order("purchased_at", { ascending: false });

      if (error) throw error;
      setDomains(data || []);
    } catch (error: any) {
      console.error("Error fetching domains:", error);
      toast({ title: "Failed to load domains", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case "pending_payment":
        return <Badge variant="outline" className="text-amber-500 border-amber-500/30"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Pending</Badge>;
      case "expired":
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Globe className="h-8 w-8 text-primary" />
              Domains
            </h1>
            <p className="text-muted-foreground mt-1">Search, purchase, and manage your domains</p>
          </div>
          <Button variant="outline" onClick={fetchDomains}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </motion.div>

      <Tabs defaultValue="search" className="space-y-6">
        <TabsList>
          <TabsTrigger value="search">Search & Buy</TabsTrigger>
          <TabsTrigger value="my-domains">My Domains ({domains.filter(d => d.status === "active").length})</TabsTrigger>
        </TabsList>

        <TabsContent value="search">
          <DomainMarketplace />
        </TabsContent>

        <TabsContent value="my-domains">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : domains.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No domains yet</h3>
                <p className="text-muted-foreground mb-4">Search and purchase your first domain to get started</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {domains.map((domain) => (
                <motion.div
                  key={domain.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold">{domain.domain_name}</h3>
                            {getStatusBadge(domain.status)}
                            {domain.is_premium && (
                              <Badge variant="outline" className="text-amber-500 border-amber-500/30">Premium</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Expires: {domain.expires_at ? format(new Date(domain.expires_at), "MMM d, yyyy") : "N/A"}
                            </span>
                            <span>Registrar: {domain.registrar}</span>
                            <span>Auto-renew: {domain.auto_renew ? "On" : "Off"}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {domain.status === "active" && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={`https://${domain.domain_name}`} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Visit
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
