import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TrendingUp, TrendingDown } from "lucide-react";

export const TradingJournalViewer = () => {
  const { user } = useAuth();
  const [journalData, setJournalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchJournal();
      const interval = setInterval(fetchJournal, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchJournal = async () => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) return;

      const response = await supabase.functions.invoke("trading-browser-agent", {
        body: { action: "get_journal" },
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (response.data) {
        setJournalData(response.data);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching journal:", error);
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

  const stats = journalData?.statistics || {
    totalTrades: 0,
    winTrades: 0,
    lossTrades: 0,
    winRate: "0",
    totalPL: "0",
    profitFactor: "N/A",
  };

  const plColor =
    parseFloat(stats.totalPL) >= 0 ? "text-green-500" : "text-red-500";
  const trades = journalData?.trades || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Trading Journal</CardTitle>
        <CardDescription>Automated trading statistics & analysis</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Statistics Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Total Trades</p>
              <p className="text-xl font-bold">{stats.totalTrades}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
              <p className="text-xl font-bold text-green-500">
                {stats.winRate}%
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Profit Factor</p>
              <p className="text-xl font-bold">{stats.profitFactor}</p>
            </div>
          </div>

          {/* P&L */}
          <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-700 rounded-lg border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total P&L</p>
                <p className={`text-2xl font-bold ${plColor}`}>
                  ${stats.totalPL}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-1">Win / Loss</p>
                <p className="text-lg font-semibold">
                  <span className="text-green-500">{stats.winTrades}W</span>
                  {" / "}
                  <span className="text-red-500">{stats.lossTrades}L</span>
                </p>
              </div>
            </div>
          </div>

          {/* Recent Trades */}
          {trades.length > 0 && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Recent Trades</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {trades.slice(0, 10).map((trade: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded border text-sm">
                    <div className="flex-1">
                      <p className="font-medium">{trade.symbol || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(trade.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-semibold ${
                          (trade.pl_usd || 0) >= 0
                            ? "text-green-500"
                            : "text-red-500"
                        }`}
                      >
                        ${(trade.pl_usd || 0).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                      <Badge
                        variant="outline"
                        className="text-xs mt-1"
                      >
                        {trade.side || "unknown"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {trades.length === 0 && (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">
                No trades recorded yet
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
