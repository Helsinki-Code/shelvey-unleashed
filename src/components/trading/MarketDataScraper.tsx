import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Activity, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";

export const MarketDataScraper = () => {
  const { user } = useAuth();
  const [marketData, setMarketData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMarketData();
      const interval = setInterval(fetchMarketData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchMarketData = async () => {
    try {
      setRefreshing(true);
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) return;

      const response = await supabase.functions.invoke("trading-browser-agent", {
        body: { action: "get_market_data" },
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (response.data) {
        setMarketData(response.data);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching market data:", error);
    } finally {
      setRefreshing(false);
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

  const trendingUp = marketData?.trending?.filter((t: any) => t.change > 0) || [];
  const trendingDown = marketData?.trending?.filter((t: any) => t.change < 0) || [];
  const economicEvents = marketData?.economic_calendar || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Market Data Scraper</CardTitle>
            <CardDescription>Real-time market trends & economic events</CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchMarketData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Market Overview */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Market Sentiment</p>
              <p className="text-lg font-bold text-green-500">
                {marketData?.sentiment || "Neutral"}
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Volatility Index</p>
              <p className="text-2xl font-bold">{marketData?.vix || "0"}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Data Sources</p>
              <p className="text-2xl font-bold">
                {marketData?.sources || 0}
              </p>
            </div>
          </div>

          {/* Trending Assets */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <p className="text-sm font-medium">Top Gainers</p>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {trendingUp.slice(0, 5).map((asset: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded border text-sm"
                >
                  <div>
                    <p className="font-medium">{asset.symbol}</p>
                    <p className="text-xs text-muted-foreground">{asset.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-500">
                      +{asset.change?.toFixed(2)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ${asset.price?.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Biggest Losers */}
          {trendingDown.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <p className="text-sm font-medium">Top Losers</p>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {trendingDown.slice(0, 5).map((asset: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded border text-sm"
                  >
                    <div>
                      <p className="font-medium">{asset.symbol}</p>
                      <p className="text-xs text-muted-foreground">{asset.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-red-500">
                        {asset.change?.toFixed(2)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ${asset.price?.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Economic Calendar */}
          {economicEvents.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-blue-500" />
                <p className="text-sm font-medium">Upcoming Events</p>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {economicEvents.slice(0, 5).map((event: any, idx: number) => (
                  <div key={idx} className="p-2 rounded border text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm">{event.event}</p>
                      <Badge
                        variant="outline"
                        className="text-xs"
                      >
                        {event.impact || "Medium"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {event.country} • {event.time || "TBD"}
                    </p>
                    <p className="text-xs mt-1">
                      Expected: <span className="font-medium">{event.expected}</span> •
                      Previous: <span className="font-medium">{event.previous}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scraper Stats */}
          <div className="border-t pt-4 p-3 bg-blue-500/5 rounded-lg text-xs text-muted-foreground">
            <p className="mb-1">Last Updated: {marketData?.last_updated || "—"}</p>
            <p>Sources: TradingView • Finviz • StockTwits • Economic Calendar</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
