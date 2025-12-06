import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { FileText, Sparkles, Loader2, Copy, Download, ListTree, Search, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BlogArticleGeneratorProps {
  projectId: string;
  businessName?: string;
  industry?: string;
  brandVoice?: string;
}

export default function BlogArticleGenerator({ projectId, businessName, industry, brandVoice }: BlogArticleGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [wordCount, setWordCount] = useState([1500]);
  const [outline, setOutline] = useState<any>(null);
  const [article, setArticle] = useState('');
  const [seoAnalysis, setSeoAnalysis] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('outline');

  const generateOutline = async () => {
    if (!topic) {
      toast.error("Please enter a topic");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('blog-generator', {
        body: { 
          action: 'generate_outline',
          topic,
          keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
          businessName,
          industry,
          brandVoice
        }
      });

      if (error) throw error;
      setOutline(data.result);
      toast.success("Outline generated!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate outline");
    } finally {
      setLoading(false);
    }
  };

  const generateArticle = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('blog-generator', {
        body: { 
          action: 'generate_article',
          topic,
          keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
          businessName,
          industry,
          brandVoice,
          targetLength: wordCount[0],
          outline
        }
      });

      if (error) throw error;
      setArticle(data.result?.article || '');
      setActiveTab('article');
      toast.success("Article generated!");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate article");
    } finally {
      setLoading(false);
    }
  };

  const analyzeSEO = async () => {
    if (!article) {
      toast.error("Generate an article first");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('blog-generator', {
        body: { 
          action: 'optimize_seo',
          content: article,
          keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
          businessName
        }
      });

      if (error) throw error;
      setSeoAnalysis(data.result);
      setActiveTab('seo');
      toast.success("SEO analysis complete!");
    } catch (error: any) {
      toast.error(error.message || "Failed to analyze SEO");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(article);
    toast.success("Article copied to clipboard!");
  };

  const downloadArticle = () => {
    const blob = new Blob([article], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${topic.replace(/\s+/g, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Article downloaded!");
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Blog Article Generator
          </CardTitle>
          <CardDescription>
            Create SEO-optimized blog articles with AI assistance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Topic / Title</label>
              <Input 
                placeholder="e.g., How to Start a Sustainable Business in 2024"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Keywords (comma separated)</label>
              <Input 
                placeholder="e.g., sustainable business, eco-friendly, green startup"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Target Word Count: {wordCount[0]}</label>
            <Slider 
              value={wordCount}
              onValueChange={setWordCount}
              min={500}
              max={5000}
              step={100}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>500 (Short)</span>
              <span>2500 (Medium)</span>
              <span>5000 (Long-form)</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={generateOutline} disabled={loading || !topic}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ListTree className="h-4 w-4 mr-2" />}
              Generate Outline
            </Button>
            <Button onClick={generateArticle} disabled={loading || !outline} variant="secondary">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Generate Full Article
            </Button>
            <Button onClick={analyzeSEO} disabled={loading || !article} variant="outline">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              Analyze SEO
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Output Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="outline" disabled={!outline}>
            <ListTree className="h-4 w-4 mr-2" />
            Outline
          </TabsTrigger>
          <TabsTrigger value="article" disabled={!article}>
            <FileText className="h-4 w-4 mr-2" />
            Article
          </TabsTrigger>
          <TabsTrigger value="seo" disabled={!seoAnalysis}>
            <Search className="h-4 w-4 mr-2" />
            SEO Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="outline">
          {outline && (
            <Card>
              <CardHeader>
                <CardTitle>{outline.title}</CardTitle>
                <CardDescription>{outline.metaDescription}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Introduction</h4>
                  <p className="text-muted-foreground">{outline.introduction}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Sections</h4>
                  <div className="space-y-3">
                    {outline.sections?.map((section: any, idx: number) => (
                      <div key={idx} className="pl-4 border-l-2 border-primary">
                        <h5 className="font-medium">{section.heading}</h5>
                        {section.subheadings?.map((sub: string, i: number) => (
                          <div key={i} className="text-sm text-muted-foreground ml-4">• {sub}</div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Conclusion & CTA</h4>
                  <p className="text-muted-foreground">{outline.conclusion}</p>
                  <Badge className="mt-2">{outline.cta}</Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="article">
          {article && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Generated Article</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={copyToClipboard}>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                    <Button size="sm" variant="outline" onClick={downloadArticle}>
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none max-h-[600px] overflow-y-auto whitespace-pre-wrap">
                  {article}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="seo">
          {seoAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>SEO Analysis</span>
                  <Badge variant={seoAnalysis.seoScore >= 80 ? "default" : seoAnalysis.seoScore >= 60 ? "secondary" : "destructive"}>
                    Score: {seoAnalysis.seoScore}/100
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Score Cards */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Readability Score</div>
                    <div className="text-2xl font-bold">{seoAnalysis.readabilityScore || 'N/A'}</div>
                    <div className="text-sm">{seoAnalysis.readabilityGrade}</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Heading Structure</div>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline">H1: {seoAnalysis.headingAnalysis?.h1 || 0}</Badge>
                      <Badge variant="outline">H2: {seoAnalysis.headingAnalysis?.h2 || 0}</Badge>
                      <Badge variant="outline">H3: {seoAnalysis.headingAnalysis?.h3 || 0}</Badge>
                    </div>
                  </div>
                </div>

                {/* Keyword Density */}
                {seoAnalysis.keywordDensity && (
                  <div>
                    <h4 className="font-medium mb-2">Keyword Density</h4>
                    <div className="space-y-2">
                      {seoAnalysis.keywordDensity.map((kd: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                          <span>{kd.keyword}</span>
                          <div className="flex gap-2">
                            <Badge variant="secondary">{kd.count} times</Badge>
                            <Badge>{kd.percentage?.toFixed(1)}%</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Improvements */}
                {seoAnalysis.improvements && (
                  <div>
                    <h4 className="font-medium mb-2">Recommended Improvements</h4>
                    <ul className="space-y-2">
                      {seoAnalysis.improvements.map((imp: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <span>{imp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Meta Description */}
                {seoAnalysis.metaDescription && (
                  <div>
                    <h4 className="font-medium mb-2">Suggested Meta Description</h4>
                    <p className="text-sm p-3 bg-muted rounded">{seoAnalysis.metaDescription}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
