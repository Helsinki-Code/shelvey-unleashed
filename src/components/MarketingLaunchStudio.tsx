import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Share2, Target, Users, BarChart3,
  Sparkles, Megaphone
} from 'lucide-react';
import { SocialCommandCenter } from './SocialCommandCenter';
import { PaidAdsHub } from './PaidAdsHub';
import { InfluencerPipeline } from './InfluencerPipeline';
import { MarketingAnalytics } from './MarketingAnalytics';

interface MarketingLaunchStudioProps {
  projectId: string;
  campaignId?: string;
  project: {
    name?: string;
    industry?: string;
    description?: string;
    target_market?: string;
  } | null;
}

const STUDIO_TABS = [
  { id: 'social', label: 'Social Media', icon: Share2, description: 'Social media campaigns' },
  { id: 'ads', label: 'Paid Ads', icon: Target, description: 'Ad creatives & campaigns' },
  { id: 'influencers', label: 'Influencers', icon: Users, description: 'Influencer partnerships' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Marketing performance' },
];

export function MarketingLaunchStudio({ projectId, campaignId, project }: MarketingLaunchStudioProps) {
  const [activeTab, setActiveTab] = useState('social');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-primary/20 bg-gradient-to-br from-pink-500/5 via-transparent to-rose-500/5 overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-gradient-to-r from-pink-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-r from-pink-500/10 to-rose-500/10">
                <Megaphone className="w-5 h-5 text-pink-500" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Marketing Launch Studio
                  <Badge variant="secondary" className="gap-1">
                    <Sparkles className="w-3 h-3" />
                    AI-Powered
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Complete marketing suite for {project?.name || 'your business'}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Tab Navigation */}
            <div className="border-b border-border/50 bg-muted/30 px-4 pt-4">
              <TabsList className="h-auto p-1 bg-background/80 backdrop-blur-sm w-full grid grid-cols-4 gap-1">
                {STUDIO_TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="flex flex-col gap-1 py-3 px-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-rose-500 data-[state=active]:text-white"
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
              <TabsContent value="social" className="m-0">
                <SocialCommandCenter
                  projectId={projectId}
                  campaignId={campaignId}
                />
              </TabsContent>

              <TabsContent value="ads" className="m-0">
                <PaidAdsHub
                  projectId={projectId}
                  campaignId={campaignId}
                />
              </TabsContent>

              <TabsContent value="influencers" className="m-0">
                <InfluencerPipeline
                  projectId={projectId}
                />
              </TabsContent>

              <TabsContent value="analytics" className="m-0">
                <MarketingAnalytics
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

export default MarketingLaunchStudio;