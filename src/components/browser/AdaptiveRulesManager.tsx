import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle, Trash2, RefreshCw, Plus } from "lucide-react";

interface SelectorRule {
  id: string;
  domain: string;
  element_identifier: string;
  selectors: Array<{
    selector: string;
    success_rate: number;
    last_used: string;
    test_count: number;
  }>;
  status: "active" | "deprecated" | "learning";
  last_updated: string;
  created_at: string;
  version: number;
  fallback_selector?: string;
}

const mockRules: SelectorRule[] = [
  {
    id: "rule_001",
    domain: "alpaca.markets",
    element_identifier: "portfolio_value",
    selectors: [
      {
        selector: ".portfolio-total-value",
        success_rate: 98.5,
        last_used: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        test_count: 156,
      },
      {
        selector: "[data-test='portfolio-value']",
        success_rate: 92.1,
        last_used: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        test_count: 45,
      },
    ],
    status: "active",
    last_updated: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    version: 3,
    fallback_selector: "#portfolio-total",
  },
  {
    id: "rule_002",
    domain: "trading.binance.com",
    element_identifier: "open_orders",
    selectors: [
      {
        selector: ".css-abc123 .order-row",
        success_rate: 87.3,
        last_used: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        test_count: 234,
      },
      {
        selector: "[role='row'][data-order-id]",
        success_rate: 95.8,
        last_used: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        test_count: 89,
      },
    ],
    status: "active",
    last_updated: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    version: 2,
  },
  {
    id: "rule_003",
    domain: "wordpress.com/dashboard",
    element_identifier: "publish_button",
    selectors: [
      {
        selector: ".editor-post-publish-button",
        success_rate: 76.2,
        last_used: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        test_count: 42,
      },
      {
        selector: "[aria-label='Publish']",
        success_rate: 100,
        last_used: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
        test_count: 12,
      },
    ],
    status: "learning",
    last_updated: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    version: 1,
  },
];

