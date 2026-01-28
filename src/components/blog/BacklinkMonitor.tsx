import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ExternalLink, TrendingUp, AlertCircle } from "lucide-react";

export const BacklinkMonitor = () => {
  const { user } = useAuth();
  const [backlinkData, setBacklinkData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchBacklinks();
      const interval = setInterval(fetchBacklinks, 120000); // Refresh every 2 minutes
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchBacklinks = async () => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) return;

      const response = await supabase.functions.invoke("blog-publishing-executor", {
        body: { action: "get_backlinks" },
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (response.data) {
        setBacklinkData(response.data);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching backlinks:", error);
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

  const summary = backlinkData?.summary || {
    totalBacklinks: 0,
    activeBacklinks: 0,
    lostBacklinks: 0,
    averageDA: 0,
  };

  const backlinks = backlinkData?.backlinks || [];
  const activeBacklinks = backlinks.filter((b: any) => b.status === "active");
  const lostBacklinks = backlinks.filter((b: any) => b.status === "lost");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Backlink Monitor</CardTitle>
        <CardDescription>Track & monitor your blog's backlink profile</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Total</p>
              <p className="text-2xl font-bold">{summary.totalBacklinks}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg border border-green-500/20">
              <p className="text-xs text-muted-foreground mb-1">Active</p>
              <p className="text-2xl font-bold text-green-500">
                {summary.activeBacklinks}
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg border border-red-500/20">
              <p className="text-xs text-muted-foreground mb-1">Lost</p>
              <p className="text-2xl font-bold text-red-500">
                {summary.lostBacklinks}
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Avg DA</p>
              <p className="text-2xl font-bold">{summary.averageDA}</p>
            </div>
          </div>

          {/* Active Backlinks */}
          {activeBacklinks.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <p className="text-sm font-medium">Active Backlinks</p>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {activeBacklinks.slice(0, 10).map((backlink: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-2 rounded border text-sm"
                  >
                    <ExternalLink className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{backlink.source}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {backlink.anchor_text || "No anchor"}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Badge variant="outline" className="text-xs">
                        DA {backlink.domain_authority}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lost Backlinks Warning */}
          {lostBacklinks.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <p className="text-sm font-medium">Lost Backlinks</p>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {lostBacklinks.slice(0, 5).map((backlink: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-2 rounded border border-orange-500/20 bg-orange-500/5 text-sm"
                  >
                    <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs truncate">
                        {backlink.source}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Lost:{" "}
                        {new Date(backlink.lost_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeBacklinks.length === 0 && lostBacklinks.length === 0 && (
            <div className="text-center py-6">
              <ExternalLink className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No backlinks detected yet
              </p>
            </div>
          )}

          {/* Recommendations */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">Backlink Opportunities</p>
            <div className="space-y-1 text-xs">
              {summary.lostBacklinks > 0 && (
                <p className="text-orange-600 dark:text-orange-400">
                  ⚠️ {summary.lostBacklinks} backlinks lost - consider outreach
                </p>
              )}
              {summary.activeBacklinks < 10 && (
                <p className="text-blue-600 dark:text-blue-400">
                  💡 Build more backlinks to improve domain authority
                </p>
              )}
              {summary.averageDA > 30 && (
                <p className="text-green-600 dark:text-green-400">
                  ✓ High quality backlink profile maintained
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
