import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Globe, Lightbulb, Rocket, ArrowRight, Loader2, Zap, Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BlogEmpireEntryProps {
  onMissionStart: (sessionId: string) => void;
}

const AGENTS = [
  '🕷️ Crawler', '🔑 Keywords', '📊 SERP', '📋 Strategy',
  '✍️ Writer', '🎨 Images', '🔗 Links', '📈 Monitor',
  '📉 Analytics', '⚡ Optimizer', '🔮 Indexer', '🔍 Validator', '🎯 Orchestrator',
];

export function BlogEmpireEntry({ onMissionStart }: BlogEmpireEntryProps) {
  const [tab, setTab] = useState<'url' | 'topic'>('url');
  const [url, setUrl] = useState('');
  const [topic, setTopic] = useState('');
  const [niche, setNiche] = useState('');
  const [goals, setGoals] = useState('');
  const [loading, setLoading] = useState(false);
  const [buildingStatus, setBuildingStatus] = useState('');

  const handleLaunchURL = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      let formatted = url.trim();
      if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
        formatted = `https://${formatted}`;
      }
      const { data, error } = await supabase.functions.invoke('seo-war-room', {
        body: { action: 'start_mission', url: formatted, goals: goals || 'Rank this website #1 on Google with high-quality SEO content' },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast.success('Mission launched! 13 agents deploying...');
      onMissionStart(data.sessionId);
    } catch (err) {
      toast.error('Failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchTopic = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      // Step 1: Create blog project
      setBuildingStatus('Creating blog project...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please sign in first');

      const { data: project, error: projErr } = await supabase
        .from('blog_projects')
        .insert({
          name: `${topic} Blog`,
          niche: niche || topic,
          platform: 'custom',
          status: 'building',
          user_id: user.id,
          auto_generated: true,
          metadata: { topic, niche, goals } as any,
        })
        .select()
        .single();
      if (projErr) throw projErr;

      // Step 2: Build & deploy the website
      setBuildingStatus('AI agents building your website...');
      const { data: buildData, error: buildErr } = await supabase.functions.invoke('blog-website-builder', {
        body: {
          topic,
          niche: niche || topic,
          platform: 'custom',
          goals: goals || `Build authority in ${topic}`,
          projectId: project.id,
          userId: user.id,
        },
      });

      if (buildErr) {
        console.error('Build error (continuing):', buildErr);
      }

      const websiteUrl = buildData?.websiteUrl || `https://${topic.toLowerCase().replace(/\s+/g, '-')}-blog.vercel.app`;

      // Step 3: Launch SEO war room on the deployed site
      setBuildingStatus('Deploying SEO agents to your new site...');
      const { data, error } = await supabase.functions.invoke('seo-war-room', {
        body: {
          action: 'start_mission',
          url: websiteUrl,
          goals: goals || `Rank ${topic} blog on Google, build authority in ${niche || topic} space, drive organic traffic 24/7`,
          projectId: project.id,
          entryType: 'topic',
          topic,
          niche: niche || topic,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      toast.success('Blog built & agents deployed! Running 24/7 autopilot.');
      onMissionStart(data.sessionId);
    } catch (err) {
      toast.error('Failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
      setBuildingStatus('');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <Card className="w-full max-w-2xl bg-card/80 backdrop-blur border-border/50">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Bot className="h-7 w-7 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Blog Empire</CardTitle>
          <CardDescription className="text-base">
            13 AI agents work 24/7 to build, optimize, and grow your blog on autopilot.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'url' | 'topic')}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="url" className="gap-2">
                <Globe className="h-4 w-4" />
                I Have a Website
              </TabsTrigger>
              <TabsTrigger value="topic" className="gap-2">
                <Lightbulb className="h-4 w-4" />
                Build From Scratch
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="space-y-4">
              <div className="space-y-2">
                <Label>Website URL</Label>
                <Input
                  placeholder="example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="font-mono text-base h-12"
                />
                <p className="text-xs text-muted-foreground">Enter your existing website. Our agents will crawl it with real web scraping, analyze it, and start optimizing.</p>
              </div>
              <div className="space-y-2">
                <Label>Goals (optional)</Label>
                <Textarea
                  placeholder="E.g., Rank for SaaS keywords, drive enterprise leads..."
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  rows={2}
                />
              </div>
              <Button className="w-full h-12 gap-2 text-base" onClick={handleLaunchURL} disabled={!url.trim() || loading}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Rocket className="h-5 w-5" />}
                {loading ? 'Deploying Agents...' : 'Deploy 13 SEO Agents'}
              </Button>
            </TabsContent>

            <TabsContent value="topic" className="space-y-4">
              <div className="space-y-2">
                <Label>Blog Topic</Label>
                <Input
                  placeholder="E.g., AI Tools, Fitness, Personal Finance..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="text-base h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>Niche (optional)</Label>
                <Input
                  placeholder="E.g., Beginners, Enterprise, Health-conscious millennials..."
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Goals (optional)</Label>
                <Textarea
                  placeholder="E.g., Monetize with ads, build email list, affiliate revenue..."
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  rows={2}
                />
              </div>
              {buildingStatus && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm font-medium text-primary">{buildingStatus}</span>
                </div>
              )}
              <Button className="w-full h-12 gap-2 text-base" onClick={handleLaunchTopic} disabled={!topic.trim() || loading}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
                {loading ? buildingStatus || 'Building...' : 'Build Blog & Deploy Agents'}
              </Button>
            </TabsContent>
          </Tabs>

          {/* Agent preview */}
          <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border/30">
            <p className="text-xs font-medium text-muted-foreground mb-2">YOUR AI WORKFORCE</p>
            <div className="flex flex-wrap gap-1.5">
              {AGENTS.map((agent) => (
                <Badge key={agent} variant="outline" className="text-[11px] py-0.5">
                  {agent}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              These agents work autonomously 24/7 — crawling, researching, writing, optimizing, and monitoring your blog with zero downtime.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
