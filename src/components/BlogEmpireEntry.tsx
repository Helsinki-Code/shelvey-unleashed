import { useState } from 'react';
import { Globe, Target, ArrowRight, Sparkles, Zap, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface BlogEmpireEntryProps {
  onStartAnalysis: (url: string, goals: string) => void;
  onStartAutoBuild: (data: {
    topic: string;
    niche: string;
    platform: string;
    goals: string;
  }) => void;
  className?: string;
}

export function BlogEmpireEntry({ onStartAnalysis, onStartAutoBuild, className }: BlogEmpireEntryProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [pathType, setPathType] = useState<'existing' | 'autobuild' | null>(null);
  
  // URL path state
  const [url, setUrl] = useState('');
  const [urlGoals, setUrlGoals] = useState('');
  
  // Auto-build path state
  const [topic, setTopic] = useState('');
  const [niche, setNiche] = useState('');
  const [platform, setPlatform] = useState('');
  const [buildGoals, setBuildGoals] = useState('');

  const handlePathSelection = (type: 'existing' | 'autobuild') => {
    setPathType(type);
    setStep(2);
  };

  const handleStartAnalysis = () => {
    if (!url.trim()) return;
    let formatted = url.trim();
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = `https://${formatted}`;
    }
    onStartAnalysis(formatted, urlGoals);
  };

  const handleStartAutoBuild = () => {
    if (!topic.trim() || !niche.trim() || !platform) return;
    onStartAutoBuild({
      topic: topic.trim(),
      niche: niche.trim(),
      platform,
      goals: buildGoals.trim()
    });
  };

  const goBack = () => {
    if (step === 2) {
      setStep(1);
      setPathType(null);
    }
  };

  if (step === 1) {
    return (
      <div className={cn("flex items-center justify-center min-h-[70vh]", className)}>
        <div className="w-full max-w-3xl space-y-8 px-4">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              16 AI Agents Ready
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Blog <span className="text-primary">Empire</span> Builder
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Choose your path to building an autonomous content empire
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Existing Website Path */}
            <Card className="border-border/50 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer group" 
                  onClick={() => handlePathSelection('existing')}>
              <CardContent className="p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Globe className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">I Have a Website</h3>
                    <p className="text-sm text-muted-foreground">Optimize existing site</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <p className="text-muted-foreground">
                    Enter your website URL and watch AI agents analyze, strategize, and create SEO-optimized content in real-time.
                  </p>
                  
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <span>Complete SEO audit & analysis</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-secondary"></div>
                    <span>Keyword research & strategy</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-accent"></div>
                    <span>Continuous content creation</span>
                  </div>
                </div>
                </div>
                
                <Button className="w-full gap-2 group-hover:gap-3 transition-all">
                  Analyze My Site <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Auto-Build Path */}
            <Card className="border-border/50 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer group"
                  onClick={() => handlePathSelection('autobuild')}>
              <CardContent className="p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Build From Topic</h3>
                    <p className="text-sm text-muted-foreground">Full auto-generated site</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <p className="text-muted-foreground">
                    Just give us a topic and watch AI agents build, deploy, and operate a complete blog empire 24/7.
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span>Complete website generation</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span>Auto-deploy to custom domain</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <span>24/7 autonomous operation</span>
                    </div>
                  </div>
                </div>
                
                <Button className="w-full gap-2 group-hover:gap-3 transition-all">
                  Build My Empire <Plus className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Form based on selected path
  return (
    <div className={cn("flex items-center justify-center min-h-[70vh]", className)}>
      <div className="w-full max-w-2xl space-y-8 px-4">
        <div className="text-center space-y-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={goBack}
            className="mb-4"
          >
            ← Back to Options
          </Button>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            {pathType === 'existing' ? <Globe className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
            {pathType === 'existing' ? 'Analyze Existing Site' : 'Auto-Build Blog Empire'}
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {pathType === 'existing' ? 'Enter Your Website Details' : 'Describe Your Blog Empire'}
          </h1>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardContent className="p-6 space-y-6">
            {pathType === 'existing' ? (
              // URL Path Form
              <>
                <div className="space-y-2">
                  <Label htmlFor="url">Website URL</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="Enter your website URL..."
                      className="pl-11 h-12 text-base"
                      onKeyDown={(e) => e.key === 'Enter' && handleStartAnalysis()}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="goals">SEO Goals (Optional)</Label>
                  <Textarea
                    id="goals"
                    value={urlGoals}
                    onChange={(e) => setUrlGoals(e.target.value)}
                    placeholder="e.g., Rank for 'best AI tools 2026', increase organic traffic by 50%, target SaaS decision-makers..."
                    className="min-h-[80px] text-sm"
                  />
                </div>

                <Button 
                  onClick={handleStartAnalysis} 
                  disabled={!url.trim()} 
                  size="lg" 
                  className="w-full h-12 gap-2"
                >
                  Launch SEO War Room <ArrowRight className="w-4 h-4" />
                </Button>
              </>
            ) : (
              // Auto-Build Path Form
              <>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="topic">Blog Topic</Label>
                    <Input
                      id="topic"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g., AI Tools, Personal Finance, Health & Wellness..."
                      className="h-12 text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="niche">Target Niche</Label>
                    <Input
                      id="niche"
                      value={niche}
                      onChange={(e) => setNiche(e.target.value)}
                      placeholder="e.g., SaaS entrepreneurs, fitness enthusiasts, crypto investors..."
                      className="h-12 text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="platform">Primary Publishing Platform</Label>
                    <Select value={platform} onValueChange={setPlatform}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Choose publishing platform..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="wordpress">WordPress</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="ghost">Ghost</SelectItem>
                        <SelectItem value="custom">Custom Website</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="build-goals">Business Goals (Optional)</Label>
                    <Textarea
                      id="build-goals"
                      value={buildGoals}
                      onChange={(e) => setBuildGoals(e.target.value)}
                      placeholder="e.g., Generate $10k/month through affiliate marketing, build email list to 50k subscribers, establish thought leadership..."
                      className="min-h-[80px] text-sm"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleStartAutoBuild} 
                  disabled={!topic.trim() || !niche.trim() || !platform} 
                  size="lg" 
                  className="w-full h-12 gap-2"
                >
                  Build My Blog Empire <Zap className="w-4 h-4" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          {pathType === 'existing' ? [
            { label: 'Crawl & Analyze', desc: 'Site structure, content, tech issues' },
            { label: 'Research & Strategize', desc: 'Keywords, SERP, content plan' },
            { label: 'Write & Optimize', desc: '3,000+ word SEO articles' },
          ] : [
            { label: 'Generate & Deploy', desc: 'Complete website in minutes' },
            { label: 'Content Strategy', desc: 'SEO-optimized article pipeline' },
            { label: '24/7 Autopilot', desc: 'Autonomous content creation' },
          ].map((item, i) => (
            <div key={i} className="p-3 rounded-lg border border-border/50">
              <p className="font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
