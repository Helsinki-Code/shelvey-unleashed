import { useState } from "react";
import { useBlogBrowserAutomation } from "@/hooks/useBlogBrowserAutomation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, FileText, PlusCircle } from "lucide-react";

interface BlogPublishingPanelProps {
  supabaseUrl: string;
  supabaseAnonKey: string;
  userId: string;
}

export function BrowserPublishingPanel({
  supabaseUrl,
  supabaseAnonKey,
  userId,
}: BlogPublishingPanelProps) {
  const {
    publishToWordPress,
    publishToMedium,
    publishToMultiplePlatforms,
    schedulePost,
    refreshOldContent,
    isLoading,
    error,
  } = useBlogBrowserAutomation({
    supabaseUrl,
    supabaseAnonKey,
    userId,
  });

  const [postTitle, setPostTitle] = useState("New Trading Strategy Guide 2026");
  const [postContent, setPostContent] = useState(
    "This comprehensive guide covers modern trading strategies for 2026, including automated portfolio management, risk controls, and market analysis techniques..."
  );
  const [postExcerpt, setPostExcerpt] = useState(
    "Learn the most effective trading strategies and techniques for successful investing"
  );
  const [selectedTags, setSelectedTags] = useState("trading,strategies,investing");
  const [platforms, setPlatforms] = useState<string[]>(["wordpress", "medium"]);
  const [scheduledDate, setScheduledDate] = useState(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );

  const handlePublishToWordPress = async () => {
    await publishToWordPress({
      title: postTitle,
      content: postContent,
      excerpt: postExcerpt,
      tags: selectedTags.split(",").map((t) => t.trim()),
      status: "published",
    });
  };

  const handlePublishToMedium = async () => {
    await publishToMedium({
      title: postTitle,
      content: postContent,
      excerpt: postExcerpt,
      tags: selectedTags.split(",").map((t) => t.trim()),
      status: "published",
    });
  };

  const handlePublishMultiple = async () => {
    await publishToMultiplePlatforms({
      title: postTitle,
      content: postContent,
      excerpt: postExcerpt,
      tags: selectedTags.split(",").map((t) => t.trim()),
      status: "published",
    }, platforms);
  };

  const handleSchedulePost = async () => {
    await schedulePost({
      title: postTitle,
      content: postContent,
      excerpt: postExcerpt,
      publish_date: scheduledDate,
      tags: selectedTags.split(",").map((t) => t.trim()),
      status: "scheduled",
    }, platforms);
  };

  const platformOptions = [
    { value: "wordpress", label: "WordPress" },
    { value: "medium", label: "Medium" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "twitter", label: "Twitter" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Blog Publishing Automation
          </CardTitle>
          <CardDescription>
            Publish, schedule, and distribute content across multiple platforms
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-900">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">Post Title</label>
              <Input
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder="Enter post title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Post Excerpt</label>
              <Input
                value={postExcerpt}
                onChange={(e) => setPostExcerpt(e.target.value)}
                placeholder="Brief description (160 chars)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Post Content (first 100 chars shown)
              </label>
              <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 max-h-32 overflow-auto">
                {postContent.substring(0, 200)}...
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
              <Input
                value={selectedTags}
                onChange={(e) => setSelectedTags(e.target.value)}
                placeholder="trading,strategies,investing"
              />
            </div>
          </div>

          <Tabs defaultValue="publish" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="publish">Publish Now</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="refresh">Refresh Content</TabsTrigger>
            </TabsList>

            <TabsContent value="publish" className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-3">Select Platforms</label>
                <div className="grid grid-cols-2 gap-2">
                  {platformOptions.map((platform) => (
                    <label key={platform.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={platforms.includes(platform.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPlatforms([...platforms, platform.value]);
                          } else {
                            setPlatforms(
                              platforms.filter((p) => p !== platform.value)
                            );
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{platform.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handlePublishToWordPress}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? "Publishing..." : "Publish to WordPress"}
                </Button>
                <Button
                  onClick={handlePublishToMedium}
                  disabled={isLoading}
                  variant="outline"
                  className="flex-1"
                >
                  {isLoading ? "Publishing..." : "Publish to Medium"}
                </Button>
              </div>

              <Button
                onClick={handlePublishMultiple}
                disabled={isLoading || platforms.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                {isLoading ? "Publishing to all..." : `Publish to ${platforms.length} platforms`}
              </Button>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-2">Scheduled Publish Date</label>
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-3">Select Platforms</label>
                <div className="grid grid-cols-2 gap-2">
                  {platformOptions.map((platform) => (
                    <label key={platform.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={platforms.includes(platform.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPlatforms([...platforms, platform.value]);
                          } else {
                            setPlatforms(
                              platforms.filter((p) => p !== platform.value)
                            );
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{platform.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleSchedulePost}
                disabled={isLoading}
                className="w-full gap-2"
              >
                <Clock className="w-4 h-4" />
                {isLoading ? "Scheduling..." : "Schedule Post"}
              </Button>
            </TabsContent>

            <TabsContent value="refresh" className="space-y-4 mt-4">
              <p className="text-sm text-gray-600">
                Update existing blog posts with new data, statistics, or information
              </p>
              <Button
                onClick={() => refreshOldContent([
                  "trading-strategies-2024",
                  "portfolio-management-guide",
                ])}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "Refreshing..." : "Refresh Old Posts"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
