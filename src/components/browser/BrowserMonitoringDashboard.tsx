import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const BrowserMonitoringDashboard = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [providerHealth, setProviderHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchMetrics();
      const interval = setInterval(fetchMetrics, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchMetrics = async () => {
    try {
      const token = await user?.id;
      if (!token) return;

      // Get session from localStorage or from previous auth
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) return;

      const metricsResponse = await supabase.functions.invoke(
        "browser-monitoring",
        {
          body: { action: "get_metrics" },
          headers: {
            Authorization: `Bearer ${session.data.session.access_token}`,
          },
        }
      );

      const healthResponse = await supabase.functions.invoke(
        "browser-monitoring",
        {
          body: { action: "get_provider_health" },
          headers: {
            Authorization: `Bearer ${session.data.session.access_token}`,
          },
        }
      );

      const alertsResponse = await supabase.functions.invoke(
        "browser-monitoring",
        {
          body: { action: "get_alerts" },
          headers: {
            Authorization: `Bearer ${session.data.session.access_token}`,
          },
        }
      );

      if (metricsResponse.data) setMetrics(metricsResponse.data);
      if (healthResponse.data) setProviderHealth(healthResponse.data);
      if (alertsResponse.data) setAlerts(alertsResponse.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching metrics:", error);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const systemHealth = metrics?.successRate || 100;
  const healthColor =
    systemHealth > 90
      ? "text-green-500"
      : systemHealth > 70
        ? "text-yellow-500"
        : "text-red-500";

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${healthColor}`}>
              {systemHealth}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Success rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Latency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics?.avgLatency}ms</div>
            <p className="text-xs text-muted-foreground mt-1">Per operation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Daily Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${metrics?.monthlyCost}</div>
            <p className="text-xs text-muted-foreground mt-1">Monthly spend</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">
              {alerts.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pending approvals
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Provider Health */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Provider Status</CardTitle>
          <CardDescription>Real-time provider health metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {providerHealth &&
              Object.entries(providerHealth).map(([provider, health]: any) => (
                <div key={provider} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-sm capitalize">
                      {provider.replace(/-/g, " ")}
                    </span>
                    {health.uptime_percentage > 95 ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : health.uptime_percentage > 80 ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Uptime:</span>
                      <Badge variant="outline">
                        {health.uptime_percentage}%
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Latency:</span>
                      <Badge variant="outline">
                        {health.avg_response_time_ms}ms
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Errors:</span>
                      <Badge variant="outline">{health.error_rate}%</Badge>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 5).map((alert, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-2 rounded-lg border"
                >
                  <AlertCircle className="h-4 w-4 text-orange-500 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {alert.risk_level || "Pending"} Risk
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {alert.description || "Action requires approval"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
