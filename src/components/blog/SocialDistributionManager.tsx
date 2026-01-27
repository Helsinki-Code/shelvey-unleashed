import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Share2, Heart, MessageCircle, Repeat2 } from "lucide-react";

interface SocialPost {
  id: string;
  platform: string;
  content: string;
  posted_at: string;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    reach: number;
  };
  status: "published" | "scheduled" | "draft";
}

const mockPosts: SocialPost[] = [
  {
    id: "1",
    platform: "twitter",
    content: "Just published our guide to automated trading strategies. Check it out!",
    posted_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    engagement: { likes: 145, comments: 23, shares: 8, reach: 2450 },
    status: "published",
  },
  {
    id: "2",
    platform: "linkedin",
    content: "Portfolio rebalancing best practices for institutional investors...",
    posted_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    engagement: { likes: 892, comments: 112, shares: 45, reach: 18900 },
    status: "published",
  },
  {
    id: "3",
    platform: "instagram",
    content: "Trading market analysis for today",
    posted_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    engagement: { likes: 234, comments: 18, shares: 5, reach: 1890 },
    status: "published",
  },
];

export function SocialDistributionManager() {
  const [posts, setPosts] = useState<SocialPost[]>(mockPosts);
  const [postContent, setPostContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  const platforms = [
    { id: "twitter", name: "Twitter", icon: "𝕏", color: "bg-black" },
    { id: "linkedin", name: "LinkedIn", icon: "in", color: "bg-blue-700" },
    { id: "instagram", name: "Instagram", icon: "📷", color: "bg-pink-600" },
    { id: "facebook", name: "Facebook", icon: "f", color: "bg-blue-600" },
  ];

  const handlePostToSelectedPlatforms = () => {
    if (!postContent.trim() || selectedPlatforms.length === 0) return;

    const newPost: SocialPost = {
      id: Math.random().toString(),
      platform: selectedPlatforms[0],
      content: postContent,
      posted_at: new Date().toISOString(),
      engagement: { likes: 0, comments: 0, shares: 0, reach: 0 },
      status: "published",
    };

    setPosts([newPost, ...posts]);
    setPostContent("");
    setSelectedPlatforms([]);
  };

  const getPlatformColor = (platform: string) => {
    return platforms.find((p) => p.id === platform)?.color || "bg-gray-400";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Social Media Distribution
          </CardTitle>
          <CardDescription>
            Post and manage content across all social platforms
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Post Content</label>
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="What do you want to share?"
              className="w-full h-24 p-3 border rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              {postContent.length} characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">
              Select Platforms
            </label>
            <div className="grid grid-cols-2 gap-3">
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => {
                    if (selectedPlatforms.includes(platform.id)) {
                      setSelectedPlatforms(
                        selectedPlatforms.filter((p) => p !== platform.id)
                      );
                    } else {
                      setSelectedPlatforms([
                        ...selectedPlatforms,
                        platform.id,
                      ]);
                    }
                  }}
                  className={`p-3 rounded-lg border-2 transition ${
                    selectedPlatforms.includes(platform.id)
                      ? `${platform.color} border-gray-300 text-white`
                      : "border-gray-200 bg-white hover:border-gray-400"
                  }`}
                >
                  <div className="font-semibold text-sm">{platform.name}</div>
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handlePostToSelectedPlatforms}
            disabled={!postContent.trim() || selectedPlatforms.length === 0}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            Post to {selectedPlatforms.length > 0 ? selectedPlatforms.length : 0}{" "}
            Platform{selectedPlatforms.length !== 1 ? "s" : ""}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Posts</CardTitle>
          <CardDescription>{posts.length} posts published</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {posts.map((post) => (
              <div
                key={post.id}
                className="p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-start justify-between mb-2">
                  <Badge className={`${getPlatformColor(post.platform)} text-white`}>
                    {post.platform.charAt(0).toUpperCase() +
                      post.platform.slice(1)}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {new Date(post.posted_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-3">{post.content}</p>
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    {post.engagement.likes}
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" />
                    {post.engagement.comments}
                  </div>
                  <div className="flex items-center gap-1">
                    <Repeat2 className="w-4 h-4" />
                    {post.engagement.shares}
                  </div>
                  <div className="ml-auto">
                    Reach: {post.engagement.reach.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
