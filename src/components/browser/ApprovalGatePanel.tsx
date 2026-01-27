import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";

interface ApprovalRequest {
  id: string;
  action: string;
  risk_level: "low" | "medium" | "high" | "critical";
  details: {
    target: string;
    amount?: number;
    reason: string;
  };
  requested_at: string;
  expires_at: string;
  status: "pending" | "approved" | "rejected";
}

const mockRequests: ApprovalRequest[] = [
  {
    id: "apr_001",
    action: "execute_trade",
    risk_level: "high",
    details: {
      target: "BTC/USD",
      amount: 2500,
      reason: "Auto-rebalance portfolio to target allocation",
    },
    requested_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    status: "pending",
  },
  {
    id: "apr_002",
    action: "publish_content",
    risk_level: "medium",
    details: {
      target: "WordPress",
      reason: "Publish scheduled blog post to all platforms",
    },
    requested_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    status: "approved",
  },
  {
    id: "apr_003",
    action: "delete_content",
    risk_level: "critical",
    details: {
      target: "Old blog post",
      reason: "Remove outdated trading guide permanently",
    },
    requested_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    status: "pending",
  },
];

export function ApprovalGatePanel() {
  const [requests, setRequests] = useState<ApprovalRequest[]>(mockRequests);
  const [selectedId, setSelectedId] = useState<string | null>(mockRequests[0]?.id);

  const pending = requests.filter((r) => r.status === "pending");
  const approved = requests.filter((r) => r.status === "approved");
  const rejected = requests.filter((r) => r.status === "rejected");

  const selected = requests.find((r) => r.id === selectedId);

  const handleApprove = (id: string) => {
    setRequests(
      requests.map((r) =>
        r.id === id ? { ...r, status: "approved" } : r
      )
    );
  };

  const handleReject = (id: string) => {
    setRequests(
      requests.map((r) =>
        r.id === id ? { ...r, status: "rejected" } : r
      )
    );
  };

  const getRiskColor = (
    level: "low" | "medium" | "high" | "critical"
  ) => {
    switch (level) {
      case "low":
        return "bg-green-100 text-green-700";
      case "medium":
        return "bg-yellow-100 text-yellow-700";
      case "high":
        return "bg-orange-100 text-orange-700";
      case "critical":
        return "bg-red-100 text-red-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case "approved":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "rejected":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
    }
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle className="text-base">Pending Approvals</CardTitle>
          <CardDescription>{pending.length} awaiting review</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {pending.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-8">No pending approvals</p>
            ) : (
              pending.map((request) => (
                <button
                  key={request.id}
                  onClick={() => setSelectedId(request.id)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition ${
                    selectedId === request.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium truncate">
                      {request.action.replace(/_/g, " ")}
                    </p>
                    <Badge className={getRiskColor(request.risk_level)}>
                      {request.risk_level.charAt(0).toUpperCase() +
                        request.risk_level.slice(1)}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 truncate">
                    {request.details.target}
                  </p>
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Approval Request Details</CardTitle>
          <CardDescription>Review before approving or rejecting</CardDescription>
        </CardHeader>
        <CardContent>
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-600">Action</p>
                  <p className="text-lg font-semibold">
                    {selected.action.replace(/_/g, " ").toUpperCase()}
                  </p>
                </div>
                <Badge className={getRiskColor(selected.risk_level)}>
                  {selected.risk_level} Risk
                </Badge>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Target</p>
                  <p className="font-semibold text-sm">{selected.details.target}</p>
                </div>

                {selected.details.amount && (
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Amount</p>
                    <p className="font-semibold text-sm">
                      ${selected.details.amount.toLocaleString()}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Reason</p>
                  <p className="text-sm text-gray-700">{selected.details.reason}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-blue-50 p-2 rounded">
                    <p className="text-gray-600">Requested</p>
                    <p className="font-semibold">
                      {new Date(selected.requested_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-2 rounded">
                    <p className="text-gray-600">Expires</p>
                    <p className="font-semibold">
                      {new Date(selected.expires_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>

              {selected.status === "pending" && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleApprove(selected.id)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleReject(selected.id)}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}

              {selected.status !== "pending" && (
                <div
                  className={`p-3 rounded-lg flex items-center gap-2 ${
                    selected.status === "approved"
                      ? "bg-green-50 text-green-900"
                      : "bg-red-50 text-red-900"
                  }`}
                >
                  {getStatusIcon(selected.status)}
                  <span className="text-sm font-medium">
                    {selected.status === "approved" ? "Approved" : "Rejected"}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No request selected
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="col-span-3">
        <CardHeader>
          <CardTitle className="text-sm">Approval History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {requests
              .filter((r) => r.status !== "pending")
              .map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-2 border rounded"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(request.status)}
                    <div>
                      <p className="text-sm font-medium">
                        {request.action.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-gray-500">
                        {request.details.target}
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={`${
                      request.status === "approved"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {request.status.charAt(0).toUpperCase() +
                      request.status.slice(1)}
                  </Badge>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
