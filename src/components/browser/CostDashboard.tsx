import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingDown, DollarSign } from "lucide-react";

interface CostBreakdown {
  provider: string;
  sessions: number;
  cost_per_action: number;
  total_cost: number;
  percentage: number;
}

const mockCosts: CostBreakdown[] = [
  {
    provider: "agent-browser",
    sessions: 24,
    cost_per_action: 0.015,
    total_cost: 18.45,
    percentage: 52,
  },
  {
    provider: "playwright-mcp",
    sessions: 156,
    cost_per_action: 0.001,
    total_cost: 12.89,
    percentage: 37,
  },
  {
    provider: "brightdata",
    sessions: 8,
    cost_per_action: 0.005,
    total_cost: 3.22,
    percentage: 9,
  },
  {
    provider: "fallback",
    sessions: 2,
    cost_per_action: 0.003,
    total_cost: 0.44,
    percentage: 2,
  },
];

const monthlyBudget = 150;
const monthlySpent = mockCosts.reduce((sum, c) => sum + c.total_cost, 0);
const remaining = monthlyBudget - monthlySpent;
const percentageUsed = ((monthlySpent / monthlyBudget) * 100).toFixed(1);

export function CostDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Monthly Budget</p>
                <p className="text-2xl font-bold">${monthlyBudget}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Amount Spent</p>
                <p className="text-2xl font-bold">${monthlySpent.toFixed(2)}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Remaining</p>
                <p className="text-2xl font-bold">${remaining.toFixed(2)}</p>
              </div>
              <Badge
                className={`${
                  remaining > monthlyBudget * 0.25
                    ? "bg-green-100 text-green-700"
                    : remaining > 0
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                }`}
              >
                {percentageUsed}% Used
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cost Breakdown by Provider</CardTitle>
          <CardDescription>Last 30 days of automation costs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mockCosts.map((cost) => (
            <div key={cost.provider} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{cost.provider}</p>
                  <p className="text-xs text-gray-500">
                    {cost.sessions} sessions • ${cost.cost_per_action} per action
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    ${cost.total_cost.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">{cost.percentage}%</p>
                </div>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${cost.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cost Optimization Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-2">
              <TrendingDown className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-900">
                  Optimize Provider Selection
                </p>
                <p className="text-xs text-green-700 mt-0.5">
                  Switch complex tasks from Agent-Browser to Playwright when
                  possible. Could save ~15% monthly.
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <TrendingDown className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Batch Operations
                </p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Combine multiple market data scrapes into single sessions.
                  Could save ~8% monthly.
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-900">
                  Monitor BrightData Usage
                </p>
                <p className="text-xs text-yellow-700 mt-0.5">
                  Currently 9% of budget. Only use for anti-bot protected sites.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usage Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              {
                type: "warning",
                message: "Approaching 75% of monthly budget (current: 38%)",
                severity: "low",
              },
              {
                type: "info",
                message:
                  "Agent-Browser sessions cost 15x more than Playwright. Consider optimization.",
                severity: "medium",
              },
              {
                type: "success",
                message:
                  "Fallback provider used efficiently - only 2% of total cost",
                severity: "low",
              },
            ].map((alert, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border-l-4 ${
                  alert.type === "warning"
                    ? "bg-yellow-50 border-yellow-500"
                    : alert.type === "info"
                      ? "bg-blue-50 border-blue-500"
                      : "bg-green-50 border-green-500"
                }`}
              >
                <p className="text-sm font-medium">{alert.message}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
