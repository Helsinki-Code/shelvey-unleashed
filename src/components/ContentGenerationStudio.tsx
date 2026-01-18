import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Target, Type, Newspaper, Share2, Search, 
  Sparkles, PenTool
} from 'lucide-react';
import ContentStrategyBuilder from './ContentStrategyBuilder';
import WebsiteCopyGenerator from './WebsiteCopyGenerator';
import BlogArticleGenerator from './BlogArticleGenerator';
import SocialContentFactory from './SocialContentFactory';
import SEODashboard from './SEODashboard';

interface ContentGenerationStudioProps {
  projectId: string;
  project: {
    name?: string;
    industry?: string;
    description?: string;
    target_market?: string;
  } | null;
}

const STUDIO_TABS = [
  { id: 'strategy', label: 'Strategy', icon: Target, description: 'Content strategy & planning' },
  { id: 'copy', label: 'Website Copy', icon: Type, description: 'Landing page copy' },
  { id: 'blog', label: 'Blog Articles', icon: Newspaper, description: 'SEO blog posts' },
  { id: 'social', label: 'Social Media', icon: Share2, description: 'Social content' },
  { id: 'seo', label: 'SEO', icon: Search, description: 'SEO optimization' },
];

export function ContentGenerationStudio({ projectId, project }: ContentGenerationStudioProps) {
  const [activeTab, setActiveTab] = useState('strategy');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <PenTool className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Content Generation Studio
                  <Badge variant="secondary" className="gap-1">
                    <Sparkles className="w-3 h-3" />
                    AI-Powered
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Complete content creation suite for {project?.name || 'your business'}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Tab Navigation */}
            <div className="border-b border-border/50 bg-muted/30 px-4 pt-4">
              <TabsList className="h-auto p-1 bg-background/80 backdrop-blur-sm w-full grid grid-cols-5 gap-1">
                {STUDIO_TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="flex flex-col gap-1 py-3 px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-xs font-medium">{tab.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              <TabsContent value="strategy" className="m-0">
                <ContentStrategyBuilder
                  projectId={projectId}
                  businessName={project?.name}
                  industry={project?.industry}
                />
              </TabsContent>

              <TabsContent value="copy" className="m-0">
                <WebsiteCopyGenerator
                  projectId={projectId}
                  businessName={project?.name}
                  industry={project?.industry}
                />
              </TabsContent>

              <TabsContent value="blog" className="m-0">
                <BlogArticleGenerator
                  projectId={projectId}
                  businessName={project?.name}
                  industry={project?.industry}
                />
              </TabsContent>

              <TabsContent value="social" className="m-0">
                <SocialContentFactory
                  projectId={projectId}
                  businessName={project?.name}
                  industry={project?.industry}
                />
              </TabsContent>

              <TabsContent value="seo" className="m-0">
                <SEODashboard
                  projectId={projectId}
                />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default ContentGenerationStudio;
