import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertCircle, CheckCircle } from "lucide-react";

interface SEOMetric {
  keyword: string;
  rank: number;
  rank_change: number;
  search_volume: number;
  ctr: number;
  impressions: number;
  clicks: number;
}

const mockMetrics: SEOMetric[] = [
  {
    keyword: "trading strategies",
    rank: 3,
    rank_change: -1,
    search_volume: 15000,
    ctr: 8.5,
    impressions: 2400,
    clicks: 204,
  },
  {
    keyword: "automated trading",
    rank: 5,
    rank_change: 2,
    search_volume: 8900,
    ctr: 6.2,
    impressions: 1250,
    clicks: 78,
  },
  {
    keyword: "portfolio rebalancing",
    rank: 7,
    rank_change: -2,
    search_volume: 5200,
    ctr: 5.1,
    impressions: 890,
    clicks: 45,
  },
];

export function SEOMonitorDashboard() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            SEO Performance
          </CardTitle>
          <CardDescription>Keyword rankings and search performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 mb-4">
            <div className="flex justify-between">
              <p className="text-sm font-medium">Total Impressions</p>
              <p className="text-lg font-bold">4,540</p>
            </div>
            <div className="flex justify-between">
              <p className="text-sm font-medium">Total Clicks</p>
              <p className="text-lg font-bold">327</p>
            </div>
            <div className="flex justify-between">
              <p className="text-sm font-medium">Average CTR</p>
              <p className="text-lg font-bold">6.8%</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold text-sm mb-3">Top Keywords</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Keyword</th>
                    <th className="text-right p-2 font-medium">Rank</th>
                    <th className="text-right p-2 font-medium">Change</th>
                    <th className="text-right p-2 font-medium">Volume</th>
                    <th className="text-right p-2 font-medium">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {mockMetrics.map((metric) => (
                    <tr key={metric.keyword} className="border-b hover:bg-gray-50">
                      <td className="p-2">{metric.keyword}</td>
                      <td className="text-right p-2 font-semibold">#{metric.rank}</td>
                      <td className={`text-right p-2 ${metric.rank_change > 0 ? "text-red-600" : "text-green-600"}`}>
                        {metric.rank_change > 0 ? "↓" : "↑"} {Math.abs(metric.rank_change)}
                      </td>
                      <td className="text-right p-2">{(metric.search_volume / 1000).toFixed(1)}k</td>
                      <td className="text-right p-2">{metric.ctr.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">SEO Improvements Suggested</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-start gap-2 p-2 bg-yellow-50 rounded border border-yellow-200">
            <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-yellow-800">Expand "trading strategies" post to 2000+ words</p>
          </div>
          <div className="flex items-start gap-2 p-2 bg-green-50 rounded border border-green-200">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-green-800">Meta descriptions optimized</p>
          </div>
          <div className="flex items-start gap-2 p-2 bg-yellow-50 rounded border border-yellow-200">
            <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-yellow-800">Add internal links to portfolio rebalancing guide</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
