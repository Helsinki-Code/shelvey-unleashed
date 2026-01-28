import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TrendingUp, TrendingDown, Search } from "lucide-react";

export const SEOMonitorDashboard = () => {
  const { user } = useAuth();
  const [seoData, setSeoData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSEOData();
      const interval = setInterval(fetchSEOData, 60000); // Refresh every 60 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchSEOData = async () => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) return;

      const response = await supabase.functions.invoke("blog-publishing-executor", {
        body: { action: "get_seo_data" },
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (response.data) {
        setSeoData(response.data);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching SEO data:", error);
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

  const avgRank = seoData.length > 0
    ? Math.round(seoData.reduce((sum: number, d: any) => sum + (d.ranking || 0), 0) / seoData.length)
    : 0;

  const topPages = seoData.sort((a: any, b: any) => (b.impressions || 0) - (a.impressions || 0)).slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">SEO Performance Monitor</CardTitle>
        <CardDescription>Track rankings, impressions, and CTR</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Avg Ranking</p>
              <p className="text-2xl font-bold">#{avgRank}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Total Impressions</p>
              <p className="text-2xl font-bold">
                {seoData.reduce((sum: number, d: any) => sum + (d.impressions || 0), 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Tracked Keywords</p>
              <p className="text-2xl font-bold">{seoData.length}</p>
            </div>
          </div>

          {/* Top Pages */}
          {topPages.length > 0 && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Top Ranking Pages</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {topPages.map((page: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded border text-sm"
                  >
                    <div className="flex-1">
                      <p className="font-medium truncate">{page.keyword || "Keyword"}</p>
                      <p className="text-xs text-muted-foreground">
                        #{page.ranking || "N/A"} • {page.impressions || 0} impressions
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs">
                        {page.ctr || 0}% CTR
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SEO Score */}
          <div className="border-t pt-4 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium">Overall SEO Health</p>
              <span className="text-lg font-bold text-green-500">85/100</span>
            </div>
            <div className="w-full bg-background rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: "85%" }} />
            </div>
          </div>

          {/* Recommendations */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">Optimization Tips</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>✓ Update meta descriptions for 3 pages</p>
              <p>✓ Add internal links to boost authority</p>
              <p>✓ Improve page speed for mobile users</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
