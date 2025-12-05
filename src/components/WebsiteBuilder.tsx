import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Globe, Sparkles, Loader2, Eye, Code, Rocket, 
  Palette, Plus, X 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface GeneratedWebsite {
  id: string;
  name: string;
  html: string;
  css: string;
  js: string;
  status: string;
}

export const WebsiteBuilder = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [generatedWebsite, setGeneratedWebsite] = useState<GeneratedWebsite | null>(null);
  const [activeTab, setActiveTab] = useState("preview");
  
  const [formData, setFormData] = useState({
    businessName: "",
    industry: "",
    headline: "",
    description: "",
    features: [""],
    ctaText: "",
    primaryColor: "#6366f1",
    secondaryColor: "#8b5cf6"
  });

  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData({ ...formData, features: newFeatures });
  };

  const addFeature = () => {
    if (formData.features.length < 6) {
      setFormData({ ...formData, features: [...formData.features, ""] });
    }
  };

  const removeFeature = (index: number) => {
    if (formData.features.length > 1) {
      setFormData({
        ...formData,
        features: formData.features.filter((_, i) => i !== index)
      });
    }
  };

  const generateWebsite = async () => {
    if (!formData.businessName) {
      toast.error("Please enter a business name");
      return;
    }

    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to generate websites");
        return;
      }

      const response = await supabase.functions.invoke('generate-website', {
        body: {
          businessName: formData.businessName,
          industry: formData.industry,
          headline: formData.headline,
          description: formData.description,
          features: formData.features.filter(f => f.trim()),
          ctaText: formData.ctaText,
          brandColors: {
            primary: formData.primaryColor,
            secondary: formData.secondaryColor
          }
        }
      });

      if (response.error) throw response.error;

      setGeneratedWebsite(response.data.website);
      setActiveTab("preview");
      toast.success("Website generated successfully!");
    } catch (error: any) {
      console.error("Generation error:", error);
      toast.error(error.message || "Failed to generate website");
    } finally {
      setIsGenerating(false);
    }
  };

  const deployWebsite = async () => {
    if (!generatedWebsite) return;

    setIsDeploying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to deploy websites");
        return;
      }

      const response = await supabase.functions.invoke('deploy-website', {
        body: { websiteId: generatedWebsite.id }
      });

      if (response.error) throw response.error;

      toast.success(`Website deployed! URL: ${response.data.deployment.deployedUrl}`);
      setGeneratedWebsite({
        ...generatedWebsite,
        status: 'deployed'
      });
    } catch (error: any) {
      console.error("Deployment error:", error);
      toast.error(error.message || "Failed to deploy website");
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form Section */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Website Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name *</Label>
            <Input
              id="businessName"
              placeholder="Enter your business name"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Input
              id="industry"
              placeholder="e.g., Technology, Healthcare, Finance"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="headline">Headline</Label>
            <Input
              id="headline"
              placeholder="Your compelling headline"
              value={formData.headline}
              onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of your business"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Features</Label>
            {formData.features.map((feature, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder={`Feature ${index + 1}`}
                  value={feature}
                  onChange={(e) => handleFeatureChange(index, e.target.value)}
                />
                {formData.features.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFeature(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {formData.features.length < 6 && (
              <Button variant="outline" size="sm" onClick={addFeature}>
                <Plus className="h-4 w-4 mr-2" />
                Add Feature
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ctaText">Call-to-Action Text</Label>
            <Input
              id="ctaText"
              placeholder="e.g., Get Started, Sign Up Free"
              value={formData.ctaText}
              onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primaryColor" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Primary Color
              </Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  id="primaryColor"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondaryColor" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Secondary Color
              </Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  id="secondaryColor"
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <Button
            onClick={generateWebsite}
            disabled={isGenerating || !formData.businessName}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Website...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Website
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Preview Section */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Website Preview
            </CardTitle>
            {generatedWebsite && (
              <div className="flex items-center gap-2">
                <Badge variant={generatedWebsite.status === 'deployed' ? 'default' : 'secondary'}>
                  {generatedWebsite.status}
                </Badge>
                {generatedWebsite.status !== 'deployed' && (
                  <Button
                    size="sm"
                    onClick={deployWebsite}
                    disabled={isDeploying}
                  >
                    {isDeploying ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Rocket className="h-4 w-4 mr-2" />
                        Deploy
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {generatedWebsite ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="preview" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="code" className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Code
                </TabsTrigger>
              </TabsList>
              <TabsContent value="preview" className="mt-4">
                <div className="border rounded-lg overflow-hidden bg-white">
                  <iframe
                    srcDoc={generatedWebsite.html}
                    className="w-full h-[500px]"
                    title="Website Preview"
                    sandbox="allow-scripts"
                  />
                </div>
              </TabsContent>
              <TabsContent value="code" className="mt-4">
                <div className="bg-muted/50 rounded-lg p-4 overflow-auto max-h-[500px]">
                  <pre className="text-xs">
                    <code>{generatedWebsite.html}</code>
                  </pre>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-[500px] text-muted-foreground"
            >
              <Globe className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-center">
                Fill in the form and click "Generate Website" to see your AI-generated landing page here.
              </p>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
