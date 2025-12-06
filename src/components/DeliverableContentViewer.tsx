import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, ChevronDown, ChevronUp, Check, Clock, 
  Eye, ThumbsUp, ThumbsDown, Loader2, Code, Bot, Zap,
  Star, AlertTriangle, RefreshCw, MessageSquare
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';

interface CEOReview {
  source: string;
  type?: string;
  feedback: string;
  quality_score?: number;
  strengths?: string[];
  improvements?: string[];
  approved: boolean;
  timestamp: string;
}

interface GeneratedContent {
  executive_summary?: string;
  key_findings?: string[];
  recommendations?: string[];
  market_size?: string;
  growth_rate?: string;
  competitors?: Array<{ name: string; strengths?: string; weaknesses?: string }>;
  trends?: string[];
  opportunities?: string[];
  risks?: string[];
  detailed_analysis?: Record<string, any>;
  [key: string]: any;
}

interface AgentActivity {
  agent_name: string;
  action: string;
  status: string;
  timestamp: string;
}

interface DeliverableContentViewerProps {
  deliverable: {
    id: string;
    name: string;
    status: string;
    deliverable_type: string;
    generated_content?: any;
    description?: string | null;
    assigned_agent_id?: string | null;
    feedback_history?: CEOReview[];
    ceo_approved?: boolean;
    user_approved?: boolean;
    phase_id?: string;
  };
  projectId?: string;
  onApprove?: (id: string) => void;
  onReject?: (id: string, feedback: string) => void;
  onRefresh?: () => void;
}

// Convert "Title Case Keys" to snake_case
const normalizeKeys = (obj: any): GeneratedContent => {
  if (!obj || typeof obj !== 'object') return {};
  
  const keyMap: Record<string, string> = {
    'Executive Summary': 'executive_summary',
    'Key Findings': 'key_findings',
    'Recommendations': 'recommendations',
    'Market Size': 'market_size',
    'Growth Rate': 'growth_rate',
    'Competitors': 'competitors',
    'Trends': 'trends',
    'Opportunities': 'opportunities',
    'Risks': 'risks',
    'Detailed Analysis': 'detailed_analysis',
    'Target Demographics': 'target_demographics',
    'Consumer Behavior': 'consumer_behavior',
    'Marketing Channels': 'marketing_channels',
    'Pricing Strategy': 'pricing_strategy',
  };

  const normalized: GeneratedContent = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const normalizedKey = keyMap[key] || key.toLowerCase().replace(/\s+/g, '_');
    normalized[normalizedKey] = value;
  }
  
  return normalized;
};

// Sanitize JSON string by escaping control characters
const sanitizeJsonString = (str: string): string => {
  // Replace unescaped control characters with their escaped versions
  return str
    .replace(/[\x00-\x1F\x7F]/g, (char) => {
      const code = char.charCodeAt(0);
      switch (code) {
        case 8: return '\\b';
        case 9: return '\\t';
        case 10: return '\\n';
        case 12: return '\\f';
        case 13: return '\\r';
        default: return `\\u${code.toString(16).padStart(4, '0')}`;
      }
    });
};

// Parse generated_content handling various formats
const parseGeneratedContent = (rawContent: any): GeneratedContent | null => {
  if (!rawContent) return null;
  
  try {
    // If content has a 'report' wrapper, extract it
    let contentStr = rawContent.report || rawContent;
    
    // If it's already an object with expected keys, normalize and return
    if (typeof contentStr === 'object' && !Array.isArray(contentStr)) {
      return normalizeKeys(contentStr);
    }
    
    // If it's a string, try to extract JSON from markdown code block
    if (typeof contentStr === 'string') {
      // Remove markdown code block wrapper: ```json ... ```
      const jsonMatch = contentStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          // Sanitize the JSON string before parsing
          const sanitized = sanitizeJsonString(jsonMatch[1].trim());
          const parsed = JSON.parse(sanitized);
          return normalizeKeys(parsed);
        } catch (e) {
          // If JSON parsing still fails, try returning the content as text
          console.warn('Failed to parse JSON from code block, treating as text');
          return { executive_summary: jsonMatch[1].trim() };
        }
      }
      
      // Try direct JSON parse with sanitization
      try {
        const sanitized = sanitizeJsonString(contentStr);
        const parsed = JSON.parse(sanitized);
        return normalizeKeys(parsed);
      } catch (e) {
        // Not JSON, return as executive summary
        return { executive_summary: contentStr };
      }
    }
    
    return null;
  } catch (e) {
    console.error('Error parsing generated content:', e);
    return null;
  }
};

