import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Share2, Heart, MessageCircle, Repeat2 } from "lucide-react";

export const SocialDistributionManager = () => {
  const { user } = useAuth();
  const [socialMetrics, setSocialMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSocialMetrics();
      const interval = setInterval(fetchSocialMetrics, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchSocialMetrics = async () => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) return;

      const response = await supabase.functions.invoke("blog-publishing-executor", {
        body: { action: "get_social_metrics" },
        headers: { Authorization: `Bearer ${session.data.session.access_token}` },
      });

      if (response.data) setSocialMetrics(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching social metrics:", error);
    }
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
    { name: "Twitter", icon: "𝕏", color: "text-black dark:text-white" },
    { name: "LinkedIn", icon: "💼", color: "text-blue-600" },
    { name: "Facebook", icon: "f", color: "text-blue-500" },
    { name: "Instagram", icon: "📷", color: "text-pink-500" },
  ];

  const totalEngagement = socialMetrics.reduce(
    (sum: number, m: any) => sum + (m.likes || 0) + (m.comments || 0) + (m.shares || 0),
    0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Social Media Distribution</CardTitle>
        <CardDescription>Multi-platform engagement & reach metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Platform Overview */}
          <div className="grid grid-cols-4 gap-3">
            {platforms.map((platform) => (
              <div key={platform.name} className="p-3 border rounded-lg text-center">
                <p className="text-2xl mb-1">{platform.icon}</p>
                <p className="text-xs font-medium">{platform.name}</p>
                <p className="text-xs text-muted-foreground mt-1">Connected</p>
              </div>
            ))}
          </div>

          {/* Total Engagement */}
          <div className="border-t pt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">Total Engagement</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Heart className="h-4 w-4 text-red-500" />
                  <span>{socialMetrics.reduce((s: number, m: any) => s + (m.likes || 0), 0)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="h-4 w-4 text-blue-500" />
                  <span>{socialMetrics.reduce((s: number, m: any) => s + (m.comments || 0), 0)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Share2 className="h-4 w-4 text-green-500" />
                  <span>{socialMetrics.reduce((s: number, m: any) => s + (m.shares || 0), 0)}</span>
                </div>
              </div>
              <Badge className="bg-purple-500">{totalEngagement} Total</Badge>
            </div>
          </div>

          {/* Recent Posts */}
          {socialMetrics.length > 0 && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Recent Posts</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {socialMetrics.slice(0, 5).map((metric: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded border text-sm">
                    <div>
                      <p className="font-medium truncate">{metric.post_title || "Post"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(metric.posted_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {(metric.likes || 0) + (metric.comments || 0)} engagement
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Action */}
          <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
            <Share2 className="h-4 w-4 mr-2" />
            Distribute Content Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
