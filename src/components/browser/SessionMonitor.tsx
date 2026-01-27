import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Globe,
  X,
  Clock,
  AlertCircle,
  CheckCircle,
  Zap,
  Copy,
} from "lucide-react";

interface BrowserSession {
  id: string;
  provider: "agent-browser" | "playwright" | "brightdata" | "fallback";
  status: "active" | "idle" | "closing" | "error";
  started_at: string;
  last_activity: string;
  domain: string;
  current_task: string;
  tasks_completed: number;
  total_cost: number;
  api_calls: number;
  tabs_open: number;
  memory_mb: number;
}

const mockSessions: BrowserSession[] = [
  {
    id: "sess_a1b2c3",
    provider: "agent-browser",
    status: "active",
    started_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    last_activity: new Date(Date.now() - 30 * 1000).toISOString(),
    domain: "alpaca.markets",
    current_task: "Scraping portfolio data",
    tasks_completed: 3,
    total_cost: 0.045,
    api_calls: 12,
    tabs_open: 2,
    memory_mb: 245,
  },
  {
    id: "sess_d4e5f6",
    provider: "playwright",
    status: "active",
    started_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    last_activity: new Date(Date.now() - 5 * 1000).toISOString(),
    domain: "tradingview.com",
    current_task: "Extracting market indicators",
    tasks_completed: 7,
    total_cost: 0.007,
    api_calls: 8,
    tabs_open: 1,
    memory_mb: 128,
  },
  {
    id: "sess_g7h8i9",
    provider: "agent-browser",
    status: "idle",
    started_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    last_activity: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    domain: "mywordpress.com",
    current_task: "Idle",
    tasks_completed: 5,
    total_cost: 0.075,
    api_calls: 18,
    tabs_open: 0,
    memory_mb: 0,
  },
  {
    id: "sess_j0k1l2",
    provider: "playwright",
    status: "active",
    started_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    last_activity: new Date(Date.now() - 1000).toISOString(),
    domain: "google.com/analytics",
    current_task: "Fetching analytics data",
    tasks_completed: 2,
    total_cost: 0.002,
    api_calls: 3,
    tabs_open: 1,
    memory_mb: 95,
  },
];

export function SessionMonitor() {
  const [sessions, setSessions] = useState<BrowserSession[]>(mockSessions);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    mockSessions[0]?.id
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setSessions((prev) =>
        prev.map((session) => ({
          ...session,
          last_activity: new Date().toISOString(),
        }))
      );
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const selected = sessions.find((s) => s.id === selectedSessionId);

  const handleCloseSession = (id: string) => {
    setSessions(sessions.filter((s) => s.id !== id));
    if (selectedSessionId === id) {
      setSelectedSessionId(sessions[0]?.id || null);
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700";
      case "idle":
        return "bg-yellow-100 text-yellow-700";
      case "closing":
        return "bg-orange-100 text-orange-700";
      case "error":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case "agent-browser":
        return "bg-blue-100 text-blue-700";
      case "playwright":
        return "bg-purple-100 text-purple-700";
      case "brightdata":
        return "bg-indigo-100 text-indigo-700";
      case "fallback":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "idle":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case "closing":
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getTimeSince = (timestamp: string) => {
    const seconds = Math.floor(
      (Date.now() - new Date(timestamp).getTime()) / 1000
    );
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  const activeSessions = sessions.filter((s) => s.status === "active");
  const idleSessions = sessions.filter((s) => s.status === "idle");
  const totalCost = sessions.reduce((sum, s) => sum + s.total_cost, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Active Sessions</p>
                <p className="text-2xl font-bold">{activeSessions.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Idle Sessions</p>
                <p className="text-2xl font-bold">{idleSessions.length}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold">
                  {sessions.reduce((sum, s) => sum + s.tasks_completed, 0)}
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
                <p className="text-xs text-gray-600">Total Cost</p>
                <p className="text-2xl font-bold">${totalCost.toFixed(3)}</p>
              </div>
              <Zap className="w-8 h-8 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Sessions</CardTitle>
            <CardDescription>{activeSessions.length} running</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {activeSessions.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-8">
                  No active sessions
                </p>
              ) : (
                activeSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setSelectedSessionId(session.id)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition ${
                      selectedSessionId === session.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-gray-600" />
                        <p className="text-sm font-medium truncate">
                          {session.domain}
                        </p>
                      </div>
                      <Badge className={getStatusColor(session.status)}>
                        Active
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 truncate">
                      {session.current_task}
                    </p>
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                      <span>{getTimeSince(session.last_activity)}</span>
                      <span className="font-semibold text-gray-700">
                        {session.api_calls} calls
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Idle Sessions</CardTitle>
            <CardDescription>{idleSessions.length} waiting</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {idleSessions.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-8">
                  No idle sessions
                </p>
              ) : (
                idleSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setSelectedSessionId(session.id)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition ${
                      selectedSessionId === session.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-yellow-600" />
                        <p className="text-sm font-medium truncate">
                          {session.domain}
                        </p>
                      </div>
                      <Badge className={getStatusColor(session.status)}>
                        Idle
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">
                      Last active {getTimeSince(session.last_activity)}
                    </p>
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                      <span>{session.tasks_completed} tasks</span>
                      <span className="font-semibold text-gray-700">
                        ${session.total_cost.toFixed(3)}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {selected && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(selected.status)}
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {selected.domain}
                    <Badge className={getProviderColor(selected.provider)}>
                      {selected.provider}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                      {selected.id}
                    </code>
                    <button
                      onClick={() => handleCopyId(selected.id)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      {copiedId === selected.id ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                  </CardDescription>
                </div>
              </div>
              <Button
                onClick={() => handleCloseSession(selected.id)}
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700"
              >
                <X className="w-4 h-4 mr-2" />
                Close Session
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Current Task</p>
              <p className="font-semibold text-sm">{selected.current_task}</p>
            </div>

            <div className="grid grid-cols-4 gap-3 text-xs">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-gray-600">Duration</p>
                <p className="font-semibold">
                  {Math.floor(
                    (Date.now() - new Date(selected.started_at).getTime()) /
                      1000 /
                      60
                  )}
                  m
                </p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-gray-600">Tasks Completed</p>
                <p className="font-semibold">{selected.tasks_completed}</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <p className="text-gray-600">API Calls</p>
                <p className="font-semibold">{selected.api_calls}</p>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <p className="text-gray-600">Cost</p>
                <p className="font-semibold">
                  ${selected.total_cost.toFixed(4)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-600">Tabs Open</p>
                <p className="font-semibold">{selected.tabs_open}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-600">Memory</p>
                <p className="font-semibold">{selected.memory_mb} MB</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-600">Last Activity</p>
                <p className="font-semibold">
                  {getTimeSince(selected.last_activity)}
                </p>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-600 mb-1">
                Session Timeline
              </p>
              <div className="space-y-1 text-xs text-gray-600">
                <p>Started: {new Date(selected.started_at).toLocaleTimeString()}</p>
                <p>
                  Last Activity:{" "}
                  {new Date(selected.last_activity).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
