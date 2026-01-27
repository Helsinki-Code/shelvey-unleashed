import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle,
  Activity,
  Clock,
  Zap,
  TrendingUp,
  BarChart3,
} from "lucide-react";

interface DashboardMetrics {
  total_sessions: number;
  active_sessions: number;
  total_tasks_completed: number;
  success_rate: number;
  avg_latency_ms: number;
  error_rate: number;
  total_cost_today: number;
  daily_budget_remaining: number;
  critical_alerts: number;
  warning_alerts: number;
  compliance_flags: number;
  pii_incidents: number;
}

const mockMetrics: DashboardMetrics = {
  total_sessions: 127,
  active_sessions: 4,
  total_tasks_completed: 1243,
  success_rate: 96.8,
  avg_latency_ms: 1240,
  error_rate: 2.1,
  total_cost_today: 42.56,
  daily_budget_remaining: 57.44,
  critical_alerts: 1,
  warning_alerts: 3,
  compliance_flags: 5,
  pii_incidents: 2,
};

interface HealthStatus {
  provider: "agent-browser" | "playwright" | "brightdata" | "fallback";
  status: "healthy" | "degraded" | "down";
  uptime: number;
  avg_response_time_ms: number;
  error_rate: number;
  last_error?: string;
}

const mockProviderHealth: HealthStatus[] = [
  {
    provider: "agent-browser",
    status: "healthy",
    uptime: 99.7,
    avg_response_time_ms: 1850,
    error_rate: 1.2,
  },
  {
    provider: "playwright",
    status: "healthy",
    uptime: 99.9,
    avg_response_time_ms: 420,
    error_rate: 0.8,
  },
  {
    provider: "brightdata",
    status: "degraded",
    uptime: 96.5,
    avg_response_time_ms: 2340,
    error_rate: 5.1,
    last_error: "Connection timeout to proxy server",
  },
  {
    provider: "fallback",
    status: "healthy",
    uptime: 100,
    avg_response_time_ms: 3200,
    error_rate: 0,
  },
];

interface Alert {
  id: string;
  type: "critical" | "warning" | "info";
  title: string;
  description: string;
  timestamp: string;
  action?: string;
}

