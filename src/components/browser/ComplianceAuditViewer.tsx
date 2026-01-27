import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertCircle,
  CheckCircle,
  Shield,
  Eye,
  Download,
  Filter,
} from "lucide-react";

interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  provider: "agent-browser" | "playwright" | "brightdata" | "fallback";
  user_id: string;
  domain: string;
  status: "success" | "error" | "warning";
  compliance_flags: string[];
  pii_detected: boolean;
  pii_fields?: string[];
  tos_violation: boolean;
  rate_limit_warning: boolean;
  screenshot_captured: boolean;
  duration_ms: number;
  cost_usd: number;
  error_message?: string;
}

const mockAuditLogs: AuditLogEntry[] = [
  {
    id: "audit_001",
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    action: "scrape_market_data",
    provider: "playwright",
    user_id: "user_123",
    domain: "tradingview.com",
    status: "success",
    compliance_flags: [],
    pii_detected: false,
    tos_violation: false,
    rate_limit_warning: false,
    screenshot_captured: true,
    duration_ms: 2340,
    cost_usd: 0.001,
  },
  {
    id: "audit_002",
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    action: "publish_to_wordpress",
    provider: "agent-browser",
    user_id: "user_123",
    domain: "mywordpress.com",
    status: "success",
    compliance_flags: ["APPROVAL_GRANTED"],
    pii_detected: false,
    tos_violation: false,
    rate_limit_warning: false,
    screenshot_captured: true,
    duration_ms: 4560,
    cost_usd: 0.015,
  },
  {
    id: "audit_003",
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    action: "scrape_google_analytics",
    provider: "playwright",
    user_id: "user_123",
    domain: "google.com/analytics",
    status: "warning",
    compliance_flags: ["PII_DETECTED"],
    pii_detected: true,
    pii_fields: ["user_email", "user_name"],
    tos_violation: false,
    rate_limit_warning: false,
    screenshot_captured: true,
    duration_ms: 3210,
    cost_usd: 0.001,
  },
  {
    id: "audit_004",
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    action: "rebalance_portfolio",
    provider: "agent-browser",
    user_id: "user_123",
    domain: "alpaca.markets",
    status: "success",
    compliance_flags: ["HIGH_RISK_ACTION", "APPROVAL_GRANTED"],
    pii_detected: false,
    tos_violation: false,
    rate_limit_warning: false,
    screenshot_captured: true,
    duration_ms: 5670,
    cost_usd: 0.015,
  },
  {
    id: "audit_005",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    action: "distribute_content",
    provider: "agent-browser",
    user_id: "user_123",
    domain: "multiple_platforms",
    status: "error",
    compliance_flags: ["RATE_LIMIT_EXCEEDED"],
    pii_detected: false,
    tos_violation: false,
    rate_limit_warning: true,
    screenshot_captured: true,
    duration_ms: 8900,
    cost_usd: 0.045,
    error_message:
      "Rate limit exceeded on platform: twitter.com (15 requests/min limit)",
  },
  {
    id: "audit_006",
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    action: "moderate_comments",
    provider: "playwright",
    user_id: "user_123",
    domain: "wordpress.com",
    status: "success",
    compliance_flags: ["AI_MODERATION_APPLIED"],
    pii_detected: false,
    tos_violation: false,
    rate_limit_warning: false,
    screenshot_captured: false,
    duration_ms: 4320,
    cost_usd: 0.001,
  },
  {
    id: "audit_007",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    action: "login_exchange",
    provider: "agent-browser",
    user_id: "user_123",
    domain: "binance.com",
    status: "warning",
    compliance_flags: ["CREDENTIALS_USED", "PII_DETECTED"],
    pii_detected: true,
    pii_fields: ["email_address"],
    tos_violation: false,
    rate_limit_warning: false,
    screenshot_captured: true,
    duration_ms: 3450,
    cost_usd: 0.015,
  },
  {
    id: "audit_008",
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    action: "scrape_competitor_data",
    provider: "brightdata",
    user_id: "user_123",
    domain: "competitor-site.com",
    status: "warning",
    compliance_flags: ["TOS_VIOLATION_RISK"],
    pii_detected: false,
    tos_violation: true,
    rate_limit_warning: false,
    screenshot_captured: true,
    duration_ms: 12340,
    cost_usd: 0.005,
    error_message:
      "Site robots.txt restricts scraping. TOS may be violated. Proceeding with caution.",
  },
];

