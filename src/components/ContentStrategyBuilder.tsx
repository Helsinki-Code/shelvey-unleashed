import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Lightbulb, Target, TrendingUp, Loader2, Plus, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ContentStrategyBuilderProps {
  projectId: string;
  businessName?: string;
  industry?: string;
}

export default function ContentStrategyBuilder({ projectId, businessName, industry }: ContentStrategyBuilderProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("strategy");
  const [strategy, setStrategy] = useState<any>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [calendar, setCalendar] = useState<any[]>([]);

  const generateStrategy = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('content-strategy-generator', {
        body: { 
          action: 'generate_strategy',
          projectId,
          businessName,
          industry
        }
      });

      if (error) throw error;
      setStrategy(data.result);
      toast.success("Content strategy generated!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate strategy");
    } finally {
      setLoading(false);
    }
  };

  const suggestTopics = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('content-strategy-generator', {
        body: { 
          action: 'suggest_topics',
          projectId,
          businessName,
          industry
        }
      });

      if (error) throw error;
      setTopics(Array.isArray(data.result) ? data.result : []);
      toast.success("Topic ideas generated!");
    } catch (error: any) {
      toast.error(error.message || "Failed to suggest topics");
    } finally {
      setLoading(false);
    }
  };

  const createCalendar = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('content-strategy-generator', {
        body: { 
          action: 'create_calendar',
          projectId,
          businessName,
          industry,
          duration: '30',
          pillars: strategy?.pillars?.map((p: any) => p.name) || []
        }
      });

      if (error) throw error;
      setCalendar(Array.isArray(data.result) ? data.result : []);
      toast.success("Content calendar created!");
    } catch (error: any) {
      toast.error(error.message || "Failed to create calendar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="strategy" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Strategy
          </TabsTrigger>
          <TabsTrigger value="topics" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Topic Ideas
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="strategy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Content Strategy</span>
                <Button onClick={generateStrategy} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <TrendingUp className="h-4 w-4 mr-2" />}
                  Generate Strategy
                </Button>
              </CardTitle>
              <CardDescription>
                AI-powered 90-day content strategy tailored to your business
              </CardDescription>
            </CardHeader>
            <CardContent>
              {strategy ? (
                <div className="space-y-6">
                  {/* Content Pillars */}
                  <div>
                    <h3 className="font-semibold mb-3">Content Pillars</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      {strategy.pillars?.map((pillar: any, idx: number) => (
                        <Card key={idx} className="bg-muted/50">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg">{pillar.name}</CardTitle>
                            <CardDescription>{pillar.description}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-wrap gap-1">
                              {pillar.topics?.slice(0, 4).map((topic: string, i: number) => (
                                <Badge key={i} variant="secondary">{topic}</Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Content Mix */}
                  {strategy.contentMix && (
                    <div>
                      <h3 className="font-semibold mb-3">Content Mix</h3>
                      <div className="grid grid-cols-4 gap-4">
                        {Object.entries(strategy.contentMix).map(([type, percentage]) => (
                          <div key={type} className="text-center p-4 bg-muted rounded-lg">
                            <div className="text-2xl font-bold text-primary">{String(percentage)}%</div>
                            <div className="text-sm text-muted-foreground capitalize">{type}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key Messages */}
                  {strategy.keyMessages && (
                    <div>
                      <h3 className="font-semibold mb-3">Key Messages</h3>
                      <ul className="space-y-2">
                        {strategy.keyMessages.map((msg: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                            <span>{msg}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* KPIs */}
                  {strategy.kpis && (
                    <div>
                      <h3 className="font-semibold mb-3">Goals & KPIs</h3>
                      <div className="grid md:grid-cols-2 gap-3">
                        {strategy.kpis.map((kpi: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                            <span>{kpi.metric}</span>
                            <Badge>{kpi.target}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Click "Generate Strategy" to create your content strategy</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="topics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Topic Ideas</span>
                <Button onClick={suggestTopics} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lightbulb className="h-4 w-4 mr-2" />}
                  Generate Ideas
                </Button>
              </CardTitle>
              <CardDescription>
                AI-generated content topics optimized for your audience
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topics.length > 0 ? (
                <div className="grid gap-3">
                  {topics.map((topic: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                      <div className="flex-1">
                        <h4 className="font-medium">{topic.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{topic.type}</Badge>
                          <Badge variant="secondary">{topic.keyword}</Badge>
                          <span className="text-xs text-muted-foreground">
                            Vol: {topic.searchVolume} • Diff: {topic.difficulty}
                          </span>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Click "Generate Ideas" to get topic suggestions</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Content Calendar</span>
                <Button onClick={createCalendar} disabled={loading || !strategy}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calendar className="h-4 w-4 mr-2" />}
                  Create Calendar
                </Button>
              </CardTitle>
              <CardDescription>
                30-day content schedule based on your strategy
              </CardDescription>
            </CardHeader>
            <CardContent>
              {calendar.length > 0 ? (
                <div className="grid gap-2">
                  {calendar.slice(0, 14).map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary">
                        Day {item.day}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{item.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{item.type}</Badge>
                          {item.platforms?.map((p: string) => (
                            <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                          ))}
                        </div>
                      </div>
                      <Badge>{item.pillar}</Badge>
                    </div>
                  ))}
                  {calendar.length > 14 && (
                    <p className="text-center text-sm text-muted-foreground">
                      + {calendar.length - 14} more days
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{strategy ? "Click 'Create Calendar' to generate your schedule" : "Generate a strategy first"}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
