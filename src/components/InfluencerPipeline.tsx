import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Search, 
  Users, 
  MessageSquare,
  DollarSign,
  TrendingUp,
  Instagram,
  Loader2,
  Mail,
  UserPlus,
  CheckCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InfluencerPipelineProps {
  projectId: string;
}

interface Influencer {
  id: string;
  influencer_name: string;
  platform: string;
  handle: string;
  follower_count: number;
  engagement_rate: number;
  niche: string;
  status: string;
  contract_value: number | null;
}

const pipelineStages = [
  { id: 'discovered', label: 'Discovered', color: 'bg-gray-500' },
  { id: 'contacted', label: 'Contacted', color: 'bg-blue-500' },
  { id: 'negotiating', label: 'Negotiating', color: 'bg-yellow-500' },
  { id: 'contracted', label: 'Contracted', color: 'bg-purple-500' },
  { id: 'active', label: 'Active', color: 'bg-green-500' },
];

export function InfluencerPipeline({ projectId }: InfluencerPipelineProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [pipeline, setPipeline] = useState<Record<string, Influencer[]>>({});
  const [searchParams, setSearchParams] = useState({
    niche: '',
    platform: 'Instagram',
    followerRange: '10K-100K'
  });

  useEffect(() => {
    loadPipeline();
  }, [projectId]);

  const loadPipeline = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const { data, error } = await supabase.functions.invoke('influencer-discovery', {
        body: {
          action: 'get_pipeline',
          userId: user?.id,
          projectId
        }
      });

      if (error) throw error;
      if (data?.data) {
        setPipeline(data.data);
      }
    } catch (error) {
      console.error('Failed to load pipeline:', error);
    }
  };

  const discoverInfluencers = async () => {
    if (!searchParams.niche) {
      toast.error("Please enter a niche to search");
      return;
    }

    setIsSearching(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const { data, error } = await supabase.functions.invoke('influencer-discovery', {
        body: {
          action: 'discover',
          userId: user?.id,
          projectId,
          params: searchParams
        }
      });

      if (error) throw error;
      
      toast.success(`Discovered ${data?.data?.discovered || 0} influencers!`);
      loadPipeline();
    } catch (error) {
      console.error('Discovery error:', error);
      toast.error("Failed to discover influencers");
    } finally {
      setIsSearching(false);
    }
  };

  const updateStatus = async (influencerId: string, newStatus: string) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      await supabase.functions.invoke('influencer-discovery', {
        body: {
          action: 'update_status',
          userId: user?.id,
          projectId,
          params: { influencerId, status: newStatus }
        }
      });
      
      toast.success("Status updated!");
      loadPipeline();
    } catch (error) {
      console.error('Update error:', error);
      toast.error("Failed to update status");
    }
  };

  const formatFollowers = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const totalInfluencers = Object.values(pipeline).flat().length;
  const totalContractValue = Object.values(pipeline).flat()
    .reduce((sum, i) => sum + (i.contract_value || 0), 0);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="pipeline" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="discover">Discover</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="metrics">ROI Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Find Influencers
              </CardTitle>
              <CardDescription>
                AI-powered influencer discovery based on your niche and requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Niche/Industry</Label>
                  <Input
                    value={searchParams.niche}
                    onChange={(e) => setSearchParams({...searchParams, niche: e.target.value})}
                    placeholder="e.g., Sustainable fashion, Fitness, Tech"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select 
                    value={searchParams.platform} 
                    onValueChange={(v) => setSearchParams({...searchParams, platform: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Instagram">Instagram</SelectItem>
                      <SelectItem value="TikTok">TikTok</SelectItem>
                      <SelectItem value="YouTube">YouTube</SelectItem>
                      <SelectItem value="Twitter">Twitter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Follower Range</Label>
                  <Select 
                    value={searchParams.followerRange} 
                    onValueChange={(v) => setSearchParams({...searchParams, followerRange: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1K-10K">Nano (1K-10K)</SelectItem>
                      <SelectItem value="10K-100K">Micro (10K-100K)</SelectItem>
                      <SelectItem value="100K-500K">Mid-tier (100K-500K)</SelectItem>
                      <SelectItem value="500K-1M">Macro (500K-1M)</SelectItem>
                      <SelectItem value="1M+">Mega (1M+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                className="w-full" 
                onClick={discoverInfluencers}
                disabled={isSearching}
              >
                {isSearching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Discover Influencers
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline">
          <div className="grid grid-cols-5 gap-4">
            {pipelineStages.map((stage) => (
              <Card key={stage.id} className="min-h-[400px]">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{stage.label}</CardTitle>
                    <Badge variant="secondary">
                      {pipeline[stage.id]?.length || 0}
                    </Badge>
                  </div>
                  <div className={`h-1 w-full rounded ${stage.color}`} />
                </CardHeader>
                <CardContent className="p-2">
                  <ScrollArea className="h-[350px]">
                    <div className="space-y-2">
                      {(pipeline[stage.id] || []).map((influencer) => (
                        <Card key={influencer.id} className="p-3 cursor-pointer hover:bg-muted/50">
                          <div className="flex items-start gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {influencer.influencer_name?.charAt(0) || 'I'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {influencer.influencer_name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                @{influencer.handle}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {formatFollowers(influencer.follower_count)}
                                </Badge>
                                {influencer.engagement_rate && (
                                  <Badge variant="outline" className="text-xs">
                                    {influencer.engagement_rate}%
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Quick actions */}
                          <div className="flex gap-1 mt-2">
                            {stage.id === 'discovered' && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 px-2 text-xs"
                                onClick={() => updateStatus(influencer.id, 'contacted')}
                              >
                                <Mail className="h-3 w-3 mr-1" />
                                Contact
                              </Button>
                            )}
                            {stage.id === 'contacted' && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 px-2 text-xs"
                                onClick={() => updateStatus(influencer.id, 'negotiating')}
                              >
                                <MessageSquare className="h-3 w-3 mr-1" />
                                Negotiate
                              </Button>
                            )}
                            {stage.id === 'negotiating' && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 px-2 text-xs"
                                onClick={() => updateStatus(influencer.id, 'contracted')}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Contract
                              </Button>
                            )}
                          </div>
                        </Card>
                      ))}
                      
                      {(!pipeline[stage.id] || pipeline[stage.id].length === 0) && (
                        <div className="text-center py-8 text-muted-foreground text-xs">
                          No influencers
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="metrics">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalInfluencers}</p>
                    <p className="text-sm text-muted-foreground">Total Influencers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-green-500/10">
                    <UserPlus className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {(pipeline.contracted?.length || 0) + (pipeline.active?.length || 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Active Partnerships</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-purple-500/10">
                    <DollarSign className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      ${totalContractValue.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Investment</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-orange-500/10">
                    <TrendingUp className="h-6 w-6 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">0x</p>
                    <p className="text-sm text-muted-foreground">Estimated ROI</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>ROI tracking will appear once influencers start posting</p>
                <p className="text-sm">Track conversions with promo codes and UTM links</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
