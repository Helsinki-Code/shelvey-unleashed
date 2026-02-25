import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TrendingUp, TrendingDown } from "lucide-react";

interface ExchangeWebMonitorProps {
  exchangeId?: string;
}

export const ExchangeWebMonitor = ({ exchangeId = "alpaca" }: ExchangeWebMonitorProps) => {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPortfolio();
      const interval = setInterval(fetchPortfolio, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [user, exchangeId]);

  const fetchPortfolio = async () => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) return;

      const response = await supabase.functions.invoke("trading-browser-agent", {
        body: { action: "get_portfolio", exchangeId },
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (response.data) {
        setPortfolio(response.data);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching portfolio:", error);
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

  const dayPLColor =
    (portfolio?.day_pl || 0) >= 0 ? "text-green-500" : "text-red-500";
  const totalPLColor =
    (portfolio?.total_pl || 0) >= 0 ? "text-green-500" : "text-red-500";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Portfolio Overview</CardTitle>
        <CardDescription>Real-time exchange portfolio data</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Main Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Account Value</p>
              <p className="text-2xl font-bold">
                ${(portfolio?.account_value || 0).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Cash Balance</p>
              <p className="text-2xl font-bold">
                ${(portfolio?.cash_balance || 0).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Buying Power</p>
                <p className="text-lg font-semibold">
                  ${(portfolio?.buying_power || 0).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Buying Power Available
                </p>
                <p className="text-lg font-semibold text-green-500">
                  ${(portfolio?.available_buying_power || 0).toLocaleString(
                    "en-US",
                    { minimumFractionDigits: 2 }
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* P&L Stats */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  {(portfolio?.day_pl || 0) >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  Today P&L
                </p>
                <p className={`text-xl font-bold ${dayPLColor}`}>
                  ${(portfolio?.day_pl || 0).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  {(portfolio?.total_pl || 0) >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  Total P&L
                </p>
                <p className={`text-xl font-bold ${totalPLColor}`}>
                  ${(portfolio?.total_pl || 0).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="border-t pt-4">
            <Badge className="bg-green-500/20 text-green-700 dark:text-green-400">
              ✓ Connected to Exchange
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
