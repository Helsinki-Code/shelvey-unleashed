import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Link, TrendingUp } from "lucide-react";

interface Backlink {
  source: string;
  anchor_text: string;
  domain_authority: number;
  type: "editorial" | "guest_post" | "directory" | "lost";
  status: "active" | "lost" | "broken";
}

const mockBacklinks: Backlink[] = [
  {
    source: "techcrunch.com",
    anchor_text: "automated trading platform",
    domain_authority: 92,
    type: "editorial",
    status: "active",
  },
  {
    source: "forbes.com",
    anchor_text: "portfolio management guide",
    domain_authority: 88,
    type: "editorial",
    status: "active",
  },
  {
    source: "medium.com/finance",
    anchor_text: "ShelVey trading dashboard",
    domain_authority: 72,
    type: "guest_post",
    status: "active",
  },
  {
    source: "trading-resources.com",
    anchor_text: "see more trading guides",
    domain_authority: 48,
    type: "directory",
    status: "active",
  },
  {
    source: "oldsite.com/resources",
    anchor_text: "trading tool",
    domain_authority: 32,
    type: "guest_post",
    status: "lost",
  },
];

export function BacklinkMonitor() {
  const activeBacklinks = mockBacklinks.filter((b) => b.status === "active");
  const lostBacklinks = mockBacklinks.filter((b) => b.status === "lost");
  const avgDA = Math.round(
    activeBacklinks.reduce((sum, b) => sum + b.domain_authority, 0) /
      activeBacklinks.length
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Active Backlinks</p>
                <p className="text-2xl font-bold">{activeBacklinks.length}</p>
              </div>
              <Link className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Lost Backlinks</p>
                <p className="text-2xl font-bold">{lostBacklinks.length}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Avg Domain Authority</p>
                <p className="text-2xl font-bold">{avgDA}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Backlinks</CardTitle>
          <CardDescription>{activeBacklinks.length} quality backlinks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {activeBacklinks.map((link) => (
              <div key={link.source} className="p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{link.source}</p>
                    <p className="text-xs text-gray-600 italic">
                      "{link.anchor_text}"
                    </p>
                  </div>
                  <Badge className="bg-green-100 text-green-700 text-xs">
                    DA {link.domain_authority}
                  </Badge>
                </div>
                <div className="flex gap-2 text-xs">
                  <Badge variant="outline">
                    {link.type
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Badge>
                  <Badge className="bg-green-100 text-green-700">Active</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {lostBacklinks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lost Backlinks</CardTitle>
            <CardDescription>{lostBacklinks.length} backlinks removed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lostBacklinks.map((link) => (
                <div key={link.source} className="p-3 border border-red-200 rounded-lg bg-red-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{link.source}</p>
                      <p className="text-xs text-red-600">
                        "{link.anchor_text}"
                      </p>
                    </div>
                    <Badge className="bg-red-100 text-red-700">Lost</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Backlink Opportunities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            {
              site: "financeweekly.com",
              type: "Guest Post",
              da: 65,
            },
            {
              site: "investortoday.com",
              type: "Interview",
              da: 58,
            },
            {
              site: "tradingtips.org",
              type: "Resource Link",
              da: 52,
            },
          ].map((opp) => (
            <div key={opp.site} className="p-3 border rounded-lg hover:bg-blue-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{opp.site}</p>
                  <p className="text-xs text-gray-600">{opp.type}</p>
                </div>
                <Badge className="bg-blue-100 text-blue-700">DA {opp.da}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
