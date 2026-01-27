import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Eye, Activity } from "lucide-react";

interface AnalyticsData {
  date: string;
  pageviews: number;
  sessions: number;
  users: number;
  bounce_rate: number;
  avg_session_duration: number;
}

const mockData: AnalyticsData[] = [
  {
    date: "2026-01-27",
    pageviews: 8540,
    sessions: 3420,
    users: 2890,
    bounce_rate: 28.5,
    avg_session_duration: 285,
  },
  {
    date: "2026-01-26",
    pageviews: 7890,
    sessions: 3120,
    users: 2650,
    bounce_rate: 32.1,
    avg_session_duration: 268,
  },
  {
    date: "2026-01-25",
    pageviews: 9120,
    sessions: 3680,
    users: 3120,
    bounce_rate: 25.3,
    avg_session_duration: 312,
  },
];

export function AnalyticsDashboard() {
  const totalPageviews = mockData.reduce((sum, d) => sum + d.pageviews, 0);
  const totalSessions = mockData.reduce((sum, d) => sum + d.sessions, 0);
  const totalUsers = mockData.reduce((sum, d) => sum + d.users, 0);
  const avgBounce = (
    mockData.reduce((sum, d) => sum + d.bounce_rate, 0) / mockData.length
  ).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Pageviews</p>
                <p className="text-2xl font-bold">{totalPageviews.toLocaleString()}</p>
              </div>
              <Eye className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Sessions</p>
                <p className="text-2xl font-bold">{totalSessions.toLocaleString()}</p>
              </div>
              <Activity className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Users</p>
                <p className="text-2xl font-bold">{totalUsers.toLocaleString()}</p>
              </div>
              <Users className="w-8 h-8 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Bounce Rate</p>
                <p className="text-2xl font-bold">{avgBounce}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily Analytics</CardTitle>
          <CardDescription>Last 3 days of traffic data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Date</th>
                  <th className="text-right p-2 font-medium">Pageviews</th>
                  <th className="text-right p-2 font-medium">Sessions</th>
                  <th className="text-right p-2 font-medium">Users</th>
                  <th className="text-right p-2 font-medium">Bounce Rate</th>
                  <th className="text-right p-2 font-medium">Avg Duration</th>
                </tr>
              </thead>
              <tbody>
                {mockData.map((d) => (
                  <tr key={d.date} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{d.date}</td>
                    <td className="text-right p-2">{d.pageviews.toLocaleString()}</td>
                    <td className="text-right p-2">{d.sessions.toLocaleString()}</td>
                    <td className="text-right p-2">{d.users.toLocaleString()}</td>
                    <td className="text-right p-2">{d.bounce_rate.toFixed(1)}%</td>
                    <td className="text-right p-2">{Math.round(d.avg_session_duration / 60)}m {d.avg_session_duration % 60}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Traffic Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { source: "Organic Search", sessions: 1850, percent: 54.2 },
              { source: "Direct Traffic", sessions: 940, percent: 27.5 },
              { source: "Social Media", sessions: 420, percent: 12.3 },
              { source: "Referral", sessions: 210, percent: 6.0 },
            ].map((item) => (
              <div key={item.source} className="flex items-center justify-between">
                <p className="text-sm font-medium">{item.source}</p>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 w-16 text-right">
                    {item.sessions}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
