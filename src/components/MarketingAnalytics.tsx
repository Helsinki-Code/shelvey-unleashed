import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Target, 
  BarChart3,
  PieChart,
  Activity,
  Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MarketingAnalyticsProps {
  projectId: string;
}

interface AnalyticsData {
  totalCampaigns: number;
  activeCampaigns: number;
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  totalPosts: number;
  publishedPosts: number;
  scheduledPosts: number;
}

export function MarketingAnalytics({ projectId }: MarketingAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [projectId]);

  const loadAnalytics = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const { data, error } = await supabase.functions.invoke('marketing-campaign-manager', {
        body: {
          action: 'get_analytics',
          userId: user?.id,
          projectId
        }
      });

      if (!error && data?.data) {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const spendProgress = analytics?.totalBudget 
    ? (analytics.totalSpent / analytics.totalBudget) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Budget</p>
                <p className="text-2xl font-bold">
                  ${analytics?.totalBudget?.toLocaleString() || 0}
                </p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Spent: ${analytics?.totalSpent?.toLocaleString() || 0}</span>
                <span>{spendProgress.toFixed(0)}%</span>
              </div>
              <Progress value={spendProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Campaigns</p>
                <p className="text-2xl font-bold">{analytics?.activeCampaigns || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-green-500/10">
                <Zap className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              of {analytics?.totalCampaigns || 0} total campaigns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Published Posts</p>
                <p className="text-2xl font-bold">{analytics?.publishedPosts || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/10">
                <Activity className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {analytics?.scheduledPosts || 0} scheduled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Remaining Budget</p>
                <p className="text-2xl font-bold">
                  ${analytics?.remainingBudget?.toLocaleString() || 0}
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-500/10">
                <Target className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Channel Performance
            </CardTitle>
            <CardDescription>
              Performance metrics by marketing channel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'Social Media', value: 0, change: 0, color: 'bg-blue-500' },
                { name: 'Paid Ads', value: 0, change: 0, color: 'bg-purple-500' },
                { name: 'Influencer', value: 0, change: 0, color: 'bg-pink-500' },
                { name: 'Email', value: 0, change: 0, color: 'bg-green-500' },
              ].map((channel) => (
                <div key={channel.name} className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${channel.color}`} />
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{channel.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">${channel.value}</span>
                        <Badge 
                          variant={channel.change >= 0 ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {channel.change >= 0 ? (
                            <TrendingUp className="h-3 w-3 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 mr-1" />
                          )}
                          {channel.change}%
                        </Badge>
                      </div>
                    </div>
                    <Progress value={0} className="h-2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Budget Allocation
            </CardTitle>
            <CardDescription>
              How your marketing budget is distributed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-[200px]">
              <div className="text-center text-muted-foreground">
                <PieChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Budget allocation chart will appear</p>
                <p className="text-sm">once campaigns are created</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Marketing Funnel</CardTitle>
          <CardDescription>
            Track your audience journey from awareness to conversion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            {[
              { stage: 'Impressions', value: 0, color: 'bg-blue-500' },
              { stage: 'Clicks', value: 0, color: 'bg-purple-500' },
              { stage: 'Leads', value: 0, color: 'bg-orange-500' },
              { stage: 'Conversions', value: 0, color: 'bg-green-500' },
            ].map((stage, index) => (
              <div key={stage.stage} className="flex-1 text-center">
                <div 
                  className={`h-24 ${stage.color} rounded-t-lg flex items-center justify-center`}
                  style={{ 
                    clipPath: 'polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%)',
                    opacity: 1 - (index * 0.15)
                  }}
                >
                  <span className="text-white font-bold text-xl">{stage.value}</span>
                </div>
                <p className="mt-2 text-sm font-medium">{stage.stage}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
