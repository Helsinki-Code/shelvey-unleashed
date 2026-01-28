import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Send, Upload, Clock, CheckCircle2 } from "lucide-react";

export const BrowserPublishingPanel = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    platforms: [] as string[],
  });
  const [activeTab, setActiveTab] = useState("publish");

  useEffect(() => {
    if (user) {
      fetchPosts();
      const interval = setInterval(fetchPosts, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchPosts = async () => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) return;

      const response = await supabase.functions.invoke("blog-publishing-executor", {
        body: { action: "get_posts" },
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (response.data) {
        setPosts(response.data);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  };

  const handlePublish = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      alert("Please fill in title and content");
      return;
    }

    try {
      setPublishing(true);
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) return;

      const response = await supabase.functions.invoke("blog-publishing-executor", {
        body: {
          action: "publish_post",
          title: formData.title,
          content: formData.content,
          platforms: formData.platforms.length > 0 ? formData.platforms : ["wordpress"],
        },
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (response.data?.success) {
        setFormData({ title: "", content: "", platforms: [] });
        alert("Post published successfully!");
        fetchPosts();
      }
    } catch (error) {
      console.error("Error publishing post:", error);
      alert("Error publishing post");
    } finally {
      setPublishing(false);
    }
  };

  const togglePlatform = (platform: string) => {
    setFormData({
      ...formData,
      platforms: formData.platforms.includes(platform)
        ? formData.platforms.filter((p) => p !== platform)
        : [...formData.platforms, platform],
    });
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-40 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const platforms = [
    { id: "wordpress", name: "WordPress", icon: "📝" },
    { id: "medium", name: "Medium", icon: "📰" },
    { id: "linkedin", name: "LinkedIn", icon: "💼" },
    { id: "twitter", name: "Twitter", icon: "𝕏" },
  ];

  const draftCount = posts?.drafts?.length || 0;
  const scheduledCount = posts?.scheduled?.length || 0;
  const publishedCount = posts?.published?.length || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Content Publishing Hub</CardTitle>
        <CardDescription>Publish to multiple platforms with one click</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex gap-2 border-b">
            <button
              onClick={() => setActiveTab("publish")}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "publish"
                  ? "border-b-2 border-blue-500 text-blue-500"
                  : "text-muted-foreground"
              }`}
            >
              Publish Now
            </button>
            <button
              onClick={() => setActiveTab("scheduled")}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "scheduled"
                  ? "border-b-2 border-blue-500 text-blue-500"
                  : "text-muted-foreground"
              }`}
            >
              Scheduled ({scheduledCount})
            </button>
            <button
              onClick={() => setActiveTab("recent")}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === "recent"
                  ? "border-b-2 border-blue-500 text-blue-500"
                  : "text-muted-foreground"
              }`}
            >
              Recent Posts ({publishedCount})
            </button>
          </div>

          {/* Publish Tab */}
          {activeTab === "publish" && (
            <div className="space-y-4">
              <Input
                placeholder="Post Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-muted"
              />

              <Textarea
                placeholder="Post Content (Markdown supported)"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={6}
                className="bg-muted"
              />

              <div>
                <p className="text-sm font-medium mb-2">Publish To</p>
                <div className="grid grid-cols-2 gap-2">
                  {platforms.map((platform) => (
                    <button
                      key={platform.id}
                      onClick={() => togglePlatform(platform.id)}
                      className={`p-2 rounded border text-sm font-medium transition ${
                        formData.platforms.includes(platform.id)
                          ? "bg-blue-500/10 border-blue-500 text-blue-500"
                          : "bg-muted border-border text-muted-foreground"
                      }`}
                    >
                      {platform.icon} {platform.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handlePublish}
                  disabled={publishing || !formData.title.trim()}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {publishing ? "Publishing..." : "Publish Now"}
                </Button>
                <Button variant="outline" className="flex-1">
                  <Clock className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
              </div>
            </div>
          )}

          {/* Scheduled Tab */}
          {activeTab === "scheduled" && (
            <div className="space-y-2">
              {posts?.scheduled?.slice(0, 5).map((post: any, idx: number) => (
                <div key={idx} className="p-3 rounded border bg-amber-500/5 border-amber-500/20">
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-medium text-sm">{post.title}</p>
                    <Badge variant="outline" className="text-xs">
                      {post.scheduled_date}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {post.platforms?.join(", ") || "Multiple platforms"}
                  </p>
                </div>
              )) || (
                <p className="text-center text-muted-foreground text-sm py-4">
                  No scheduled posts
                </p>
              )}
            </div>
          )}

          {/* Recent Posts Tab */}
          {activeTab === "recent" && (
            <div className="space-y-2">
              {posts?.published?.slice(0, 5).map((post: any, idx: number) => (
                <div key={idx} className="p-3 rounded border bg-green-500/5 border-green-500/20">
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-medium text-sm">{post.title}</p>
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Published {post.published_date} • {post.engagement_count || 0} engagement
                  </p>
                </div>
              )) || (
                <p className="text-center text-muted-foreground text-sm py-4">
                  No published posts
                </p>
              )}
            </div>
          )}

          {/* Quick Stats */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 bg-muted rounded">
                <p className="text-muted-foreground">Drafts</p>
                <p className="text-lg font-bold text-yellow-500">{draftCount}</p>
              </div>
              <div className="p-2 bg-muted rounded">
                <p className="text-muted-foreground">Scheduled</p>
                <p className="text-lg font-bold text-blue-500">{scheduledCount}</p>
              </div>
              <div className="p-2 bg-muted rounded">
                <p className="text-muted-foreground">Published</p>
                <p className="text-lg font-bold text-green-500">{publishedCount}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
