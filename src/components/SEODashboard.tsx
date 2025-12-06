import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Search, TrendingUp, TrendingDown, Minus, Globe, Target, Loader2, Plus, BarChart3, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SEODashboardProps {
  projectId: string;
  domain?: string;
}

export default function SEODashboard({ projectId, domain }: SEODashboardProps) {
  const [loading, setLoading] = useState(false);
  const [siteAnalysis, setSiteAnalysis] = useState<any>(null);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [competitors, setCompetitors] = useState<any>(null);

  const analyzeSite = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('seo-analyzer', {
        body: { 
          action: 'analyze_site',
          projectId,
          domain: domain || 'example.com'
        }
      });

      if (error) throw error;
      setSiteAnalysis(data.result);
      toast.success("Site analysis complete!");
    } catch (error: any) {
      toast.error(error.message || "Failed to analyze site");
    } finally {
      setLoading(false);
    }
  };

  const trackKeyword = async () => {
    if (!newKeyword.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('seo-analyzer', {
        body: { 
          action: 'track_keywords',
          projectId,
          domain,
          keywords: [newKeyword.trim()]
        }
      });

      if (error) throw error;
      
      const newKeywords = Array.isArray(data.result) ? data.result : [data.result];
      setKeywords(prev => [...prev, ...newKeywords]);
      setNewKeyword('');
      toast.success("Keyword added!");
    } catch (error: any) {
      toast.error(error.message || "Failed to track keyword");
    } finally {
      setLoading(false);
    }
  };

  const analyzeCompetitors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('seo-analyzer', {
        body: { 
          action: 'competitor_analysis',
          projectId,
          domain
        }
      });

      if (error) throw error;
      setCompetitors(data.result);
      toast.success("Competitor analysis complete!");
    } catch (error: any) {
      toast.error(error.message || "Failed to analyze competitors");
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend?.toLowerCase()) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Search className="h-6 w-6" />
            SEO Dashboard
          </h2>
          <p className="text-muted-foreground">Monitor and optimize your search engine performance</p>
        </div>
        <Button onClick={analyzeSite} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Globe className="h-4 w-4 mr-2" />}
          Analyze Site
        </Button>
      </div>

      {/* Overview Cards */}
      {siteAnalysis && (
        <div className="grid md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className={`text-3xl font-bold ${getScoreColor(siteAnalysis.overallScore)}`}>
                {siteAnalysis.overallScore}
              </div>
              <div className="text-sm text-muted-foreground">Overall Score</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className={`text-3xl font-bold ${getScoreColor(siteAnalysis.technicalSeo?.score)}`}>
                {siteAnalysis.technicalSeo?.score || 0}
              </div>
              <div className="text-sm text-muted-foreground">Technical</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className={`text-3xl font-bold ${getScoreColor(siteAnalysis.onPageSeo?.score)}`}>
                {siteAnalysis.onPageSeo?.score || 0}
              </div>
              <div className="text-sm text-muted-foreground">On-Page</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className={`text-3xl font-bold ${getScoreColor(siteAnalysis.contentQuality?.score)}`}>
                {siteAnalysis.contentQuality?.score || 0}
              </div>
              <div className="text-sm text-muted-foreground">Content</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className={`text-3xl font-bold ${getScoreColor(siteAnalysis.userExperience?.score)}`}>
                {siteAnalysis.userExperience?.score || 0}
              </div>
              <div className="text-sm text-muted-foreground">UX</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="keywords" className="space-y-4">
        <TabsList>
          <TabsTrigger value="keywords" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Keywords
          </TabsTrigger>
          <TabsTrigger value="issues" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Issues
          </TabsTrigger>
          <TabsTrigger value="competitors" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Competitors
          </TabsTrigger>
        </TabsList>

        <TabsContent value="keywords">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Keyword Tracking</span>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Add keyword..."
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    className="w-64"
                    onKeyDown={(e) => e.key === 'Enter' && trackKeyword()}
                  />
                  <Button size="icon" onClick={trackKeyword} disabled={loading}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {keywords.length > 0 ? (
                <div className="space-y-3">
                  {keywords.map((kw: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-4">
                        {getTrendIcon(kw.trend)}
                        <div>
                          <div className="font-medium">{kw.keyword}</div>
                          <div className="text-sm text-muted-foreground">
                            {kw.contentSuggestion?.slice(0, 60)}...
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-bold">{kw.estimatedPosition || 'N/A'}</div>
                          <div className="text-xs text-muted-foreground">Position</div>
                        </div>
                        <Badge variant={kw.difficulty > 70 ? "destructive" : kw.difficulty > 40 ? "secondary" : "default"}>
                          Diff: {kw.difficulty}
                        </Badge>
                        <Badge variant="outline">{kw.searchVolume}</Badge>
                        <Badge>{kw.priority}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Add keywords to start tracking their rankings</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues">
          <Card>
            <CardHeader>
              <CardTitle>SEO Issues & Recommendations</CardTitle>
              <CardDescription>Priority fixes and quick wins</CardDescription>
            </CardHeader>
            <CardContent>
              {siteAnalysis ? (
                <div className="space-y-6">
                  {/* Priority Fixes */}
                  {siteAnalysis.priorityFixes && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Badge variant="destructive">Priority</Badge>
                        Critical Fixes
                      </h4>
                      <ul className="space-y-2">
                        {siteAnalysis.priorityFixes.map((fix: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2 p-3 bg-red-500/10 rounded-lg">
                            <div className="h-2 w-2 rounded-full bg-red-500 mt-2" />
                            <span>{fix}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Quick Wins */}
                  {siteAnalysis.quickWins && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Badge variant="secondary">Quick Wins</Badge>
                        Easy Improvements
                      </h4>
                      <ul className="space-y-2">
                        {siteAnalysis.quickWins.map((win: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2 p-3 bg-green-500/10 rounded-lg">
                            <div className="h-2 w-2 rounded-full bg-green-500 mt-2" />
                            <span>{win}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Category Issues */}
                  {['technicalSeo', 'onPageSeo', 'contentQuality'].map((category) => (
                    siteAnalysis[category]?.issues?.length > 0 && (
                      <div key={category}>
                        <h4 className="font-medium mb-3 capitalize">{category.replace(/([A-Z])/g, ' $1')}</h4>
                        <div className="space-y-2">
                          {siteAnalysis[category].issues.map((issue: string, idx: number) => (
                            <div key={idx} className="p-3 bg-muted rounded-lg text-sm">
                              {issue}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Run a site analysis to see issues and recommendations</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competitors">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Competitor Analysis</span>
                <Button onClick={analyzeCompetitors} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Users className="h-4 w-4 mr-2" />}
                  Analyze Competitors
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {competitors ? (
                <div className="space-y-6">
                  {/* Competitor Cards */}
                  {competitors.competitors?.map((comp: any, idx: number) => (
                    <div key={idx} className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{comp.name}</h4>
                        <div className="flex gap-2">
                          <Badge variant="outline">DA: {comp.domainAuthority}</Badge>
                          <Badge variant="secondary">{comp.estimatedTraffic}</Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {comp.topKeywords?.slice(0, 5).map((kw: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">{kw}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Content Gaps */}
                  {competitors.contentGaps && (
                    <div>
                      <h4 className="font-medium mb-3">Content Gaps (Opportunities)</h4>
                      <div className="grid md:grid-cols-2 gap-2">
                        {competitors.contentGaps.map((gap: string, idx: number) => (
                          <div key={idx} className="p-3 bg-green-500/10 rounded-lg text-sm">
                            {gap}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Strategic Recommendations */}
                  {competitors.strategicRecommendations && (
                    <div>
                      <h4 className="font-medium mb-3">Strategic Recommendations</h4>
                      <ul className="space-y-2">
                        {competitors.strategicRecommendations.map((rec: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <TrendingUp className="h-4 w-4 text-primary mt-0.5" />
                            <span className="text-sm">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Click "Analyze Competitors" to see competitive insights</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