// Render any array of strings as a list
const renderStringList = (items: string[] | undefined, icon: string, color: string) => {
  if (!items || items.length === 0) return null;
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
          <span className={color}>{icon}</span>
          <span>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
        </li>
      ))}
    </ul>
  );
};

// Render detailed analysis sections
const renderDetailedAnalysis = (analysis: Record<string, any> | undefined) => {
  if (!analysis || typeof analysis !== 'object') return null;
  
  return (
    <div className="space-y-3">
      {Object.entries(analysis).map(([section, content]) => (
        <div key={section} className="p-3 rounded-lg bg-muted/30 border">
          <h5 className="font-medium text-sm capitalize mb-2">
            {section.replace(/_/g, ' ')}
          </h5>
          {typeof content === 'string' ? (
            <p className="text-sm text-muted-foreground">{content}</p>
          ) : Array.isArray(content) ? (
            <ul className="space-y-1">
              {content.map((item, i) => (
                <li key={i} className="text-sm text-muted-foreground">• {typeof item === 'string' ? item : JSON.stringify(item)}</li>
              ))}
            </ul>
          ) : (
            <pre className="text-xs text-muted-foreground overflow-auto">
              {JSON.stringify(content, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
};

export const DeliverableContentViewer = ({ 
  deliverable, 
  projectId,
  onApprove, 
  onReject,
  onRefresh,
}: DeliverableContentViewerProps) => {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [agentActivity, setAgentActivity] = useState<AgentActivity | null>(null);
  const [isAgentWorking, setIsAgentWorking] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [userFeedback, setUserFeedback] = useState('');
  
  // Parse the content
  const content = parseGeneratedContent(deliverable.generated_content);
  
  // Get latest CEO review from feedback_history
  const ceoReview = deliverable.feedback_history?.find(
    (f) => f.source === 'CEO Agent' && f.type === 'ceo_review'
  ) || deliverable.feedback_history?.find(f => f.source === 'CEO Agent');

  // Handle regeneration with CEO feedback
  const handleRegenerate = async () => {
    if (!projectId) {
      toast({
        title: 'Error',
        description: 'Project ID not available for regeneration',
        variant: 'destructive',
      });
      return;
    }

    setIsRegenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-deliverable', {
        body: {
          deliverableId: deliverable.id,
          deliverableType: deliverable.deliverable_type,
          projectId,
          previousFeedback: ceoReview ? {
            feedback: ceoReview.feedback,
            quality_score: ceoReview.quality_score,
            improvements: ceoReview.improvements,
          } : undefined,
        },
      });

      if (error) throw error;

      toast({
        title: 'Regeneration Started',
        description: 'The agent is re-working this deliverable with CEO feedback.',
      });

      onRefresh?.();
    } catch (error) {
      console.error('Regeneration error:', error);
      toast({
        title: 'Regeneration Failed',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  // Subscribe to real-time agent activity for this deliverable
  useEffect(() => {
    // Only track if deliverable is in progress
    if (deliverable.status !== 'in_progress' && deliverable.status !== 'pending') {
      setIsAgentWorking(false);
      return;
    }

    // Fetch recent activity for this deliverable
    const fetchRecentActivity = async () => {
      const { data } = await supabase
        .from('agent_activity_logs')
        .select('*')
        .ilike('metadata->>deliverable_id', deliverable.id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (data && data.length > 0) {
        const activity = data[0];
        setAgentActivity({
          agent_name: activity.agent_name,
          action: activity.action,
          status: activity.status,
          timestamp: activity.created_at,
        });
        setIsAgentWorking(activity.status === 'working' || activity.status === 'in_progress');
      }
    };

    fetchRecentActivity();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`deliverable-activity-${deliverable.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_activity_logs',
        },
        (payload) => {
          const newActivity = payload.new as any;
          // Check if this activity is for our deliverable
          if (newActivity.metadata?.deliverable_id === deliverable.id || 
              newActivity.metadata?.deliverable_name === deliverable.name) {
            setAgentActivity({
              agent_name: newActivity.agent_name,
              action: newActivity.action,
              status: newActivity.status,
              timestamp: newActivity.created_at,
            });
            setIsAgentWorking(newActivity.status === 'working' || newActivity.status === 'in_progress');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deliverable.id, deliverable.name, deliverable.status]);

  const getStatusBadge = () => {
    switch (deliverable.status) {
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-500">Approved</Badge>;
      case 'review':
        return <Badge className="bg-amber-500/20 text-amber-500">Ready for Review</Badge>;
      case 'revision_requested':
        return <Badge className="bg-red-500/20 text-red-500">Revision Requested</Badge>;
      case 'in_progress':
        return <Badge className="bg-primary/20 text-primary">In Progress</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  // Render CEO Review Panel
  const renderCEOReviewPanel = () => {
    if (!ceoReview) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-4 rounded-lg border mb-4 ${
          ceoReview.approved 
            ? 'bg-green-500/10 border-green-500/30' 
            : 'bg-amber-500/10 border-amber-500/30'
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <span className="font-semibold text-sm">CEO Agent Review</span>
          </div>
          <div className="flex items-center gap-2">
            {ceoReview.quality_score !== undefined && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium">{ceoReview.quality_score}/10</span>
              </div>
            )}
            {ceoReview.approved ? (
              <Badge className="bg-green-500/20 text-green-500">
                <Check className="w-3 h-3 mr-1" />
                Approved
              </Badge>
            ) : (
              <Badge className="bg-amber-500/20 text-amber-500">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Needs Revision
              </Badge>
            )}
          </div>
        </div>

        {/* CEO Comment */}
        <div className="mb-3">
          <p className="text-sm text-muted-foreground italic">"{ceoReview.feedback}"</p>
        </div>

        {/* Strengths */}
        {ceoReview.strengths && ceoReview.strengths.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-green-500 mb-1">Strengths</p>
            <ul className="space-y-1">
              {ceoReview.strengths.map((strength, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                  <span className="text-green-500">✓</span>
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Improvements */}
        {ceoReview.improvements && ceoReview.improvements.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-amber-500 mb-1">Improvements Needed</p>
            <ul className="space-y-1">
              {ceoReview.improvements.map((improvement, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                  <span className="text-amber-500">→</span>
                  {improvement}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Regenerate Button when CEO rejected */}
        {!ceoReview.approved && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleRegenerate();
            }}
            disabled={isRegenerating}
            size="sm"
            className="w-full mt-2"
            variant="outline"
          >
            {isRegenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Regenerate with CEO Feedback
          </Button>
        )}

        <p className="text-xs text-muted-foreground mt-2">
          Reviewed {new Date(ceoReview.timestamp).toLocaleString()}
        </p>
      </motion.div>
    );
  };

  const hasContent = content && Object.keys(content).length > 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader 
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {deliverable.status === 'approved' ? (
              <Check className="w-5 h-5 text-green-500" />
            ) : deliverable.status === 'in_progress' ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            ) : deliverable.status === 'review' ? (
              <Eye className="w-5 h-5 text-amber-500" />
            ) : (
              <Clock className="w-5 h-5 text-muted-foreground" />
            )}
            <div className="flex-1">
              <CardTitle className="text-base">{deliverable.name}</CardTitle>
              {deliverable.description && (
                <p className="text-sm text-muted-foreground mt-1">{deliverable.description}</p>
              )}
              {/* Real-time Agent Activity Indicator */}
              <AnimatePresence>
                {(isAgentWorking || agentActivity) && deliverable.status === 'in_progress' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2 mt-2 p-2 rounded-md bg-primary/10 border border-primary/20"
                  >
                    <div className="relative">
                      <Bot className="w-4 h-4 text-primary" />
                      {isAgentWorking && (
                        <motion.div
                          className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-500"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ repeat: Infinity, duration: 1 }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-primary truncate">
                        {agentActivity?.agent_name || 'Agent'} is working
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        <Zap className="w-3 h-3 inline mr-1" />
                        {agentActivity?.action || 'Processing...'}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-primary"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                      />
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-primary"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                      />
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-primary"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
        >
          <CardContent className="pt-0 border-t">
            {/* CEO Review Panel - Always show if there's a CEO review */}
            {renderCEOReviewPanel()}
            
            {!hasContent ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Content is being generated...</p>
                {agentActivity && (
                  <div className="mt-3 p-3 rounded-lg bg-muted/50 max-w-xs mx-auto">
                    <div className="flex items-center justify-center gap-2">
                      <Bot className="w-4 h-4 text-primary animate-pulse" />
                      <span className="text-sm font-medium">{agentActivity.agent_name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{agentActivity.action}</p>
                  </div>
                )}
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-4 py-4">
                  {/* Brand Assets - Logo, Icon, Banner */}
                  {(content.assets || content.primaryLogo || content.generatedImages) && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        🎨 Brand Assets
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {/* Primary Logo */}
                        {(content.primaryLogo?.imageUrl || content.assets?.find((a: any) => a.type === 'logo')?.imageUrl) && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Logo</p>
                            <div className="aspect-square rounded-lg border bg-muted/30 overflow-hidden">
                              <img 
                                src={content.primaryLogo?.imageUrl || content.assets?.find((a: any) => a.type === 'logo')?.imageUrl}
                                alt="Brand Logo"
                                className="w-full h-full object-contain"
                              />
                            </div>
                          </div>
                        )}
                        {/* App Icon */}
                        {(content.appIcon?.imageUrl || content.assets?.find((a: any) => a.type === 'icon')?.imageUrl) && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">App Icon</p>
                            <div className="aspect-square rounded-lg border bg-muted/30 overflow-hidden">
                              <img 
                                src={content.appIcon?.imageUrl || content.assets?.find((a: any) => a.type === 'icon')?.imageUrl}
                                alt="App Icon"
                                className="w-full h-full object-contain"
                              />
                            </div>
                          </div>
                        )}
                        {/* Social Banner */}
                        {(content.socialBanner?.imageUrl || content.assets?.find((a: any) => a.type === 'banner')?.imageUrl) && (
                          <div className="space-y-2 col-span-2 md:col-span-1">
                            <p className="text-xs font-medium text-muted-foreground">Social Banner</p>
                            <div className="aspect-video rounded-lg border bg-muted/30 overflow-hidden">
                              <img 
                                src={content.socialBanner?.imageUrl || content.assets?.find((a: any) => a.type === 'banner')?.imageUrl}
                                alt="Social Banner"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                        )}
                        {/* Generated Images from Lovable AI */}
                        {content.generatedImages?.map((img: any, idx: number) => (
                          <div key={img.id || idx} className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground capitalize">{img.type || 'Asset'}</p>
                            <div className="aspect-square rounded-lg border bg-muted/30 overflow-hidden">
                              <img 
                                src={img.url || img.imageUrl}
                                alt={img.type || 'Brand Asset'}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      {content.assetCount && (
                        <p className="text-xs text-muted-foreground">
                          Generated {content.assetCount} assets based on approved brand strategy
                        </p>
                      )}
                    </div>
                  )}

                  {/* Executive Summary */}
                  {content.executive_summary && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        📋 Executive Summary
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {content.executive_summary}
                      </p>
                    </div>
                  )}

                  {/* Key Findings */}
                  {content.key_findings && content.key_findings.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        🔍 Key Findings
                      </h4>
                      {renderStringList(content.key_findings, '•', 'text-primary')}
                    </div>
                  )}

                  {/* Market Size & Growth */}
                  {(content.market_size || content.growth_rate) && (
                    <div className="grid grid-cols-2 gap-4">
                      {content.market_size && (
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Market Size</p>
                          <p className="font-semibold text-primary">{content.market_size}</p>
                        </div>
                      )}
                      {content.growth_rate && (
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Growth Rate</p>
                          <p className="font-semibold text-green-500">{content.growth_rate}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Competitors */}
                  {content.competitors && content.competitors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        🏢 Competitors
                      </h4>
                      <div className="space-y-2">
                        {content.competitors.map((comp, i) => (
                          <div key={i} className="p-3 rounded-lg bg-muted/30 border">
                            <p className="font-medium text-sm">{typeof comp === 'string' ? comp : comp.name}</p>
                            {typeof comp === 'object' && comp.strengths && (
                              <p className="text-xs text-muted-foreground mt-1">
                                <span className="text-green-500">Strengths:</span> {comp.strengths}
                              </p>
                            )}
                            {typeof comp === 'object' && comp.weaknesses && (
                              <p className="text-xs text-muted-foreground">
                                <span className="text-red-500">Weaknesses:</span> {comp.weaknesses}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trends */}
                  {content.trends && content.trends.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        📈 Trends
                      </h4>
                      {renderStringList(content.trends, '↗', 'text-cyan-500')}
                    </div>
                  )}

                  {/* Recommendations */}
                  {content.recommendations && content.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        💡 Recommendations
                      </h4>
                      <ul className="space-y-1">
                        {content.recommendations.map((rec, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-amber-500">{i + 1}.</span>
                            <span>{typeof rec === 'string' ? rec : JSON.stringify(rec)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Opportunities */}
                  {content.opportunities && content.opportunities.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        🎯 Opportunities
                      </h4>
                      {renderStringList(content.opportunities, '✓', 'text-green-500')}
                    </div>
                  )}

                  {/* Risks */}
                  {content.risks && content.risks.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        ⚠️ Risks
                      </h4>
                      {renderStringList(content.risks, '!', 'text-red-500')}
                    </div>
                  )}

                  {/* Detailed Analysis */}
                  {content.detailed_analysis && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        📊 Detailed Analysis
                      </h4>
                      {renderDetailedAnalysis(content.detailed_analysis)}
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}

            {/* Action Buttons */}
            {hasContent && deliverable.status === 'review' && (
              <div className="flex gap-2 pt-4 border-t mt-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => onReject?.(deliverable.id, '')}
                >
                  <ThumbsDown className="w-4 h-4 mr-2" />
                  Request Changes
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => onApprove?.(deliverable.id)}
                >
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </div>
            )}

            {/* View Full Report Dialog */}
            {hasContent && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full mt-2">
                    <Eye className="w-4 h-4 mr-2" />
                    View Full Report
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{deliverable.name}</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    {/* Executive Summary */}
                    {content.executive_summary && (
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          📋 Executive Summary
                        </h3>
                        <p className="text-muted-foreground leading-relaxed">
                          {content.executive_summary}
                        </p>
                      </div>
                    )}

                    {/* Market Metrics */}
                    {(content.market_size || content.growth_rate) && (
                      <div className="grid grid-cols-2 gap-4">
                        {content.market_size && (
                          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                            <p className="text-sm text-muted-foreground">Market Size</p>
                            <p className="text-xl font-bold text-primary">{content.market_size}</p>
                          </div>
                        )}
                        {content.growth_rate && (
                          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                            <p className="text-sm text-muted-foreground">Growth Rate</p>
                            <p className="text-xl font-bold text-green-500">{content.growth_rate}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Key Findings */}
                    {content.key_findings && content.key_findings.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          🔍 Key Findings
                        </h3>
                        <ul className="space-y-2">
                          {content.key_findings.map((finding, i) => (
                            <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                              <span className="text-primary font-bold">{i + 1}.</span>
                              <span className="text-muted-foreground">{typeof finding === 'string' ? finding : JSON.stringify(finding)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Competitors */}
                    {content.competitors && content.competitors.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          🏢 Competitive Landscape
                        </h3>
                        <div className="grid gap-3">
                          {content.competitors.map((comp, i) => (
                            <div key={i} className="p-4 rounded-lg border bg-card">
                              <p className="font-semibold">{typeof comp === 'string' ? comp : comp.name}</p>
                              {typeof comp === 'object' && (
                                <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                                  {comp.strengths && (
                                    <div>
                                      <p className="text-green-500 font-medium">Strengths</p>
                                      <p className="text-muted-foreground">{comp.strengths}</p>
                                    </div>
                                  )}
                                  {comp.weaknesses && (
                                    <div>
                                      <p className="text-red-500 font-medium">Weaknesses</p>
                                      <p className="text-muted-foreground">{comp.weaknesses}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Trends */}
                    {content.trends && content.trends.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          📈 Market Trends
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {content.trends.map((trend, i) => (
                            <Badge key={i} variant="secondary" className="px-3 py-1">
                              ↗ {typeof trend === 'string' ? trend : JSON.stringify(trend)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {content.recommendations && content.recommendations.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          💡 Recommendations
                        </h3>
                        <ol className="space-y-2">
                          {content.recommendations.map((rec, i) => (
                            <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 text-amber-950 flex items-center justify-center text-sm font-bold">
                                {i + 1}
                              </span>
                              <span className="text-muted-foreground">{typeof rec === 'string' ? rec : JSON.stringify(rec)}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Opportunities & Risks */}
                    {(content.opportunities?.length || content.risks?.length) && (
                      <div className="grid grid-cols-2 gap-4">
                        {content.opportunities && content.opportunities.length > 0 && (
                          <div className="space-y-2">
                            <h3 className="font-semibold flex items-center gap-2 text-green-500">
                              🎯 Opportunities
                            </h3>
                            <ul className="space-y-1">
                              {content.opportunities.map((opp, i) => (
                                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <span className="text-green-500">✓</span>
                                  {typeof opp === 'string' ? opp : JSON.stringify(opp)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {content.risks && content.risks.length > 0 && (
                          <div className="space-y-2">
                            <h3 className="font-semibold flex items-center gap-2 text-red-500">
                              ⚠️ Risks
                            </h3>
                            <ul className="space-y-1">
                              {content.risks.map((risk, i) => (
                                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <span className="text-red-500">!</span>
                                  {typeof risk === 'string' ? risk : JSON.stringify(risk)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Detailed Analysis */}
                    {content.detailed_analysis && (
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          📊 Detailed Analysis
                        </h3>
                        {renderDetailedAnalysis(content.detailed_analysis)}
                      </div>
                    )}

                    {/* Raw JSON Toggle */}
                    <Collapsible open={showRawJson} onOpenChange={setShowRawJson}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full">
                          <Code className="w-4 h-4 mr-2" />
                          {showRawJson ? 'Hide' : 'Show'} Raw Data
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto mt-2 max-h-[300px]">
                          {JSON.stringify(deliverable.generated_content, null, 2)}
                        </pre>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </motion.div>
      )}
    </Card>
  );
};
