import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BarChart3, Settings, Play, Pause } from "lucide-react";

export const AutoRebalanceConfig = () => {
  const { user } = useAuth();
  const [rebalanceData, setRebalanceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (user) {
      fetchRebalanceConfig();
      const interval = setInterval(fetchRebalanceConfig, 60000); // Refresh every 60 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchRebalanceConfig = async () => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) return;

      const response = await supabase.functions.invoke("trading-browser-agent", {
        body: { action: "get_portfolio" },
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (response.data) {
        setRebalanceData(response.data);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching rebalance config:", error);
    }
  };

  const handleToggleAutoRebalance = async () => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) return;

      await supabase.functions.invoke("trading-browser-agent", {
        body: {
          action: "toggle_auto_rebalance",
          enabled: !isRunning,
        },
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });
      setIsRunning(!isRunning);
      fetchRebalanceConfig();
    } catch (error) {
      console.error("Error toggling auto rebalance:", error);
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

  const allocation = rebalanceData?.allocation || [];
  const drift = rebalanceData?.drift || [];
  const nextRebalance = rebalanceData?.next_rebalance || "—";
  const threshold = rebalanceData?.threshold || 5;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Auto-Rebalance Configuration</CardTitle>
            <CardDescription>Maintain target asset allocation automatically</CardDescription>
          </div>
          <Button
            size="sm"
            onClick={handleToggleAutoRebalance}
            className={isRunning ? "bg-green-500 hover:bg-green-600" : "bg-gray-500 hover:bg-gray-600"}
          >
            {isRunning ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Status */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <Badge className={isRunning ? "bg-green-500" : "bg-gray-500"}>
                {isRunning ? "Active" : "Paused"}
              </Badge>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Drift Threshold</p>
              <p className="text-2xl font-bold">{threshold}%</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Next Rebalance</p>
              <p className="text-sm font-bold">{nextRebalance}</p>
            </div>
          </div>

          {/* Current Allocation */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              <p className="text-sm font-medium">Current Allocation</p>
            </div>
            <div className="space-y-2">
              {allocation.slice(0, 6).map((asset: any, idx: number) => (
                <div key={idx} className="p-2 rounded bg-muted">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium">{asset.symbol}</p>
                    <p className="text-sm font-bold">{asset.current_allocation}%</p>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${asset.current_allocation}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Target: {asset.target_allocation}%
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Assets Needing Rebalance */}
          {drift.length > 0 && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Drift > {threshold}%</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {drift.map((asset: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-2 rounded border ${
                      asset.drift > 0
                        ? "bg-red-500/5 border-red-500/20"
                        : "bg-green-500/5 border-green-500/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{asset.symbol}</p>
                      <Badge
                        variant="outline"
                        className={asset.drift > 0 ? "text-red-500" : "text-green-500"}
                      >
                        {asset.drift > 0 ? "+" : ""}{asset.drift.toFixed(2)}%
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Current: {asset.current}% → Target: {asset.target}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rebalance Strategy */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Settings className="h-4 w-4 text-orange-500" />
              <p className="text-sm font-medium">Rebalance Strategy</p>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>✓ Rebalance when any asset drifts > {threshold}% from target</p>
              <p>✓ Execute via market orders during liquid hours</p>
              <p>✓ Minimize slippage with intelligent order execution</p>
              <p>✓ Track rebalance history & performance</p>
            </div>
          </div>

          {/* Recent Rebalances */}
          <div className="border-t pt-4 p-3 bg-blue-500/5 rounded-lg text-xs">
            <p className="font-medium mb-2">Last Rebalance Actions</p>
            <div className="space-y-1 text-muted-foreground">
              {rebalanceData?.recent_rebalances?.slice(0, 3).map((action: any, idx: number) => (
                <p key={idx}>
                  • {action.symbol}: Sold {action.quantity} @ ${action.price} on {action.date}
                </p>
              )) || <p>No recent rebalances</p>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
