import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Rocket, Globe, Target } from 'lucide-react';

interface MissionStartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (url: string, goals: string) => void;
}

export function MissionStartDialog({ open, onOpenChange, onStart }: MissionStartDialogProps) {
  const [url, setUrl] = useState('');
  const [goals, setGoals] = useState('');

  const handleStart = () => {
    if (!url.trim()) return;
    let formatted = url.trim();
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = `https://${formatted}`;
    }
    onStart(formatted, goals || 'Rank this website on Google Search with high-quality SEO content');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Rocket className="h-5 w-5 text-primary" />
            Launch SEO Mission
          </DialogTitle>
          <DialogDescription>
            Deploy 13 AI agents to analyze, strategize, and generate SEO-optimized content for your website.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="url" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Target Website URL
            </Label>
            <Input
              id="url"
              placeholder="example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goals" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Mission Goals (optional)
            </Label>
            <Textarea
              id="goals"
              placeholder="E.g., Increase organic traffic for our SaaS product, target enterprise customers..."
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              rows={3}
            />
          </div>

          {/* Agent Preview */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
            <p className="text-xs font-medium mb-2">Mission Pipeline</p>
            <div className="flex flex-wrap gap-1 text-[10px]">
              {['🕷️ CRAWL', '🔑 KEYWORDS', '📊 SERP', '🏗️ STRATEGY', '✍️ WRITE', '🎨 IMAGES', '🔗 LINKS', '📈 MONITOR'].map((phase) => (
                <span key={phase} className="px-2 py-0.5 rounded bg-background border border-border">
                  {phase}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="flex-1 gap-2" onClick={handleStart} disabled={!url.trim()}>
            <Rocket className="h-4 w-4" />
            Deploy Agents
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
