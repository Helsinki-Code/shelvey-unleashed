import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, TrendingUp, TrendingDown } from "lucide-react";

interface JournalEntry {
  id?: string;
  symbol: string;
  entry_price: number;
  exit_price: number;
  quantity: number;
  profit_loss_usd: number;
  profit_loss_percent: number;
  entry_date?: string;
  exit_date?: string;
  risk_reward_ratio?: number;
  execution_quality?: string;
  notes?: string;
}

interface TradingJournalViewerProps {
  entries?: JournalEntry[];
  isLoading?: boolean;
}

export function TradingJournalViewer({
  entries = [
    {
      symbol: "AAPL",
      entry_price: 180,
      exit_price: 185.5,
      quantity: 50,
      profit_loss_usd: 275,
      profit_loss_percent: 3.06,
      entry_date: "2026-01-20",
      exit_date: "2026-01-24",
      risk_reward_ratio: 2.5,
      execution_quality: "good",
      notes: "Strong breakout confirmed by volume",
    },
    {
      symbol: "BTC",
      entry_price: 42000,
      exit_price: 40500,
      quantity: 0.5,
      profit_loss_usd: -750,
      profit_loss_percent: -3.57,
      entry_date: "2026-01-18",
      exit_date: "2026-01-22",
      risk_reward_ratio: 0.5,
      execution_quality: "poor",
      notes: "Early exit due to stop loss",
    },
    {
      symbol: "MSFT",
      entry_price: 320,
      exit_price: 335,
      quantity: 30,
      profit_loss_usd: 450,
      profit_loss_percent: 4.69,
      entry_date: "2026-01-21",
      exit_date: "2026-01-25",
      risk_reward_ratio: 3.0,
      execution_quality: "excellent",
      notes: "Perfect entry on pullback, rode trend",
    },
  ],
  isLoading = false,
}: TradingJournalViewerProps) {
  const totalTrades = entries.length;
  const winningTrades = entries.filter((e) => e.profit_loss_usd > 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const totalPL = entries.reduce((sum, e) => sum + e.profit_loss_usd, 0);
  const avgWin =
    winningTrades > 0
      ? entries
          .filter((e) => e.profit_loss_usd > 0)
          .reduce((sum, e) => sum + e.profit_loss_usd, 0) / winningTrades
      : 0;

  const losingTrades = totalTrades - winningTrades;
  const avgLoss =
    losingTrades > 0
      ? entries
          .filter((e) => e.profit_loss_usd < 0)
          .reduce((sum, e) => sum + Math.abs(e.profit_loss_usd), 0) / losingTrades
      : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Trading Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-600 mb-1">Total Trades</p>
              <p className="text-2xl font-bold text-blue-900">{totalTrades}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-xs text-green-600 mb-1">Win Rate</p>
              <p className="text-2xl font-bold text-green-900">{winRate.toFixed(1)}%</p>
              <p className="text-xs text-green-600 mt-1">
                {winningTrades}W / {losingTrades}L
              </p>
            </div>
            <div className={`p-4 rounded-lg ${totalPL >= 0 ? "bg-green-50" : "bg-red-50"}`}>
              <p className={`text-xs mb-1 ${totalPL >= 0 ? "text-green-600" : "text-red-600"}`}>
                Total P&L
              </p>
              <p
                className={`text-2xl font-bold ${totalPL >= 0 ? "text-green-900" : "text-red-900"}`}
              >
                ${Math.abs(totalPL).toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-xs text-purple-600 mb-1">Risk/Reward</p>
              <p className="text-2xl font-bold text-purple-900">
                {(avgWin / avgLoss).toFixed(2) || "N/A"}
              </p>
              <p className="text-xs text-purple-600 mt-1">
                Avg W: ${avgWin.toFixed(0)} / L: ${avgLoss.toFixed(0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trade History</CardTitle>
          <CardDescription>Detailed analysis of recent trades</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading journal entries...</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No trades yet. Start trading to see journal entries!</div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry, idx) => {
                const isWin = entry.profit_loss_usd >= 0;
                const dayCount = entry.exit_date && entry.entry_date
                  ? Math.abs(
                      (new Date(entry.exit_date).getTime() -
                        new Date(entry.entry_date).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                  : 0;

                return (
                  <div
                    key={idx}
                    className={`p-4 border rounded-lg ${isWin ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-lg">{entry.symbol}</p>
                        <p className="text-xs text-gray-600">
                          {entry.entry_date} to {entry.exit_date} ({dayCount} days)
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          {isWin ? (
                            <TrendingUp className="w-5 h-5 text-green-600" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-red-600" />
                          )}
                          <p className={`text-xl font-bold ${isWin ? "text-green-900" : "text-red-900"}`}>
                            {isWin ? "+" : ""}${entry.profit_loss_usd.toLocaleString()} ({entry.profit_loss_percent.toFixed(2)}%)
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-sm mb-3">
                      <div>
                        <p className="text-xs font-medium text-gray-600">Entry</p>
                        <p className="font-mono">${entry.entry_price.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600">Exit</p>
                        <p className="font-mono">${entry.exit_price.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600">Qty</p>
                        <p className="font-mono">{entry.quantity}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600">R/R</p>
                        <p className="font-mono">{entry.risk_reward_ratio?.toFixed(2) || "N/A"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {entry.execution_quality && (
                        <Badge
                          variant="outline"
                          className={
                            entry.execution_quality === "excellent"
                              ? "bg-blue-100 text-blue-700"
                              : entry.execution_quality === "good"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                          }
                        >
                          {entry.execution_quality}
                        </Badge>
                      )}
                      {entry.notes && (
                        <p className="text-xs italic text-gray-700">
                          "{entry.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
