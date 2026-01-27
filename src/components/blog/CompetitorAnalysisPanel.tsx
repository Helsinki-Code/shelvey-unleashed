import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Globe } from "lucide-react";

interface Competitor {
  domain: string;
  content_length: number;
  keywords: string[];
  backlinks: number;
  domain_authority: number;
  social_shares: number;
  advantage: string;
}

const mockCompetitors: Competitor[] = [
  {
    domain: "investopedia.com",
    content_length: 4200,
    keywords: ["trading", "investing", "portfolio"],
    backlinks: 2340,
    domain_authority: 84,
    social_shares: 15600,
    advantage: "Much higher domain authority",
  },
  {
    domain: "tradingview.com",
    content_length: 3800,
    keywords: ["technical analysis", "charting", "trading"],
    backlinks: 1890,
    domain_authority: 72,
    social_shares: 8900,
    advantage: "Better technical analysis coverage",
  },
  {
    domain: "seekingalpha.com",
    content_length: 2500,
    keywords: ["investing", "stocks", "analysis"],
    backlinks: 1450,
    domain_authority: 68,
    social_shares: 5600,
    advantage: "Larger author network",
  },
];

export function CompetitorAnalysisPanel() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Competitor Analysis
          </CardTitle>
          <CardDescription>
            Analyze and compare with top competitors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockCompetitors.map((competitor) => (
              <div
                key={competitor.domain}
                className="p-4 border rounded-lg hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{competitor.domain}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {competitor.content_length} avg words per post
                    </p>
                  </div>
                  <Badge className="bg-purple-100 text-purple-700">
                    DA: {competitor.domain_authority}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                  <div className="bg-blue-50 p-2 rounded">
                    <p className="text-gray-600">Backlinks</p>
                    <p className="font-semibold">{competitor.backlinks.toLocaleString()}</p>
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <p className="text-gray-600">Social Shares</p>
                    <p className="font-semibold">{(competitor.social_shares / 1000).toFixed(1)}k</p>
                  </div>
                  <div className="bg-orange-50 p-2 rounded">
                    <p className="text-gray-600">Top Keywords</p>
                    <p className="font-semibold">{competitor.keywords.length}</p>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-600 mb-1">
                    Featured Keywords:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {competitor.keywords.map((kw) => (
                      <Badge key={kw} variant="outline" className="text-xs">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="p-2 bg-yellow-50 border-l-2 border-yellow-500 text-xs text-yellow-800">
                  <TrendingUp className="w-3 h-3 inline mr-1" />
                  {competitor.advantage}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Competitive Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="p-3 bg-blue-50 rounded border-l-2 border-blue-500">
            <p className="text-sm font-medium text-blue-900">
              💡 Opportunity: Longer content (3000+ words) ranks better for your target keywords
            </p>
          </div>
          <div className="p-3 bg-purple-50 rounded border-l-2 border-purple-500">
            <p className="text-sm font-medium text-purple-900">
              🔗 Opportunity: Build backlinks from finance and investing sites (avg 1800 per competitor)
            </p>
          </div>
          <div className="p-3 bg-green-50 rounded border-l-2 border-green-500">
            <p className="text-sm font-medium text-green-900">
              📊 Strength: Your social media engagement is competitive with top sites
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
