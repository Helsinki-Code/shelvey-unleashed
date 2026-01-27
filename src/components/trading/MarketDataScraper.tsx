import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Download, RefreshCw } from "lucide-react";

interface MarketData {
  symbol: string;
  current_price: number;
  rsi: number;
  macd: number;
  moving_avg_50: number;
  moving_avg_200: number;
  sentiment_score: number;
  volume_24h: number;
}

interface MarketDataScraperProps {
  onScrape?: (symbols: string[]) => Promise<void>;
  isLoading?: boolean;
  data?: MarketData[];
}

export function MarketDataScraper({
  onScrape,
  isLoading = false,
  data = [],
}: MarketDataScraperProps) {
  const [symbols, setSymbols] = useState("AAPL,BTC,MSFT,TSLA");
  const [refreshInterval, setRefreshInterval] = useState("30");

  const handleScrape = async () => {
    if (onScrape) {
      const symbolList = symbols.split(",").map((s) => s.trim());
      await onScrape(symbolList);
    }
  };

  const handleExport = () => {
    if (data.length === 0) return;

    const csv = [
      ["Symbol", "Price", "RSI", "MACD", "MA50", "MA200", "Sentiment", "Volume"],
      ...data.map((d) => [
        d.symbol,
        d.current_price.toFixed(2),
        d.rsi.toFixed(2),
        d.macd.toFixed(4),
        d.moving_avg_50.toFixed(2),
        d.moving_avg_200.toFixed(2),
        d.sentiment_score.toFixed(2),
        d.volume_24h.toLocaleString(),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `market-data-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Market Data Scraper
        </CardTitle>
        <CardDescription>Real-time market data from multiple sources</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-2">Symbols (comma-separated)</label>
            <Input
              value={symbols}
              onChange={(e) => setSymbols(e.target.value)}
              placeholder="AAPL,BTC,MSFT,TSLA"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Refresh Interval (seconds)</label>
            <Input
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(e.target.value)}
              type="number"
              min="5"
              max="300"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleScrape}
              disabled={isLoading}
              className="flex-1 gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {isLoading ? "Scraping..." : "Scrape Data"}
            </Button>
            <Button
              onClick={handleExport}
              disabled={data.length === 0}
              variant="outline"
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>

        {data.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold mb-3">Market Data</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Symbol</th>
                    <th className="text-right py-2 font-medium">Price</th>
                    <th className="text-right py-2 font-medium">RSI</th>
                    <th className="text-right py-2 font-medium">MACD</th>
                    <th className="text-right py-2 font-medium">MA50</th>
                    <th className="text-right py-2 font-medium">MA200</th>
                    <th className="text-right py-2 font-medium">Sentiment</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((d) => {
                    const rsiStatus =
                      d.rsi > 70 ? "overbought" : d.rsi < 30 ? "oversold" : "neutral";
                    const sentimentStatus =
                      d.sentiment_score > 50 ? "bullish" : d.sentiment_score < -50 ? "bearish" : "neutral";

                    return (
                      <tr key={d.symbol} className="border-b hover:bg-gray-50">
                        <td className="py-2 font-medium">{d.symbol}</td>
                        <td className="text-right py-2">${d.current_price.toFixed(2)}</td>
                        <td className="text-right py-2">
                          <Badge
                            variant="outline"
                            className={
                              rsiStatus === "overbought"
                                ? "bg-red-50 text-red-700"
                                : rsiStatus === "oversold"
                                  ? "bg-green-50 text-green-700"
                                  : "bg-blue-50 text-blue-700"
                            }
                          >
                            {d.rsi.toFixed(1)}
                          </Badge>
                        </td>
                        <td className="text-right py-2">{d.macd.toFixed(4)}</td>
                        <td className="text-right py-2">${d.moving_avg_50.toFixed(2)}</td>
                        <td className="text-right py-2">${d.moving_avg_200.toFixed(2)}</td>
                        <td className="text-right py-2">
                          <Badge
                            variant="outline"
                            className={
                              sentimentStatus === "bullish"
                                ? "bg-green-50 text-green-700"
                                : sentimentStatus === "bearish"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-gray-50 text-gray-700"
                            }
                          >
                            {d.sentiment_score.toFixed(0)}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
