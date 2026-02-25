import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Zap, Play, Square, AlertCircle, CheckCircle2 } from "lucide-react";

export const BrowserAutomationPanel = () => {
  const { user } = useAuth();
  const [automations, setAutomations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningAutomations, setRunningAutomations] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchAutomations();
      const interval = setInterval(fetchAutomations, 20000); // Refresh every 20 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchAutomations = async () => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) return;

      const response = await supabase.functions.invoke("browser-monitoring", {
        body: { action: "get_sessions" },
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (response.data) {
        const activeSessions = response.data.filter((s: any) => s.status === "active");
        setAutomations(activeSessions);
        setRunningAutomations(activeSessions.map((s: any) => s.id));
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching automations:", error);
    }
  };

  const handleStartAutomation = async (automationName: string) => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) return;

      const response = await supabase.functions.invoke("trading-browser-agent", {
        body: { action: "start_browser_session", automation: automationName },
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (response.data?.session_id) {
        setRunningAutomations([...runningAutomations, response.data.session_id]);
      }
      fetchAutomations();
    } catch (error) {
      console.error("Error starting automation:", error);
    }
  };

  const handleStopAutomation = async (sessionId: string) => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) return;

      await supabase.functions.invoke("browser-session-manager", {
        body: { action: "close", session_id: sessionId },
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      setRunningAutomations(runningAutomations.filter((id) => id !== sessionId));
      fetchAutomations();
    } catch (error) {
      console.error("Error stopping automation:", error);
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

  const availableAutomations = [
    {
      id: "exchange-login",
      name: "Exchange Login & Portfolio",
      description: "Auto-login to Alpaca, Binance, Coinbase with real-time data sync",
      status: runningAutomations.some((id) => automations.find((a) => a.id === id)?.task === "exchange-login") ? "active" : "idle",
    },
    {
      id: "market-scraper",
      name: "Market Data Scraper",
      description: "Extract real-time market data from TradingView, Finviz, StockTwits",
      status: runningAutomations.some((id) => automations.find((a) => a.id === id)?.task === "market-scraper") ? "active" : "idle",
    },
    {
      id: "trade-executor",
      name: "Autonomous Trade Executor",
      description: "Execute trades based on alerts and predefined rules with approval gates",
      status: runningAutomations.some((id) => automations.find((a) => a.id === id)?.task === "trade-executor") ? "active" : "idle",
    },
    {
      id: "journal-creator",
      name: "Automated Trading Journal",
      description: "Screenshot trades and auto-generate journal entries with P&L analysis",
      status: runningAutomations.some((id) => automations.find((a) => a.id === id)?.task === "journal-creator") ? "active" : "idle",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Browser Automation Suite</CardTitle>
        <CardDescription>AI-powered trading automation with computer use</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Active Sessions Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Active Sessions</p>
              <p className="text-2xl font-bold text-green-500">{runningAutomations.length}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Available Tasks</p>
              <p className="text-2xl font-bold">{availableAutomations.length}</p>
            </div>
          </div>

          {/* Automation Tasks */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Available Automations</p>
            <div className="space-y-2">
              {availableAutomations.map((automation) => {
                const session = automations.find((a) => a.task === automation.id);
                const isActive = !!session;
                return (
                  <div
                    key={automation.id}
                    className={`p-3 rounded border ${
                      isActive
                        ? "bg-green-500/5 border-green-500/20"
                        : "bg-muted border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{automation.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {automation.description}
                        </p>
                      </div>
                      <Badge
                        className={
                          isActive
                            ? "bg-green-500"
                            : "bg-gray-500"
                        }
                      >
                        {isActive ? "Active" : "Ready"}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      {isActive ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (session) handleStopAutomation(session.id);
                          }}
                        >
                          <Square className="h-3 w-3 mr-1" />
                          Stop
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-blue-500 hover:bg-blue-600"
                          onClick={() => handleStartAutomation(automation.id)}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Start
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Sessions Detail */}
          {automations.length > 0 && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Running Sessions</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {automations.map((automation) => (
                  <div
                    key={automation.id}
                    className="p-2 rounded border bg-green-500/5 border-green-500/20 text-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2 flex-1">
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{automation.task || automation.id}</p>
                          <p className="text-xs text-muted-foreground">
                            Uptime: {automation.duration || "—"}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleStopAutomation(automation.id)}
                      >
                        <Square className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk Notice */}
          <div className="border-t pt-4 p-3 bg-orange-500/5 rounded-lg border border-orange-500/20">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium mb-1">Risk Management</p>
                <p className="text-xs text-muted-foreground">
                  Trade execution requires approval for positions greater than $10,000. Enable MFA for maximum security.
                </p>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">Performance</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center justify-between p-2 rounded bg-muted">
                <span>Success Rate</span>
                <Badge variant="outline">N/A</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-muted">
                <span>Avg Execution Time</span>
                <Badge variant="outline">N/A</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-muted">
                <span>Total Automations Run</span>
                <Badge variant="outline">{automations.length}</Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
