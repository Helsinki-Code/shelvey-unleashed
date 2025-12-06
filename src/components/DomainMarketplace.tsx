import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Globe, Check, X, Crown, Loader2, ShoppingCart, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DomainResult {
  domain: string;
  available: boolean;
  registrar: string;
  registrarPrice: number;
  ourPrice: number;
  isPremium: boolean;
  tld: string;
}

interface ContactInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export function DomainMarketplace() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<DomainResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<DomainResult | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address1: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
  });
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!query.trim() || query.length < 2) {
      toast({ title: "Please enter at least 2 characters", variant: "destructive" });
      return;
    }

    setIsSearching(true);
    setResults([]);
    setSuggestions([]);

    try {
      const { data, error } = await supabase.functions.invoke("domain-search", {
        body: { query: query.trim() },
      });

      if (error) throw error;

      setResults(data.results || []);
      setSuggestions(data.suggestions || []);
    } catch (error: any) {
      console.error("Search error:", error);
      toast({ title: "Search failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedDomain) return;

    // Validate contact info
    const requiredFields = ["firstName", "lastName", "email", "phone", "address1", "city", "state", "zip", "country"];
    for (const field of requiredFields) {
      if (!contactInfo[field as keyof ContactInfo]) {
        toast({ title: `Please fill in ${field}`, variant: "destructive" });
        return;
      }
    }

    setIsPurchasing(true);

    try {
      const { data, error } = await supabase.functions.invoke("purchase-domain", {
        body: {
          domain: selectedDomain.domain,
          contactInfo,
          autoRenew: true,
          privacyEnabled: true,
        },
      });

      if (error) throw error;

      if (data.url) {
        window.open(data.url, "_blank");
        setShowPurchaseDialog(false);
        toast({ title: "Redirecting to payment...", description: "Complete your purchase in the new tab" });
      }
    } catch (error: any) {
      console.error("Purchase error:", error);
      toast({ title: "Purchase failed", description: error.message, variant: "destructive" });
    } finally {
      setIsPurchasing(false);
    }
  };

  const openPurchaseDialog = (domain: DomainResult) => {
    setSelectedDomain(domain);
    setShowPurchaseDialog(true);
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Domain Marketplace
          </CardTitle>
          <CardDescription>
            Search and purchase domains directly from ShelVey. Standard domains: +$8 | Premium domains: +40%
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for your perfect domain..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        {isSearching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-12"
          >
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Searching domains...</span>
          </motion.div>
        )}

        {!isSearching && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold">Search Results</h3>
            <div className="grid gap-3">
              {results.map((result, index) => (
                <motion.div
                  key={result.domain}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={`${result.available ? "border-green-500/30 bg-green-500/5" : "border-muted bg-muted/30 opacity-60"}`}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        {result.available ? (
                          <Check className="h-5 w-5 text-green-500" />
                        ) : (
                          <X className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium">{result.domain}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {result.isPremium && (
                              <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                                <Crown className="h-3 w-3 mr-1" />
                                Premium
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              via {result.registrar}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-lg">${result.ourPrice.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground line-through">
                            ${result.registrarPrice.toFixed(2)}
                          </p>
                        </div>
                        {result.available && (
                          <Button size="sm" onClick={() => openPurchaseDialog(result)}>
                            <ShoppingCart className="h-4 w-4 mr-1" />
                            Buy
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {suggestions.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Alternative Suggestions</h4>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setQuery(suggestion.replace(/\.[^.]+$/, ""));
                        handleSearch();
                      }}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Purchase {selectedDomain?.domain}
            </DialogTitle>
            <DialogDescription>
              Complete your domain registration. Price: ${selectedDomain?.ourPrice.toFixed(2)}/year
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={contactInfo.firstName}
                  onChange={(e) => setContactInfo({ ...contactInfo, firstName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={contactInfo.lastName}
                  onChange={(e) => setContactInfo({ ...contactInfo, lastName: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={contactInfo.email}
                onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={contactInfo.phone}
                onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="address1">Address *</Label>
              <Input
                id="address1"
                value={contactInfo.address1}
                onChange={(e) => setContactInfo({ ...contactInfo, address1: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={contactInfo.city}
                  onChange={(e) => setContactInfo({ ...contactInfo, city: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={contactInfo.state}
                  onChange={(e) => setContactInfo({ ...contactInfo, state: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="zip">Zip Code *</Label>
                <Input
                  id="zip"
                  value={contactInfo.zip}
                  onChange={(e) => setContactInfo({ ...contactInfo, zip: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  value={contactInfo.country}
                  onChange={(e) => setContactInfo({ ...contactInfo, country: e.target.value })}
                />
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total</span>
                <span className="text-xl font-bold">${selectedDomain?.ourPrice.toFixed(2)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Includes 1 year registration + WHOIS privacy protection
              </p>
            </div>

            <Button className="w-full" onClick={handlePurchase} disabled={isPurchasing}>
              {isPurchasing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Proceed to Payment
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