export function ComplianceAuditViewer() {
  const [logs, setLogs] = useState<AuditLogEntry[]>(mockAuditLogs);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(
    mockAuditLogs[0]?.id
  );
  const [filterAction, setFilterAction] = useState("");
  const [filterProvider, setFilterProvider] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const filteredLogs = logs.filter((log) => {
    if (filterAction && !log.action.includes(filterAction.toLowerCase()))
      return false;
    if (filterProvider && log.provider !== filterProvider) return false;
    if (filterStatus && log.status !== filterStatus) return false;
    return true;
  });

  const selected = logs.find((l) => l.id === selectedLogId);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "warning":
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-700";
      case "warning":
        return "bg-yellow-100 text-yellow-700";
      case "error":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const handleExportAudit = () => {
    const csv = [
      [
        "Timestamp",
        "Action",
        "Provider",
        "Domain",
        "Status",
        "Duration (ms)",
        "Cost (USD)",
        "Compliance Flags",
        "PII Detected",
        "TOS Violation",
      ],
      ...filteredLogs.map((log) => [
        new Date(log.timestamp).toLocaleString(),
        log.action,
        log.provider,
        log.domain,
        log.status,
        log.duration_ms,
        log.cost_usd.toFixed(4),
        log.compliance_flags.join("; "),
        log.pii_detected ? "YES" : "NO",
        log.tos_violation ? "YES" : "NO",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const severityFlags = selected?.compliance_flags || [];
  const hasCriticalFlag =
    selected?.pii_detected ||
    selected?.tos_violation ||
    selected?.rate_limit_warning;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total Audits</p>
                <p className="text-2xl font-bold">{logs.length}</p>
              </div>
              <Shield className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">PII Incidents</p>
                <p className="text-2xl font-bold">
                  {logs.filter((l) => l.pii_detected).length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">TOS Violations</p>
                <p className="text-2xl font-bold">
                  {logs.filter((l) => l.tos_violation).length}
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
                <p className="text-xs text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold">
                  {(
                    (logs.filter((l) => l.status === "success").length /
                      logs.length) *
                    100
                  ).toFixed(0)}
                  %
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Audit Trail</CardTitle>
              <CardDescription>
                Filtered logs: {filteredLogs.length} of {logs.length}
              </CardDescription>
            </div>
            <Button onClick={handleExportAudit} size="sm" variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mb-4">
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="Filter by action..."
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="text-xs"
              />
              <select
                value={filterProvider}
                onChange={(e) => setFilterProvider(e.target.value)}
                className="text-xs px-3 py-2 border rounded-md"
              >
                <option value="">All Providers</option>
                <option value="agent-browser">Agent-Browser</option>
                <option value="playwright">Playwright</option>
                <option value="brightdata">BrightData</option>
                <option value="fallback">Fallback</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs px-3 py-2 border rounded-md"
              >
                <option value="">All Status</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredLogs.map((log) => (
              <button
                key={log.id}
                onClick={() => setSelectedLogId(log.id)}
                className={`w-full text-left p-3 rounded-lg border-2 transition ${
                  selectedLogId === log.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(log.status)}
                    <p className="text-sm font-medium">{log.action}</p>
                  </div>
                  <Badge className={getStatusColor(log.status)}>
                    {log.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <span>{log.domain}</span>
                    <span>•</span>
                    <span>{log.provider}</span>
                  </div>
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                {log.compliance_flags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {log.compliance_flags.slice(0, 2).map((flag) => (
                      <Badge key={flag} variant="outline" className="text-xs">
                        {flag}
                      </Badge>
                    ))}
                    {log.compliance_flags.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{log.compliance_flags.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(selected.status)}
                <div>
                  <CardTitle className="text-base">{selected.action}</CardTitle>
                  <CardDescription>
                    {new Date(selected.timestamp).toLocaleString()}
                  </CardDescription>
                </div>
              </div>
              <Badge className={getStatusColor(selected.status)}>
                {selected.status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600">Provider</p>
                <p className="font-semibold text-sm">{selected.provider}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600">Duration</p>
                <p className="font-semibold text-sm">{selected.duration_ms}ms</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600">Cost</p>
                <p className="font-semibold text-sm">
                  ${selected.cost_usd.toFixed(4)}
                </p>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600">Domain</p>
                <p className="font-semibold text-sm truncate">
                  {selected.domain}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600">Compliance Flags</p>
              {selected.compliance_flags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selected.compliance_flags.map((flag) => (
                    <Badge key={flag} variant="outline">
                      {flag}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No compliance flags</p>
              )}
            </div>

            {hasCriticalFlag && (
              <div className="space-y-2">
                {selected.pii_detected && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-red-900">
                          PII Detected
                        </p>
                        <p className="text-xs text-red-700 mt-1">
                          Fields: {selected.pii_fields?.join(", ")}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {selected.tos_violation && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-orange-900">
                          TOS Violation Risk
                        </p>
                        <p className="text-xs text-orange-700 mt-1">
                          This action may violate site terms of service
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {selected.rate_limit_warning && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-yellow-900">
                          Rate Limit Warning
                        </p>
                        {selected.error_message && (
                          <p className="text-xs text-yellow-700 mt-1">
                            {selected.error_message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {selected.error_message && !hasCriticalFlag && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-900 mb-1">Error</p>
                <p className="text-xs text-red-700">{selected.error_message}</p>
              </div>
            )}

            {selected.screenshot_captured && (
              <Button
                variant="outline"
                className="w-full text-xs"
                size="sm"
              >
                <Eye className="w-3 h-3 mr-2" />
                View Screenshot
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
