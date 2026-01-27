import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2, Trash2 } from "lucide-react";

interface Allocation {
  symbol: string;
  target_percent: number;
  current_percent?: number;
}

interface AutoRebalanceConfigProps {
  currentAllocations?: Record<string, number>;
  onRebalance?: (allocations: Record<string, number>) => Promise<void>;
  isLoading?: boolean;
}

export function AutoRebalanceConfig({
  currentAllocations = {},
  onRebalance,
  isLoading = false,
}: AutoRebalanceConfigProps) {
  const [allocations, setAllocations] = useState<Allocation[]>([
    { symbol: "AAPL", target_percent: 30, current_percent: 25 },
    { symbol: "BTC", target_percent: 20, current_percent: 15 },
    { symbol: "MSFT", target_percent: 30, current_percent: 35 },
    { symbol: "TSLA", target_percent: 10, current_percent: 12 },
    { symbol: "CASH", target_percent: 10, current_percent: 13 },
  ]);

  const [newSymbol, setNewSymbol] = useState("");
  const [newPercent, setNewPercent] = useState("");

  const totalTarget = allocations.reduce((sum, a) => sum + a.target_percent, 0);
  const isBalanced = totalTarget === 100;

  const addAllocation = () => {
    if (newSymbol && newPercent) {
      setAllocations([
        ...allocations,
        {
          symbol: newSymbol.toUpperCase(),
          target_percent: parseFloat(newPercent),
        },
      ]);
      setNewSymbol("");
      setNewPercent("");
    }
  };

  const removeAllocation = (symbol: string) => {
    setAllocations(allocations.filter((a) => a.symbol !== symbol));
  };

  const updateAllocation = (symbol: string, percent: number) => {
    setAllocations(
      allocations.map((a) => (a.symbol === symbol ? { ...a, target_percent: percent } : a))
    );
  };

  const handleRebalance = async () => {
    if (onRebalance && isBalanced) {
      const allocObj = allocations.reduce(
        (acc, a) => {
          acc[a.symbol] = a.target_percent;
          return acc;
        },
        {} as Record<string, number>
      );
      await onRebalance(allocObj);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Rebalancing</CardTitle>
        <CardDescription>Configure target allocation percentages</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-700">Total Allocated</p>
            <p className={`text-2xl font-bold ${isBalanced ? "text-green-600" : "text-orange-600"}`}>
              {totalTarget}%
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Positions</p>
            <p className="text-2xl font-bold">{allocations.length}</p>
          </div>
          <div className="flex items-center">
            {isBalanced ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-5 h-5" />
                <span>Balanced</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-orange-600">
                <AlertCircle className="w-5 h-5" />
                <span>{100 - totalTarget > 0 ? "Need" : "Over"} {Math.abs(100 - totalTarget)}%</span>
              </div>
            )}
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium">Symbol</th>
                <th className="text-right p-3 font-medium">Current %</th>
                <th className="text-right p-3 font-medium">Target %</th>
                <th className="text-right p-3 font-medium">Diff</th>
                <th className="text-right p-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((alloc) => {
                const current = alloc.current_percent || 0;
                const diff = alloc.target_percent - current;
                const action = diff > 0 ? "BUY" : diff < 0 ? "SELL" : "HOLD";

                return (
                  <tr key={alloc.symbol} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{alloc.symbol}</td>
                    <td className="p-3 text-right text-gray-600">{current.toFixed(1)}%</td>
                    <td className="p-3 text-right">
                      <Input
                        type="number"
                        value={alloc.target_percent}
                        onChange={(e) => updateAllocation(alloc.symbol, parseFloat(e.target.value))}
                        className="w-20 text-right"
                        min="0"
                        max="100"
                      />
                    </td>
                    <td
                      className={`p-3 text-right font-medium ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-gray-600"}`}
                    >
                      {diff > 0 ? "+" : ""}
                      {diff.toFixed(1)}%
                    </td>
                    <td className="p-3 text-right">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${
                          action === "BUY"
                            ? "bg-green-100 text-green-700"
                            : action === "SELL"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {action}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium">Add Position</p>
          <div className="flex gap-2">
            <Input
              placeholder="Symbol"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
              className="flex-1"
            />
            <Input
              placeholder="Percent"
              type="number"
              value={newPercent}
              onChange={(e) => setNewPercent(e.target.value)}
              min="0"
              max="100"
              className="w-24"
            />
            <Button onClick={addAllocation} variant="outline">
              Add
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={handleRebalance}
            disabled={!isBalanced || isLoading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isLoading ? "Processing..." : "Propose Rebalancing"}
          </Button>
          <Button
            onClick={() => setAllocations(allocations.filter((a) => a.symbol !== allocations[0].symbol))}
            variant="outline"
            disabled={allocations.length === 0}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </Button>
        </div>

        {isBalanced && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-900">
              ✓ Portfolio is balanced. Click "Propose Rebalancing" to execute trades.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
