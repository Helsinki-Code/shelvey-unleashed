import { useState } from "react";
import { useTradingBrowserAutomation } from "@/hooks/useTradingBrowserAutomation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, DollarSign, TrendingUp } from "lucide-react";

interface BrowserAutomationPanelProps {
  supabaseUrl: string;
  supabaseAnonKey: string;
  userId: string;
}

export function BrowserAutomationPanel({
  supabaseUrl,
  supabaseAnonKey,
  userId,
}: BrowserAutomationPanelProps) {
  const {
    tradingSession,
    loginToExchange,
    scrapeExchangeDashboard,
    scrapeMarketData,
    rebalancePortfolio,
    createPriceAlert,
    isLoading,
    error,
  } = useTradingBrowserAutomation({
    supabaseUrl,
    supabaseAnonKey,
    userId,
  });

  const [selectedExchange, setSelectedExchange] = useState<string>("alpaca");
  const [symbols, setSymbols] = useState<string>("AAPL,BTC,MSFT");
  const [alertSymbol, setAlertSymbol] = useState<string>("AAPL");
  const [alertPrice, setAlertPrice] = useState<string>("180");
  const [rebalanceAllocation, setRebalanceAllocation] = useState<string>("AAPL:30,BTC:20,MSFT:50");

  const handleLogin = async () => {
    try {
      await loginToExchange({
        exchange: selectedExchange as "alpaca" | "binance" | "coinbase" | "kraken" | "tradingview",
        is_paper_trading: true,
      });
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  const handleScrapeMarket = async () => {
    try {
      const symbolList = symbols.split(",").map((s) => s.trim());
      await scrapeMarketData(symbolList, [selectedExchange]);
    } catch (err) {
      console.error("Market scraping failed:", err);
    }
  };

  const handleCreateAlert = async () => {
    try {
      await createPriceAlert(alertSymbol, parseFloat(alertPrice), "above");
    } catch (err) {
      console.error("Alert creation failed:", err);
    }
  };

  const handleRebalance = async () => {
    try {
      const allocations = rebalanceAllocation.split(",").reduce(
        (acc, item) => {
          const [symbol, percent] = item.trim().split(":");
          acc[symbol] = parseFloat(percent);
          return acc;
        },
        {} as Record<string, number>
      );
      await rebalancePortfolio(allocations);
    } catch (err) {
      console.error("Rebalancing failed:", err);
    }
  };

  const handleScrapeDashboard = async () => {
    try {
      await scrapeExchangeDashboard(selectedExchange);
    } catch (err) {
      console.error("Dashboard scraping failed:", err);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Trading Browser Automation
          </CardTitle>
          <CardDescription>Automate exchange operations and market monitoring</CardDescription>
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

          {tradingSession.currentSession && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                Active Session: <Badge variant="secondary">{tradingSession.currentSession.id}</Badge>
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Cost: ${tradingSession.currentSession.cost_usd.toFixed(2)} • API Calls:{" "}
                {tradingSession.currentSession.api_calls}
              </p>
            </div>
          )}

          <Tabs defaultValue="exchange" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="exchange">Exchange</TabsTrigger>
              <TabsTrigger value="market">Market Data</TabsTrigger>
              <TabsTrigger value="alerts">Alerts</TabsTrigger>
              <TabsTrigger value="rebalance">Rebalance</TabsTrigger>
            </TabsList>

            <TabsContent value="exchange" className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select Exchange</label>
                <select
                  value={selectedExchange}
                  onChange={(e) => setSelectedExchange(e.target.value)}
                  className="w-full border rounded-lg p-2"
                >
                  <option value="alpaca">Alpaca</option>
                  <option value="binance">Binance</option>
                  <option value="coinbase">Coinbase</option>
                  <option value="kraken">Kraken</option>
                  <option value="tradingview">TradingView</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleLogin} disabled={isLoading} className="flex-1">
                  {isLoading ? "Logging in..." : "Login to Exchange"}
                </Button>
                <Button
                  onClick={handleScrapeMarket}
                  disabled={isLoading}
                  variant="outline"
                  className="flex-1"
                >
                  {isLoading ? "Scraping..." : "Scrape Dashboard"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="market" className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-2">Symbols (comma-separated)</label>
                <Input
                  value={symbols}
                  onChange={(e) => setSymbols(e.target.value)}
                  placeholder="AAPL,BTC,MSFT"
                />
              </div>

              <Button onClick={handleScrapeMarket} disabled={isLoading} className="w-full">
                {isLoading ? "Scraping..." : "Scrape Market Data"}
              </Button>
            </TabsContent>

            <TabsContent value="alerts" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Symbol</label>
                  <Input
                    value={alertSymbol}
                    onChange={(e) => setAlertSymbol(e.target.value)}
                    placeholder="AAPL"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Price Alert</label>
                  <Input
                    value={alertPrice}
                    onChange={(e) => setAlertPrice(e.target.value)}
                    placeholder="180"
                    type="number"
                  />
                </div>
              </div>

              <Button onClick={handleCreateAlert} disabled={isLoading} className="w-full">
                {isLoading ? "Creating..." : "Create Price Alert"}
              </Button>
            </TabsContent>

            <TabsContent value="rebalance" className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Target Allocation (symbol:percent,...)
                </label>
                <Input
                  value={rebalanceAllocation}
                  onChange={(e) => setRebalanceAllocation(e.target.value)}
                  placeholder="AAPL:30,BTC:20,MSFT:50"
                />
              </div>

              <Button
                onClick={handleRebalance}
                disabled={isLoading}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                {isLoading ? "Calculating..." : "Propose Rebalancing"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {tradingSession.sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {tradingSession.sessions.slice(0, 5).map((session) => (
                <div key={session.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="text-sm">
                    <p className="font-medium">{session.session_type.toUpperCase()}</p>
                    <p className="text-xs text-gray-500">{session.id.slice(0, 8)}...</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {session.status === "completed" ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : session.status === "running" ? (
                      <Clock className="w-4 h-4 text-blue-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                    )}
                    <Badge variant="outline" className="text-xs">
                      ${session.cost_usd.toFixed(2)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
