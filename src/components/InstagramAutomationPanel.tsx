import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Instagram, Image, Send, Heart, MessageCircle, Users, Hash, 
  TrendingUp, Eye, Loader2, CheckCircle2, Clock, Play, Camera
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InstagramAutomationPanelProps {
  projectId: string;
  projectName?: string;
}

interface ActivityLog {
  id: string;
  action: string;
  status: string;
  created_at: string;
}

export function InstagramAutomationPanel({ projectId, projectName }: InstagramAutomationPanelProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  
  // Form states
  const [postCaption, setPostCaption] = useState('');
  const [postHashtags, setPostHashtags] = useState('');
  const [storyContent, setStoryContent] = useState('');
  const [targetUsername, setTargetUsername] = useState('');
  const [hashtagToSearch, setHashtagToSearch] = useState('');

  const executeInstagramAction = async (action: string, parameters: Record<string, any>) => {
    setIsLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke('instagram-automation', {
        body: { action, parameters, projectId, projectName }
      });

      if (error) throw error;

      const newActivity: ActivityLog = {
        id: Date.now().toString(),
        action: `${action}: ${JSON.stringify(parameters).slice(0, 50)}...`,
        status: data.success ? 'completed' : 'failed',
        created_at: new Date().toISOString()
      };
      setActivities(prev => [newActivity, ...prev.slice(0, 19)]);

      toast.success(`Instagram ${action} executed successfully!`);
      return data;
    } catch (error: any) {
      console.error('Instagram action failed:', error);
      toast.error(`Failed: ${error.message}`);
      
      const failedActivity: ActivityLog = {
        id: Date.now().toString(),
        action: `${action} (failed)`,
        status: 'failed',
        created_at: new Date().toISOString()
      };
      setActivities(prev => [failedActivity, ...prev.slice(0, 19)]);
    } finally {
      setIsLoading(null);
    }
  };

  const handleCreatePost = () => {
    if (!postCaption) {
      toast.error('Please enter a caption');
      return;
    }
    executeInstagramAction('create_post', {
      caption: postCaption,
      hashtags: postHashtags.split(' ').filter(h => h.startsWith('#'))
    });
  };

  const handleUploadStory = () => {
    if (!storyContent) {
      toast.error('Please enter story content');
      return;
    }
    executeInstagramAction('upload_story', { content: storyContent });
  };

  const handleEngageUser = (engagementType: 'like' | 'comment' | 'follow') => {
    if (!targetUsername) {
      toast.error('Please enter a target username');
      return;
    }
    executeInstagramAction(`${engagementType}_content`, { username: targetUsername });
  };

  const handleHashtagResearch = () => {
    if (!hashtagToSearch) {
      toast.error('Please enter a hashtag');
      return;
    }
    executeInstagramAction('research_hashtag', { hashtag: hashtagToSearch });
  };

  const handleGetInsights = () => {
    executeInstagramAction('get_insights', {});
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-orange-500/10 border-pink-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Instagram className="w-6 h-6 text-pink-500" />
            Instagram Automation
          </CardTitle>
          <CardDescription>
            Automate Instagram operations: posts, stories, engagement, and analytics for {projectName || 'your project'}
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="posts" className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="posts" className="gap-2">
            <Image className="w-4 h-4" />
            Posts
          </TabsTrigger>
          <TabsTrigger value="stories" className="gap-2">
            <Camera className="w-4 h-4" />
            Stories
          </TabsTrigger>
          <TabsTrigger value="engagement" className="gap-2">
            <Heart className="w-4 h-4" />
            Engage
          </TabsTrigger>
          <TabsTrigger value="research" className="gap-2">
            <Hash className="w-4 h-4" />
            Research
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Insights
          </TabsTrigger>
        </TabsList>

        {/* Create Post Tab */}
        <TabsContent value="posts">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Image className="w-5 h-5 text-pink-500" />
                Create Instagram Post
              </CardTitle>
              <CardDescription>
                Generate and publish posts with AI-optimized captions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Caption</label>
                <Textarea
                  placeholder="Write your post caption..."
                  value={postCaption}
                  onChange={(e) => setPostCaption(e.target.value)}
                  rows={4}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Hashtags</label>
                <Input
                  placeholder="#marketing #business #growth"
                  value={postHashtags}
                  onChange={(e) => setPostHashtags(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleCreatePost} 
                disabled={isLoading === 'create_post'}
                className="w-full gap-2"
              >
                {isLoading === 'create_post' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Create Post
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stories Tab */}
        <TabsContent value="stories">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Camera className="w-5 h-5 text-purple-500" />
                Upload Story
              </CardTitle>
              <CardDescription>
                Create and publish Instagram stories (24-hour content)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Story Content</label>
                <Textarea
                  placeholder="Describe your story content..."
                  value={storyContent}
                  onChange={(e) => setStoryContent(e.target.value)}
                  rows={3}
                />
              </div>
              <Button 
                onClick={handleUploadStory} 
                disabled={isLoading === 'upload_story'}
                className="w-full gap-2"
              >
                {isLoading === 'upload_story' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                Upload Story
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500" />
                Community Engagement
              </CardTitle>
              <CardDescription>
                Like posts, leave comments, and follow relevant accounts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Target Username</label>
                <Input
                  placeholder="@username"
                  value={targetUsername}
                  onChange={(e) => setTargetUsername(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Button 
                  variant="outline"
                  onClick={() => handleEngageUser('like')}
                  disabled={isLoading === 'like_content'}
                  className="gap-2"
                >
                  {isLoading === 'like_content' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Heart className="w-4 h-4" />
                  )}
                  Like
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleEngageUser('comment')}
                  disabled={isLoading === 'comment_content'}
                  className="gap-2"
                >
                  {isLoading === 'comment_content' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MessageCircle className="w-4 h-4" />
                  )}
                  Comment
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleEngageUser('follow')}
                  disabled={isLoading === 'follow_content'}
                  className="gap-2"
                >
                  {isLoading === 'follow_content' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Users className="w-4 h-4" />
                  )}
                  Follow
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Research Tab */}
        <TabsContent value="research">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Hash className="w-5 h-5 text-blue-500" />
                Hashtag Research
              </CardTitle>
              <CardDescription>
                Find trending hashtags and analyze performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Hashtag</label>
                <Input
                  placeholder="#travelgram"
                  value={hashtagToSearch}
                  onChange={(e) => setHashtagToSearch(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleHashtagResearch}
                disabled={isLoading === 'research_hashtag'}
                className="w-full gap-2"
              >
                {isLoading === 'research_hashtag' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Hash className="w-4 h-4" />
                )}
                Research Hashtag
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Account Insights
              </CardTitle>
              <CardDescription>
                View analytics and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleGetInsights}
                disabled={isLoading === 'get_insights'}
                className="w-full gap-2"
              >
                {isLoading === 'get_insights' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
                Fetch Insights
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Play className="w-5 h-5 text-primary" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            {activities.length > 0 ? (
              <div className="space-y-2">
                {activities.map((activity) => (
                  <div 
                    key={activity.id}
                    className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg"
                  >
                    {activity.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-sm flex-1 truncate">{activity.action}</span>
                    <Badge variant="outline" className="text-xs">
                      {formatTime(activity.created_at)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Instagram className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No activity yet. Start automating!</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
