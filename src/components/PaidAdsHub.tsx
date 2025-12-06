import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Sparkles, 
  DollarSign, 
  Target, 
  TrendingUp,
  Image as ImageIcon,
  Layers,
  Play,
  Pause,
  BarChart3,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PaidAdsHubProps {
  projectId: string;
  campaignId?: string;
}

export function PaidAdsHub({ projectId, campaignId }: PaidAdsHubProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCreatives, setGeneratedCreatives] = useState<Array<{
    id: string;
    image_urls: string[];
    headline: string;
    description: string;
    cta: string;
    ab_variant: string;
  }>>([]);
  const [adSettings, setAdSettings] = useState({
    platform: 'facebook',
    goal: 'conversions',
    budget: '100',
    productDescription: '',
    targetAudience: '',
    style: 'Modern, clean design'
  });

  const generateCreatives = async () => {
    if (!campaignId) {
      toast.error("Please select or create a campaign first");
      return;
    }

    setIsGenerating(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      
      const { data, error } = await supabase.functions.invoke('ad-creative-generator', {
        body: {
          action: 'generate_ad_images',
          userId: user?.id,
          campaignId,
          params: {
            platform: adSettings.platform,
            goal: adSettings.goal,
            productDescription: adSettings.productDescription,
            targetAudience: adSettings.targetAudience,
            style: adSettings.style,
            variants: 3
          }
        }
      });

      if (error) throw error;
      
      if (data?.data?.creatives) {
        setGeneratedCreatives(data.data.creatives);
        toast.success(`Generated ${data.data.creatives.length} ad creatives!`);
      }
    } catch (error) {
      console.error('Creative generation error:', error);
      toast.error("Failed to generate creatives");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create">Create Ads</TabsTrigger>
          <TabsTrigger value="creatives">Creatives</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ad Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Campaign Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select 
                    value={adSettings.platform} 
                    onValueChange={(v) => setAdSettings({...adSettings, platform: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facebook">Facebook & Instagram</SelectItem>
                      <SelectItem value="google">Google Ads</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Campaign Goal</Label>
                  <Select 
                    value={adSettings.goal} 
                    onValueChange={(v) => setAdSettings({...adSettings, goal: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="awareness">Brand Awareness</SelectItem>
                      <SelectItem value="traffic">Website Traffic</SelectItem>
                      <SelectItem value="conversions">Conversions</SelectItem>
                      <SelectItem value="leads">Lead Generation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Daily Budget ($)</Label>
                  <Input
                    type="number"
                    value={adSettings.budget}
                    onChange={(e) => setAdSettings({...adSettings, budget: e.target.value})}
                    placeholder="100"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Product/Service Description</Label>
                  <Textarea
                    value={adSettings.productDescription}
                    onChange={(e) => setAdSettings({...adSettings, productDescription: e.target.value})}
                    placeholder="Describe what you're advertising..."
                    className="min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <Input
                    value={adSettings.targetAudience}
                    onChange={(e) => setAdSettings({...adSettings, targetAudience: e.target.value})}
                    placeholder="e.g., Women 25-45 interested in wellness"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Creative Generator */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  AI Creative Generator
                </CardTitle>
                <CardDescription>
                  Generate professional ad creatives with AI
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Visual Style</Label>
                  <Select 
                    value={adSettings.style} 
                    onValueChange={(v) => setAdSettings({...adSettings, style: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Modern, clean design">Modern & Clean</SelectItem>
                      <SelectItem value="Bold, vibrant colors">Bold & Vibrant</SelectItem>
                      <SelectItem value="Minimalist, elegant">Minimalist</SelectItem>
                      <SelectItem value="Lifestyle photography style">Lifestyle</SelectItem>
                      <SelectItem value="Professional, corporate">Professional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" size="sm" className="h-20 flex-col">
                    <ImageIcon className="h-6 w-6 mb-1" />
                    <span className="text-xs">Single Image</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-20 flex-col">
                    <Layers className="h-6 w-6 mb-1" />
                    <span className="text-xs">Carousel</span>
                  </Button>
                  <Button variant="outline" size="sm" className="h-20 flex-col">
                    <Play className="h-6 w-6 mb-1" />
                    <span className="text-xs">Video</span>
                  </Button>
                </div>

                <Button 
                  className="w-full" 
                  onClick={generateCreatives}
                  disabled={isGenerating || !campaignId}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Creatives...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate 3 Ad Variants
                    </>
                  )}
                </Button>

                {!campaignId && (
                  <p className="text-sm text-muted-foreground text-center">
                    Create a campaign first to generate creatives
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="creatives">
          <Card>
            <CardHeader>
              <CardTitle>Generated Creatives</CardTitle>
              <CardDescription>
                Review and select your best performing ad variants
              </CardDescription>
            </CardHeader>
            <CardContent>
              {generatedCreatives.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {generatedCreatives.map((creative, index) => (
                    <Card key={creative.id} className="overflow-hidden">
                      <div className="aspect-square bg-muted relative">
                        {creative.image_urls?.[0] ? (
                          <img 
                            src={creative.image_urls[0]} 
                            alt={`Ad variant ${creative.ab_variant}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        <Badge className="absolute top-2 left-2">
                          Variant {creative.ab_variant}
                        </Badge>
                      </div>
                      <CardContent className="p-4 space-y-2">
                        <h4 className="font-semibold line-clamp-1">{creative.headline}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {creative.description}
                        </p>
                        <Button size="sm" variant="outline" className="w-full">
                          {creative.cta}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No creatives generated yet</p>
                  <p className="text-sm">Go to Create Ads tab to generate AI-powered creatives</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-green-500/10">
                    <DollarSign className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">$0</p>
                    <p className="text-sm text-muted-foreground">Total Spent</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-blue-500/10">
                    <Target className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">0</p>
                    <p className="text-sm text-muted-foreground">Impressions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-purple-500/10">
                    <TrendingUp className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">0%</p>
                    <p className="text-sm text-muted-foreground">CTR</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-orange-500/10">
                    <BarChart3 className="h-6 w-6 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">0</p>
                    <p className="text-sm text-muted-foreground">Conversions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Performance data will appear once ads are running</p>
                <p className="text-sm">Connect your ad accounts to see real metrics</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