const mockAlerts: Alert[] = [
  {
    id: "alert_001",
    type: "critical",
    title: "BrightData Provider Degraded",
    description:
      "BrightData response times increased to 2.3s. Consider failover to Playwright.",
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    action: "Review Provider Health",
  },
  {
    id: "alert_002",
    type: "warning",
    title: "Daily Cost Approaching Limit",
    description: "Current spend: $42.56 / $100 (42.6% of daily budget)",
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    action: "View Cost Dashboard",
  },
  {
    id: "alert_003",
    type: "warning",
    title: "PII Detected in Audit Log",
    description: "Email address detected in Google Analytics scraping session",
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    action: "Review Audit Trail",
  },
  {
    id: "alert_004",
    type: "warning",
    title: "Rate Limit Warning",
    description: "Twitter.com rate limit approaching (14/15 requests per minute)",
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "alert_005",
    type: "info",
    title: "New Adaptive Rule Learned",
    description: "Successfully learned new selector for alpaca.markets portfolio element",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
];

export function BrowserMonitoringDashboard() {
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "degraded":
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case "down":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-100 text-green-700";
      case "degraded":
        return "bg-yellow-100 text-yellow-700";
      case "down":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case "critical":
        return "border-red-200 bg-red-50";
      case "warning":
        return "border-yellow-200 bg-yellow-50";
      case "info":
        return "border-blue-200 bg-blue-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "critical":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case "info":
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
      default:
        return null;
    }
  };

  const getHealthTrend = (status: string) => {
    if (status === "healthy") return "↑ Stable";
    if (status === "degraded") return "↓ Declining";
    return "↓ Down";
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">System Health</p>
                <p className="text-2xl font-bold">
                  {mockMetrics.success_rate}%
                </p>
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
                <p className="text-2xl font-bold">{mockMetrics.avg_latency_ms}ms</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Daily Cost</p>
                <p className="text-2xl font-bold">
                  ${mockMetrics.total_cost_today.toFixed(2)}
                </p>
              </div>
              <Zap className="w-8 h-8 text-yellow-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Active Alerts</p>
                <p className="text-2xl font-bold">
                  {mockMetrics.critical_alerts + mockMetrics.warning_alerts}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Active Sessions</p>
                <p className="text-2xl font-bold">{mockMetrics.active_sessions}</p>
                <p className="text-xs text-gray-500 mt-1">
                  of {mockMetrics.total_sessions} total
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Error Rate</p>
                <p className="text-2xl font-bold">{mockMetrics.error_rate}%</p>
                <p className="text-xs text-gray-500 mt-1">
                  {Math.round(mockMetrics.error_rate * mockMetrics.total_tasks_completed / 100)} errors
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Budget Remaining</p>
                <p className="text-2xl font-bold">
                  ${mockMetrics.daily_budget_remaining.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {Math.round((mockMetrics.daily_budget_remaining / (mockMetrics.total_cost_today + mockMetrics.daily_budget_remaining)) * 100)}% remaining
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Provider Health Status</CardTitle>
            <CardDescription>Real-time provider performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockProviderHealth.map((provider) => (
                <div
                  key={provider.provider}
                  className="p-3 border rounded-lg hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(provider.status)}
                      <div>
                        <p className="text-sm font-medium">{provider.provider}</p>
                        <p className="text-xs text-gray-500">
                          {getHealthTrend(provider.status)}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(provider.status)}>
                      {provider.status.charAt(0).toUpperCase() +
                        provider.status.slice(1)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-blue-50 p-2 rounded">
                      <p className="text-gray-600">Uptime</p>
                      <p className="font-semibold">{provider.uptime}%</p>
                    </div>
                    <div className="bg-green-50 p-2 rounded">
                      <p className="text-gray-600">Response</p>
                      <p className="font-semibold">{provider.avg_response_time_ms}ms</p>
                    </div>
                    <div className="bg-red-50 p-2 rounded">
                      <p className="text-gray-600">Error Rate</p>
                      <p className="font-semibold">{provider.error_rate}%</p>
                    </div>
                  </div>

                  {provider.last_error && (
                    <p className="text-xs text-yellow-700 mt-2 p-2 bg-yellow-50 rounded">
                      Last Error: {provider.last_error}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compliance Status</CardTitle>
            <CardDescription>Security and compliance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-green-900">
                    Audit Trail Coverage
                  </p>
                  <Badge className="bg-green-100 text-green-700">100%</Badge>
                </div>
                <p className="text-xs text-green-700">
                  All actions logged with screenshots
                </p>
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-yellow-900">
                    PII Incidents
                  </p>
                  <Badge className="bg-yellow-100 text-yellow-700">
                    {mockMetrics.pii_incidents}
                  </Badge>
                </div>
                <p className="text-xs text-yellow-700">
                  Detected and redacted from logs
                </p>
              </div>

              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-orange-900">
                    Compliance Flags
                  </p>
                  <Badge className="bg-orange-100 text-orange-700">
                    {mockMetrics.compliance_flags}
                  </Badge>
                </div>
                <p className="text-xs text-orange-700">
                  Active compliance warnings
                </p>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-blue-900">
                    TOS Validation
                  </p>
                  <Badge className="bg-blue-100 text-blue-700">Active</Badge>
                </div>
                <p className="text-xs text-blue-700">
                  Pre-flight checks enabled
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Alerts</CardTitle>
          <CardDescription>
            {mockMetrics.critical_alerts} critical • {mockMetrics.warning_alerts} warnings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {mockAlerts.map((alert) => (
              <button
                key={alert.id}
                onClick={() =>
                  setSelectedAlert(
                    selectedAlert === alert.id ? null : alert.id
                  )
                }
                className={`w-full text-left p-3 border-l-4 rounded-lg transition ${getAlertColor(
                  alert.type
                )} ${selectedAlert === alert.id ? "ring-2 ring-offset-0" : ""}`}
              >
                <div className="flex items-start gap-3">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{alert.title}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {alert.description}
                    </p>
                    {selectedAlert === alert.id && (
                      <div className="mt-2 pt-2 border-t flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </p>
                        {alert.action && (
                          <button className="text-xs font-medium text-blue-600 hover:text-blue-700">
                            {alert.action} →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
            <p className="text-sm font-medium text-blue-900">
              💡 Optimize Provider Usage
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Switch 30% of Brightdata tasks to Playwright to reduce costs by
              ~$8/day
            </p>
          </div>
          <div className="p-3 bg-green-50 border-l-4 border-green-500 rounded-lg">
            <p className="text-sm font-medium text-green-900">
              ✓ Good Session Management
            </p>
            <p className="text-xs text-green-700 mt-1">
              Active sessions cleaning up idle connections properly
            </p>
          </div>
          <div className="p-3 bg-purple-50 border-l-4 border-purple-500 rounded-lg">
            <p className="text-sm font-medium text-purple-900">
              📊 Scale Ready
            </p>
            <p className="text-xs text-purple-700 mt-1">
              Infrastructure can handle 10x current load without modifications
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
