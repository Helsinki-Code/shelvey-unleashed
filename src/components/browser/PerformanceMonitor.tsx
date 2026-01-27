import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Zap, Clock, AlertTriangle } from "lucide-react";

interface PerformanceMetrics {
  timestamp: string;
  session_id: string;
  provider: string;
  success_rate: number;
  avg_latency_ms: number;
  error_rate: number;
  actions_completed: number;
  cost_usd: number;
}

const mockMetrics: PerformanceMetrics[] = [
  {
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    session_id: "sess_123abc",
    provider: "agent-browser",
    success_rate: 97.2,
    avg_latency_ms: 1240,
    error_rate: 2.8,
    actions_completed: 34,
    cost_usd: 0.51,
  },
  {
    timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    session_id: "sess_456def",
    provider: "playwright",
    success_rate: 99.1,
    avg_latency_ms: 320,
    error_rate: 0.9,
    actions_completed: 156,
    cost_usd: 0.16,
  },
  {
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    session_id: "sess_789ghi",
    provider: "brightdata",
    success_rate: 95.3,
    avg_latency_ms: 2180,
    error_rate: 4.7,
    actions_completed: 28,
    cost_usd: 0.42,
  },
];

export function PerformanceMonitor() {
  const avgSuccessRate = (
    mockMetrics.reduce((sum, m) => sum + m.success_rate, 0) / mockMetrics.length
  ).toFixed(1);
  const avgLatency = Math.round(
    mockMetrics.reduce((sum, m) => sum + m.avg_latency_ms, 0) /
      mockMetrics.length
  );
  const totalCost = mockMetrics
    .reduce((sum, m) => sum + m.cost_usd, 0)
    .toFixed(2);
  const totalActions = mockMetrics.reduce((sum, m) => sum + m.actions_completed, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold">{avgSuccessRate}%</p>
              </div>
              <Activity className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Avg Latency</p>
                <p className="text-2xl font-bold">{avgLatency}ms</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total Actions</p>
                <p className="text-2xl font-bold">{totalActions}</p>
              </div>
              <Zap className="w-8 h-8 text-yellow-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total Cost</p>
                <p className="text-2xl font-bold">${totalCost}</p>
              </div>
              <Zap className="w-8 h-8 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Sessions</CardTitle>
          <CardDescription>Performance metrics by session</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockMetrics.map((metric) => (
              <div
                key={metric.session_id}
                className="p-4 border rounded-lg hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-sm">{metric.session_id}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(metric.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <Badge
                    className={`${
                      metric.success_rate > 95
                        ? "bg-green-100 text-green-700"
                        : metric.success_rate > 90
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {metric.provider}
                  </Badge>
                </div>

                <div className="grid grid-cols-5 gap-2 text-xs">
                  <div className="bg-blue-50 p-2 rounded">
                    <p className="text-gray-600">Success</p>
                    <p className="font-semibold">{metric.success_rate.toFixed(1)}%</p>
                  </div>
                  <div className="bg-purple-50 p-2 rounded">
                    <p className="text-gray-600">Latency</p>
                    <p className="font-semibold">{metric.avg_latency_ms}ms</p>
                  </div>
                  <div className="bg-red-50 p-2 rounded">
                    <p className="text-gray-600">Error Rate</p>
                    <p className="font-semibold">{metric.error_rate.toFixed(1)}%</p>
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <p className="text-gray-600">Actions</p>
                    <p className="font-semibold">{metric.actions_completed}</p>
                  </div>
                  <div className="bg-orange-50 p-2 rounded">
                    <p className="text-gray-600">Cost</p>
                    <p className="font-semibold">${metric.cost_usd.toFixed(2)}</p>
                  </div>
                </div>

                {metric.success_rate < 95 && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-orange-700 bg-orange-50 p-2 rounded">
                    <AlertTriangle className="w-3 h-3" />
                    Below target success rate
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Health Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { provider: "agent-browser", status: "healthy", uptime: "99.8%" },
            { provider: "playwright-mcp", status: "healthy", uptime: "99.9%" },
            { provider: "brightdata", status: "degraded", uptime: "95.2%" },
            { provider: "api-fallback", status: "healthy", uptime: "100%" },
          ].map((item) => (
            <div
              key={item.provider}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div>
                <p className="text-sm font-medium">{item.provider}</p>
                <p className="text-xs text-gray-500">Uptime: {item.uptime}</p>
              </div>
              <Badge
                className={`${
                  item.status === "healthy"
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
