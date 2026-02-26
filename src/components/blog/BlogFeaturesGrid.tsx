import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BLOG_FEATURES } from '@/lib/blog-empire-agents';

export const BlogFeaturesGrid = () => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">🔥 Key Features & Capabilities</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {BLOG_FEATURES.map((f, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
              <span className="text-xl">{f.icon}</span>
              <div>
                <p className="text-sm font-medium">{f.feature}</p>
                <p className="text-xs text-muted-foreground">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
