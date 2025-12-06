import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Instagram, Twitter, Linkedin, Facebook, Video, 
  Loader2, Sparkles, Calendar, Hash, Image, 
  Copy, Send, Save, CheckCircle2, Layers
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface SocialContentFactoryProps {
  projectId: string;
  businessName?: string;
  industry?: string;
  brandVoice?: string;
}

const PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-pink-500' },
  { id: 'twitter', name: 'Twitter/X', icon: Twitter, color: 'text-blue-400' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'text-blue-600' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'text-blue-500' },
  { id: 'tiktok', name: 'TikTok', icon: Video, color: 'text-pink-400' },
];

const CONTENT_TYPES = [
  { id: 'post', name: 'Standard Post' },
  { id: 'story', name: 'Story' },
  { id: 'reel', name: 'Reel/Short' },
  { id: 'carousel', name: 'Carousel' },
];

export default function SocialContentFactory({ projectId, businessName, industry, brandVoice }: SocialContentFactoryProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram', 'twitter', 'linkedin']);
  const [contentType, setContentType] = useState('post');
  const [count, setCount] = useState('10');
  const [generatedContent, setGeneratedContent] = useState<any[]>([]);
  const [hashtags, setHashtags] = useState<any>(null);
  const [weekPlan, setWeekPlan] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('generate');

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const generateBatch = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('social-content-generator', {
        body: { 
          action: 'generate_batch',
          projectId,
          userId: user?.id,
          topic,
          platforms: selectedPlatforms,
          contentType,
          count: parseInt(count),
          businessName,
          industry,
          brandVoice
        }
      });

      if (error) throw error;
      setGeneratedContent(Array.isArray(data.result) ? data.result : []);
      toast.success(`Generated ${data.result?.length || 0} posts!`);
    } catch (error: any) {
      toast.error(error.message || "Failed to generate content");
    } finally {
      setLoading(false);
    }
  };

  const generateHashtags = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('social-content-generator', {
        body: { 
          action: 'generate_hashtags',
          projectId,
          topic,
          platforms: selectedPlatforms,
          industry
        }
      });

      if (error) throw error;
      setHashtags(data.result);
      setActiveTab('hashtags');
      toast.success("Hashtags generated!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate hashtags");
    } finally {
      setLoading(false);
    }
  };

  const planWeek = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('social-content-generator', {
        body: { 
          action: 'plan_week',
          projectId,
          topic,
          platforms: selectedPlatforms,
          businessName,
          industry,
          brandVoice
        }
      });

      if (error) throw error;
      setWeekPlan(data.result);
      setActiveTab('calendar');
      toast.success("Week plan created!");
    } catch (error: any) {
      toast.error(error.message || "Failed to create plan");
    } finally {
      setLoading(false);
    }
  };

  const saveContent = async () => {
    if (generatedContent.length === 0) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('social-content-generator', {
        body: { 
          action: 'save_content',
          projectId,
          userId: user?.id,
          content: generatedContent
        }
      });

      if (error) throw error;
      toast.success(`Saved ${data.result?.saved || 0} posts to library!`);
    } catch (error: any) {
      toast.error(error.message || "Failed to save content");
    } finally {
      setLoading(false);
    }
  };

  const copyCaption = (caption: string) => {
    navigator.clipboard.writeText(caption);
    toast.success("Caption copied!");
  };

  const getPlatformIcon = (platformId: string) => {
    const platform = PLATFORMS.find(p => p.id === platformId);
    if (!platform) return null;
    const Icon = platform.icon;
    return <Icon className={`h-4 w-4 ${platform.color}`} />;
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Social Content Factory
          </CardTitle>
          <CardDescription>
            Generate batches of social media content with AI-powered captions and visuals
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Topic / Theme</label>
              <Input 
                placeholder="e.g., Product launch, Behind the scenes, Tips & tricks"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Number of Posts</label>
              <Select value={count} onValueChange={setCount}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 posts</SelectItem>
                  <SelectItem value="10">10 posts</SelectItem>
                  <SelectItem value="15">15 posts</SelectItem>
                  <SelectItem value="20">20 posts</SelectItem>
                  <SelectItem value="30">30 posts (1 month)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Platform Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Platforms</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((platform) => {
                const Icon = platform.icon;
                const isSelected = selectedPlatforms.includes(platform.id);
                return (
                  <button
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                      isSelected 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-muted hover:bg-muted/80 border-border'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {platform.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Content Type</label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_TYPES.map((type) => (
                  <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={generateBatch} disabled={loading || !topic}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Generate Batch
            </Button>
            <Button variant="secondary" onClick={generateHashtags} disabled={loading || !topic}>
              <Hash className="h-4 w-4 mr-2" />
              Generate Hashtags
            </Button>
            <Button variant="secondary" onClick={planWeek} disabled={loading}>
              <Calendar className="h-4 w-4 mr-2" />
              Plan Week
            </Button>
            {generatedContent.length > 0 && (
              <Button variant="outline" onClick={saveContent} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                Save to Library
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Output Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="generate">Generated Posts</TabsTrigger>
          <TabsTrigger value="hashtags">Hashtags</TabsTrigger>
          <TabsTrigger value="calendar">Week Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          {generatedContent.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {generatedContent.map((post, idx) => (
                <Card key={idx}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getPlatformIcon(post.platform)}
                        <span className="font-medium capitalize">{post.platform}</span>
                      </div>
                      <Badge variant="outline">{post.contentType}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm">{post.caption}</p>
                    
                    {post.hashtags?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {post.hashtags.slice(0, 6).map((tag: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {tag.startsWith('#') ? tag : `#${tag}`}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {post.imagePrompt && (
                      <div className="p-2 bg-muted rounded text-xs">
                        <span className="font-medium">Image idea:</span> {post.imagePrompt}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-xs text-muted-foreground">
                        Best time: {post.bestTime}
                      </span>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => copyCaption(post.caption)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Send className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Enter a topic and click "Generate Batch" to create social media content</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="hashtags">
          {hashtags ? (
            <Card>
              <CardContent className="pt-6 space-y-6">
                {['highVolume', 'mediumVolume', 'niche', 'branded'].map((category) => (
                  hashtags[category] && (
                    <div key={category}>
                      <h4 className="font-medium mb-2 capitalize">{category.replace(/([A-Z])/g, ' $1')}</h4>
                      <div className="flex flex-wrap gap-2">
                        {hashtags[category].map((tag: string, idx: number) => (
                          <Badge 
                            key={idx} 
                            variant="outline" 
                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                            onClick={() => {
                              navigator.clipboard.writeText(tag);
                              toast.success("Copied!");
                            }}
                          >
                            {tag.startsWith('#') ? tag : `#${tag}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )
                ))}

                {hashtags.recommendedCombination && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Recommended Combination</h4>
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <p className="text-sm">{hashtags.recommendedCombination.join(' ')}</p>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="mt-2"
                        onClick={() => {
                          navigator.clipboard.writeText(hashtags.recommendedCombination.join(' '));
                          toast.success("Copied all hashtags!");
                        }}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy All
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Hash className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Click "Generate Hashtags" to get optimized hashtag sets</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          {weekPlan ? (
            <Card>
              <CardHeader>
                <CardTitle>{weekPlan.weekTheme}</CardTitle>
                <CardDescription>7-day content calendar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {weekPlan.days?.map((day: any) => (
                    <div key={day.day} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold">Day {day.day}: {day.dayName}</h4>
                        <Badge>{day.posts?.length || 0} posts</Badge>
                      </div>
                      <div className="space-y-2">
                        {day.posts?.map((post: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                            {getPlatformIcon(post.platform)}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">{post.contentType}</Badge>
                                <span className="text-xs text-muted-foreground">{post.postTime}</span>
                              </div>
                              <p className="text-sm font-medium">{post.topic}</p>
                              <p className="text-xs text-muted-foreground mt-1">{post.caption?.slice(0, 100)}...</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Click "Plan Week" to create a 7-day content calendar</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