export function AdaptiveRulesManager() {
  const [rules, setRules] = useState<SelectorRule[]>(mockRules);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(
    mockRules[0]?.id
  );
  const [newDomain, setNewDomain] = useState("");
  const [newElement, setNewElement] = useState("");

  const selected = rules.find((r) => r.id === selectedRuleId);

  const handleDeleteRule = (id: string) => {
    setRules(rules.filter((r) => r.id !== id));
    if (selectedRuleId === id) {
      setSelectedRuleId(rules[0]?.id || null);
    }
  };

  const handleRefreshRule = (id: string) => {
    setRules(
      rules.map((r) =>
        r.id === id
          ? {
              ...r,
              status: "learning",
              last_updated: new Date().toISOString(),
            }
          : r
      )
    );
  };

  const handleAddRule = () => {
    if (newDomain && newElement) {
      const newRule: SelectorRule = {
        id: `rule_${Date.now()}`,
        domain: newDomain,
        element_identifier: newElement,
        selectors: [],
        status: "learning",
        last_updated: new Date().toISOString(),
        created_at: new Date().toISOString(),
        version: 1,
      };
      setRules([...rules, newRule]);
      setNewDomain("");
      setNewElement("");
    }
  };

  const getSuccessColor = (rate: number) => {
    if (rate >= 95) return "bg-green-100 text-green-700";
    if (rate >= 80) return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700";
      case "learning":
        return "bg-blue-100 text-blue-700";
      case "deprecated":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle className="text-base">Active Rules</CardTitle>
          <CardDescription>{rules.length} selector rules</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
            {rules.map((rule) => (
              <button
                key={rule.id}
                onClick={() => setSelectedRuleId(rule.id)}
                className={`w-full text-left p-3 rounded-lg border-2 transition ${
                  selectedRuleId === rule.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <p className="text-sm font-medium truncate">{rule.domain}</p>
                  <Badge className={getStatusColor(rule.status)}>
                    {rule.status.charAt(0).toUpperCase() + rule.status.slice(1)}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 truncate">
                  {rule.element_identifier}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  v{rule.version} • {rule.selectors.length} selector(s)
                </p>
              </button>
            ))}
          </div>

          <div className="space-y-2 border-t pt-4">
            <Input
              placeholder="Domain (e.g., alpaca.markets)"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              className="text-xs"
            />
            <Input
              placeholder="Element identifier"
              value={newElement}
              onChange={(e) => setNewElement(e.target.value)}
              className="text-xs"
            />
            <Button
              onClick={handleAddRule}
              disabled={!newDomain || !newElement}
              className="w-full text-xs"
              size="sm"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Rule
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Rule Details & History</CardTitle>
          <CardDescription>Selector versions and success rates</CardDescription>
        </CardHeader>
        <CardContent>
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-600">Domain</p>
                  <p className="text-lg font-semibold">{selected.domain}</p>
                </div>
                <Badge className={getStatusColor(selected.status)}>
                  {selected.status.toUpperCase()}
                </Badge>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-600">
                  Element Identifier
                </p>
                <p className="font-semibold text-sm">{selected.element_identifier}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-blue-50 p-2 rounded">
                  <p className="text-gray-600">Version</p>
                  <p className="font-semibold text-lg">{selected.version}</p>
                </div>
                <div className="bg-green-50 p-2 rounded">
                  <p className="text-gray-600">Total Selectors</p>
                  <p className="font-semibold text-lg">
                    {selected.selectors.length}
                  </p>
                </div>
                <div className="bg-purple-50 p-2 rounded">
                  <p className="text-gray-600">Created</p>
                  <p className="font-semibold text-xs">
                    {new Date(selected.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {selected.fallback_selector && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs font-medium text-yellow-900 mb-1">
                    Fallback Selector
                  </p>
                  <code className="text-xs text-yellow-800 block break-all">
                    {selected.fallback_selector}
                  </code>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-600">
                  Selector Versions
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selected.selectors.map((sel, idx) => (
                    <div key={idx} className="p-2 border rounded-lg bg-gray-50">
                      <div className="flex items-start justify-between mb-1">
                        <code className="text-xs break-all font-mono">
                          {sel.selector}
                        </code>
                        <Badge className={getSuccessColor(sel.success_rate)}>
                          {sel.success_rate.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-600 mt-1">
                        <span>Tests: {sel.test_count}</span>
                        <span>
                          Last used:{" "}
                          {new Date(sel.last_used).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full bg-green-500"
                          style={{ width: `${sel.success_rate}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleRefreshRule(selected.id)}
                  variant="outline"
                  className="flex-1 text-xs"
                  size="sm"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Refresh Learning
                </Button>
                <Button
                  onClick={() => handleDeleteRule(selected.id)}
                  variant="outline"
                  className="flex-1 text-xs text-red-600 hover:text-red-700"
                  size="sm"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No rule selected</p>
          )}
        </CardContent>
      </Card>

      <Card className="col-span-3">
        <CardHeader>
          <CardTitle className="text-sm">Rule Learning Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              {
                rule: "portfolio_value (alpaca.markets)",
                action: "Selector test succeeded",
                result: "success",
                time: "2 minutes ago",
              },
              {
                rule: "publish_button (wordpress.com)",
                action: "Learning new selector candidate",
                result: "learning",
                time: "5 minutes ago",
              },
              {
                rule: "open_orders (trading.binance.com)",
                action: "Selector success rate updated to 95.8%",
                result: "success",
                time: "12 minutes ago",
              },
              {
                rule: "portfolio_value (alpaca.markets)",
                action: "UI change detected, initiating learning",
                result: "learning",
                time: "1 hour ago",
              },
              {
                rule: "open_orders (trading.binance.com)",
                action: "New selector version added",
                result: "success",
                time: "3 hours ago",
              },
            ].map((activity, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 border rounded"
              >
                <div className="flex items-center gap-3 flex-1">
                  {activity.result === "success" ? (
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.rule}</p>
                    <p className="text-xs text-gray-500">{activity.action}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 ml-2">{activity.time}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
