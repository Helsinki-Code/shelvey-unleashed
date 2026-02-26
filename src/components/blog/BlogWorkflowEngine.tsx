import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BLOG_WORKFLOW_STEPS } from '@/lib/blog-empire-agents';

export const BlogWorkflowEngine = () => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">⚙️ Autonomous Content Workflow Engine</CardTitle>
          <Badge variant="outline" className="text-[10px] font-mono">24/7/365</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {BLOG_WORKFLOW_STEPS.map((step, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="flex flex-col items-center w-6">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  idx < 3 ? 'bg-primary/20 ring-2 ring-primary/40' : 'bg-muted'
                }`}>
                  {step.emoji}
                </div>
                {idx < BLOG_WORKFLOW_STEPS.length - 1 && (
                  <div className={`w-0.5 h-4 ${idx < 3 ? 'bg-primary/30' : 'bg-border'}`} />
                )}
              </div>
              <span className={`text-xs ${idx < 3 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {step.label}
              </span>
              {idx < 3 && <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse ml-auto" />}
            </div>
          ))}
          <div className="flex items-center gap-3 pt-1">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs">🔁</div>
            <span className="text-xs font-medium text-primary">REPEAT — 24/7/365</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
