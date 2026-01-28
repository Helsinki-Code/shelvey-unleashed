import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TrendingUp, Globe, Zap, Target } from "lucide-react";

export const CompetitorAnalysisPanel = () => {
  const { user } = useAuth();
  const [competitorData, setCompetitorData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCompetitorData();
      const interval = setInterval(fetchCompetitorData, 180000); // Refresh every 3 minutes
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchCompetitorData = async () => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) return;

      const response = await supabase.functions.invoke("blog-publishing-executor", {
        body: { action: "get_competitor_analysis" },
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (response.data) {
        setCompetitorData(response.data);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching competitor data:", error);
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

  const competitors = competitorData?.competitors || [];
  const topCompetitor = competitors[0];
  const gap = competitorData?.gap_analysis || {
    content_volume: "behind",
    backlinks: "behind",
    organic_traffic: "behind",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Competitor Analysis</CardTitle>
        <CardDescription>Monitor competitor strategies & opportunities</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Market Position */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Top Competitor</p>
              <p className="text-lg font-bold truncate">
                {topCompetitor?.domain || "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {topCompetitor?.monthly_traffic || 0}K visits
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Avg Backlinks</p>
              <p className="text-2xl font-bold">{competitorData?.avg_backlinks || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Per competitor</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Content Gap</p>
              <p className="text-2xl font-bold">{competitors.length || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Tracked sites</p>
            </div>
          </div>

          {/* Top Competitors */}
          {competitors.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="h-4 w-4 text-blue-500" />
                <p className="text-sm font-medium">Top Competitors</p>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {competitors.slice(0, 5).map((competitor: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded border text-sm"
                  >
                    <div className="flex-1">
                      <p className="font-medium truncate">{competitor.domain}</p>
                      <p className="text-xs text-muted-foreground">
                        {competitor.monthly_traffic || 0}K monthly visitors
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {competitor.domain_rating || "N/A"} DR
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content Opportunities */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-green-500" />
              <p className="text-sm font-medium">Content Opportunities</p>
            </div>
            <div className="space-y-2 text-xs">
              {gap.content_volume === "behind" && (
                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
                  <p className="font-medium text-amber-600 dark:text-amber-400 mb-1">
                    📊 Content Volume Gap
                  </p>
                  <p className="text-muted-foreground">
                    Competitors publish {competitorData?.content_gap || 0}x more content - increase publishing frequency
                  </p>
                </div>
              )}
              {gap.backlinks === "behind" && (
                <div className="p-2 rounded bg-orange-500/10 border border-orange-500/20">
                  <p className="font-medium text-orange-600 dark:text-orange-400 mb-1">
                    🔗 Backlink Gap
                  </p>
                  <p className="text-muted-foreground">
                    Build {competitorData?.backlink_gap || 0}+ new backlinks to match competitor authority
                  </p>
                </div>
              )}
              {gap.organic_traffic === "behind" && (
                <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
                  <p className="font-medium text-blue-600 dark:text-blue-400 mb-1">
                    📈 Traffic Gap
                  </p>
                  <p className="text-muted-foreground">
                    Focus on high-intent keywords with lower SERP competition
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Top Keywords from Competitors */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-yellow-500" />
              <p className="text-sm font-medium">Competitor Keywords</p>
            </div>
            <div className="space-y-1 text-xs">
              {competitorData?.top_keywords?.slice(0, 5).map((kw: string, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted">
                  <span>{kw}</span>
                  <Badge variant="secondary" className="text-xs">
                    High CPC
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Win Strategy */}
          <div className="border-t pt-4 p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium mb-1">Recommended Strategy</p>
                <p className="text-xs text-muted-foreground">
                  {competitorData?.recommendation || "Create comprehensive content on competitor keywords that rank in top 10 but lack quality analysis"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
