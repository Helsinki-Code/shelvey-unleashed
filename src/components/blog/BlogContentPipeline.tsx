import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const PIPELINE_STAGES = [
  { label: 'Ideation', count: 12, color: 'bg-blue-500' },
  { label: 'Research', count: 5, color: 'bg-purple-500' },
  { label: 'Writing', count: 8, color: 'bg-orange-500' },
  { label: 'Editing', count: 3, color: 'bg-yellow-500' },
  { label: 'SEO Review', count: 4, color: 'bg-green-500' },
  { label: 'Scheduled', count: 6, color: 'bg-primary' },
  { label: 'Published', count: 45, color: 'bg-emerald-500' },
];

export const BlogContentPipeline = () => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">📋 Content Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {PIPELINE_STAGES.map((stage, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-24 text-xs text-muted-foreground text-right">{stage.label}</div>
              <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden relative">
                <div
                  className={`h-full ${stage.color} rounded-full transition-all`}
                  style={{ width: `${Math.min((stage.count / 50) * 100, 100)}%` }}
                />
              </div>
              <Badge variant="outline" className="text-[10px] min-w-[32px] justify-center">
                {stage.count}
              </Badge>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">83</p>
              <p className="text-xs text-muted-foreground">Total in Pipeline</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-500">45</p>
              <p className="text-xs text-muted-foreground">Published</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-500">6</p>
              <p className="text-xs text-muted-foreground">Scheduled</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
