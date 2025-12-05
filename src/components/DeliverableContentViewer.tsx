import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, ChevronDown, ChevronUp, Check, Clock, 
  Eye, Download, ThumbsUp, ThumbsDown, Loader2 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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
  [key: string]: any;
}

interface DeliverableContentViewerProps {
  deliverable: {
    id: string;
    name: string;
    status: string;
    deliverable_type: string;
    generated_content?: GeneratedContent | null;
    description?: string | null;
  };
  onApprove?: (id: string) => void;
  onReject?: (id: string, feedback: string) => void;
}

export const DeliverableContentViewer = ({ 
  deliverable, 
  onApprove, 
  onReject 
}: DeliverableContentViewerProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const content = deliverable.generated_content;

  const getStatusBadge = () => {
    switch (deliverable.status) {
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-500">Approved</Badge>;
      case 'review':
        return <Badge className="bg-amber-500/20 text-amber-500">Ready for Review</Badge>;
      case 'in_progress':
        return <Badge className="bg-primary/20 text-primary">In Progress</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
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
            <div>
              <CardTitle className="text-base">{deliverable.name}</CardTitle>
              {deliverable.description && (
                <p className="text-sm text-muted-foreground mt-1">{deliverable.description}</p>
              )}
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
            {!hasContent ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Content is being generated...</p>
                <p className="text-sm">Check back soon</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-4 py-4">
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
                      <ul className="space-y-1">
                        {content.key_findings.map((finding, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-primary">•</span>
                            {finding}
                          </li>
                        ))}
                      </ul>
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
                            <p className="font-medium text-sm">{comp.name}</p>
                            {comp.strengths && (
                              <p className="text-xs text-muted-foreground mt-1">
                                <span className="text-green-500">Strengths:</span> {comp.strengths}
                              </p>
                            )}
                            {comp.weaknesses && (
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
                      <ul className="space-y-1">
                        {content.trends.map((trend, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-cyan-500">↗</span>
                            {trend}
                          </li>
                        ))}
                      </ul>
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
                            {rec}
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
                      <ul className="space-y-1">
                        {content.opportunities.map((opp, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-green-500">✓</span>
                            {opp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Risks */}
                  {content.risks && content.risks.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        ⚠️ Risks
                      </h4>
                      <ul className="space-y-1">
                        {content.risks.map((risk, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-red-500">!</span>
                            {risk}
                          </li>
                        ))}
                      </ul>
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
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto">
                      {JSON.stringify(content, null, 2)}
                    </pre>
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
