import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Send, 
  Calendar as CalendarIcon, 
  Sparkles, 
  Instagram, 
  Facebook, 
  Twitter, 
  Linkedin,
  Clock,
  TrendingUp,
  Users,
  Heart,
  Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface SocialCommandCenterProps {
  projectId: string;
  campaignId?: string;
}

const platforms = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'from-purple-500 to-pink-500' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'from-blue-600 to-blue-500' },
  { id: 'twitter', name: 'Twitter/X', icon: Twitter, color: 'from-gray-800 to-gray-600' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'from-blue-700 to-blue-600' },
];

export function SocialCommandCenter({ projectId, campaignId }: SocialCommandCenterProps) {
  const [content, setContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram', 'facebook']);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId) 
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
  };

  const generateCaption = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error("Select at least one platform");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('social-scheduler', {
        body: {
          action: 'generate_caption',
          userId: (await supabase.auth.getUser()).data.user?.id,
          postData: {
            platforms: selectedPlatforms,
            topic: content || 'our latest product/service',
            tone: 'professional yet engaging'
          }
        }
      });

      if (error) throw error;
      if (data?.data?.captions) {
        setContent(data.data.captions);
        toast.success("AI generated captions!");
      }
    } catch (error) {
      console.error('Caption generation error:', error);
      toast.error("Failed to generate captions");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePost = async (immediate: boolean = false) => {
    if (!content.trim()) {
      toast.error("Please enter content");
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast.error("Select at least one platform");
      return;
    }

    setIsPosting(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      
      // Create post content object with platform-specific versions
      const postContent: Record<string, string> = { default: content };
      selectedPlatforms.forEach(p => {
        postContent[p] = content;
      });

      const { data, error } = await supabase.functions.invoke('social-scheduler', {
        body: {
          action: 'create_post',
          userId: user?.id,
          postData: {
            campaignId,
            content: postContent,
            platforms: selectedPlatforms,
            scheduledAt: immediate ? null : scheduledDate?.toISOString()
          }
        }
      });

      if (error) throw error;

      if (immediate && data?.data?.id) {
        // Post immediately
        await supabase.functions.invoke('social-scheduler', {
          body: {
            action: 'post_now',
            userId: user?.id,
            postId: data.data.id
          }
        });
        toast.success("Posted to all platforms!");
      } else {
        toast.success(scheduledDate ? "Post scheduled!" : "Post saved as draft");
      }

      setContent("");
      setScheduledDate(undefined);
    } catch (error) {
      console.error('Post error:', error);
      toast.error("Failed to create post");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="compose" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-4">
          {/* Platform Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Select Platforms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {platforms.map((platform) => {
                  const Icon = platform.icon;
                  const isSelected = selectedPlatforms.includes(platform.id);
                  return (
                    <button
                      key={platform.id}
                      onClick={() => togglePlatform(platform.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                        isSelected 
                          ? `bg-gradient-to-r ${platform.color} text-white border-transparent` 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="font-medium">{platform.name}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Content Composer */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Create Post</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={generateCaption}
                  disabled={isGenerating}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isGenerating ? "Generating..." : "AI Generate"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="What's on your mind? Write your post content here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[150px] resize-none"
              />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {scheduledDate ? format(scheduledDate, 'PPP') : 'Schedule'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduledDate}
                        onSelect={setScheduledDate}
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                  
                  {scheduledDate && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setScheduledDate(undefined)}
                    >
                      Clear Schedule
                    </Button>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => handlePost(false)}
                    disabled={isPosting}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    {scheduledDate ? 'Schedule' : 'Save Draft'}
                  </Button>
                  <Button 
                    onClick={() => handlePost(true)}
                    disabled={isPosting}
                    className="bg-gradient-to-r from-primary to-primary/80"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Post Now
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Platform Previews */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedPlatforms.map((platformId) => {
              const platform = platforms.find(p => p.id === platformId);
              if (!platform) return null;
              const Icon = platform.icon;
              
              return (
                <Card key={platformId}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg bg-gradient-to-r ${platform.color}`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <CardTitle className="text-sm">{platform.name} Preview</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="p-3 bg-muted rounded-lg text-sm">
                      {content || "Your post will appear here..."}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="scheduled">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Posts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No scheduled posts yet</p>
                <p className="text-sm">Schedule posts from the Compose tab</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">0</p>
                    <p className="text-sm text-muted-foreground">Total Followers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-green-500/10">
                    <TrendingUp className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">0%</p>
                    <p className="text-sm text-muted-foreground">Engagement Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-pink-500/10">
                    <Heart className="h-6 w-6 text-pink-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">0</p>
                    <p className="text-sm text-muted-foreground">Total Likes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-blue-500/10">
                    <Eye className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">0</p>
                    <p className="text-sm text-muted-foreground">Total Reach</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card className="mt-4">
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Analytics will appear here once you start posting</p>
                <p className="text-sm">Connect your social accounts to see real metrics</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
