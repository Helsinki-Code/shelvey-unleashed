import { useState } from 'react';
import { Globe, Target, ArrowRight, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface WarRoomEntryProps {
  onStart: (url: string, goals: string) => void;
  className?: string;
}

export function WarRoomEntry({ onStart, className }: WarRoomEntryProps) {
  const [url, setUrl] = useState('');
  const [goals, setGoals] = useState('');
  const [showGoals, setShowGoals] = useState(false);

  const handleStart = () => {
    if (!url.trim()) return;
    let formatted = url.trim();
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = `https://${formatted}`;
    }
    onStart(formatted, goals);
  };

  return (
    <div className={cn("flex items-center justify-center min-h-[70vh]", className)}>
      <div className="w-full max-w-2xl space-y-8 px-4">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            16 AI Agents Standing By
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            SEO Agent <span className="text-primary">War Room</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Enter your website URL and watch 16 specialized AI agents autonomously analyze, strategize, and create content — all in real-time.
          </p>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardContent className="p-6 space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter your website URL..."
                  className="pl-11 h-12 text-base"
                  onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                />
              </div>
              <Button onClick={handleStart} disabled={!url.trim()} size="lg" className="h-12 px-6 gap-2">
                Launch <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            {!showGoals ? (
              <button
                onClick={() => setShowGoals(true)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <Target className="w-3 h-3" /> Add specific goals (optional)
              </button>
            ) : (
              <Textarea
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="e.g., Rank for 'best AI tools 2026', increase organic traffic by 50%, target SaaS decision-makers..."
                className="min-h-[80px] text-sm"
              />
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          {[
            { label: 'Crawl & Analyze', desc: 'Site structure, content, tech issues' },
            { label: 'Research & Strategize', desc: 'Keywords, SERP, content plan' },
            { label: 'Write & Optimize', desc: '3,000+ word SEO articles' },
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
