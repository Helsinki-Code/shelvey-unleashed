import { useState } from 'react';
import { ArrowLeft, Camera, Link2, FileText, Download, ExternalLink, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReportExporter } from '@/components/ReportExporter';

interface Citation {
  id: number;
  source: string;
  url: string;
  title: string;
  accessedAt: string;
  quote?: string;
}

interface WorkStep {
  step: number;
  action: string;
  url?: string;
  screenshot?: string;
  timestamp: string;
  reasoning: string;
  dataExtracted?: any;
  citations?: Citation[];
}

interface AgentWorkViewerProps {
  deliverable: {
    id: string;
    name: string;
    description: string | null;
    status: string | null;
    generated_content: any;
    screenshots: string[] | null;
    agent_work_steps: WorkStep[] | null;
    citations: Citation[] | null;
    ceo_approved: boolean | null;
    user_approved: boolean | null;
    feedback: string | null;
  };
  onBack: () => void;
}

export const AgentWorkViewer = ({ deliverable, onBack }: AgentWorkViewerProps) => {
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('content');

  const workSteps = deliverable.agent_work_steps || [];
  const citations = deliverable.citations || [];
  const screenshots = deliverable.screenshots || [];
  const content = deliverable.generated_content || {};

  const renderContentWithCitations = (value: unknown) => {
    if (value === null || value === undefined) return null;

    const text =
      typeof value === 'string'
        ? value
        : typeof value === 'number' || typeof value === 'boolean'
          ? String(value)
          : (() => {
              try {
                return JSON.stringify(value, null, 2);
              } catch {
                return String(value);
              }
            })();

    if (!text) return null;

    // Replace [1], [2], etc. with clickable citation links
    const parts = text.split(/(\[\d+\])/g);
    return parts.map((part, index) => {
      const match = part.match(/\[(\d+)\]/);
      if (match) {
        const citationId = parseInt(match[1]);
        const citation = citations.find((c) => c.id === citationId);
        if (citation) {
          return (
            <a
              key={index}
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
              title={citation.title}
            >
              [{citationId}]
            </a>
          );
        }
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h2 className="text-xl font-bold">{deliverable.name}</h2>
            <p className="text-muted-foreground text-sm">{deliverable.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={deliverable.status === 'approved' ? 'bg-green-500' : 'bg-muted'}>
            {deliverable.status}
          </Badge>
          <ReportExporter deliverableId={deliverable.id} deliverableName={deliverable.name} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Camera className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{screenshots.length}</p>
              <p className="text-xs text-muted-foreground">Screenshots</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{workSteps.length}</p>
              <p className="text-xs text-muted-foreground">Work Steps</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Link2 className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">{citations.length}</p>
              <p className="text-xs text-muted-foreground">Citations</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            {deliverable.ceo_approved && deliverable.user_approved ? (
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            ) : (
              <Clock className="w-8 h-8 text-yellow-500" />
            )}
            <div>
              <p className="text-sm font-medium">
                {deliverable.ceo_approved && deliverable.user_approved ? 'Approved' : 'Pending'}
              </p>
              <p className="text-xs text-muted-foreground">Status</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="content">Report Content</TabsTrigger>
          <TabsTrigger value="steps">Work Steps ({workSteps.length})</TabsTrigger>
          <TabsTrigger value="screenshots">Screenshots ({screenshots.length})</TabsTrigger>
          <TabsTrigger value="citations">Citations ({citations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-4">
          <Card>
            <CardContent className="p-6">
              {content.executive_summary && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Executive Summary</h3>
                  <p className="text-muted-foreground">
                    {renderContentWithCitations(content.executive_summary)}
                  </p>
                </div>
              )}

              {content.key_findings && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Key Findings</h3>
                  <ul className="space-y-2">
                    {(Array.isArray(content.key_findings) ? content.key_findings : [content.key_findings]).map((finding: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                        <span>{renderContentWithCitations(finding)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {content.detailed_analysis && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Detailed Analysis</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {renderContentWithCitations(
                      typeof content.detailed_analysis === 'string' 
                        ? content.detailed_analysis 
                        : JSON.stringify(content.detailed_analysis, null, 2)
                    )}
                  </p>
                </div>
              )}

              {content.recommendations && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Recommendations</h3>
                  <ul className="space-y-2">
                    {(Array.isArray(content.recommendations) ? content.recommendations : [content.recommendations]).map((rec: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                        <span>{renderContentWithCitations(rec)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!content.executive_summary && !content.key_findings && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Report content is being generated...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="steps" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {workSteps.map((step) => (
                    <div
                      key={step.step}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedStep === step.step ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedStep(step.step === selectedStep ? null : step.step)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                          {step.step}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{step.action}</p>
                          <p className="text-sm text-muted-foreground mt-1">{step.reasoning}</p>
                          {step.url && (
                            <a
                              href={step.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1 mt-2"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {step.url}
                            </a>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(step.timestamp).toLocaleString()}
                          </p>
                        </div>
                        {step.screenshot && (
                          <Camera className="w-5 h-5 text-primary" />
                        )}
                      </div>

                      {selectedStep === step.step && step.screenshot && (
                        <div className="mt-4 rounded-lg overflow-hidden border">
                          <img
                            src={step.screenshot}
                            alt={`Step ${step.step} screenshot`}
                            className="w-full"
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {workSteps.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No work steps recorded yet</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="screenshots" className="mt-4">
          <Card>
            <CardContent className="p-6">
              {screenshots.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {screenshots.map((url, index) => (
                    <div key={index} className="rounded-lg overflow-hidden border">
                      <img
                        src={url}
                        alt={`Screenshot ${index + 1}`}
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-2 bg-muted flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Screenshot {index + 1}</span>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No screenshots captured yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="citations" className="mt-4">
          <Card>
            <CardContent className="p-6">
              {citations.length > 0 ? (
                <div className="space-y-3">
                  {citations.map((citation) => (
                    <div
                      key={citation.id}
                      className="p-4 rounded-lg border hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="font-mono">
                          [{citation.id}]
                        </Badge>
                        <div className="flex-1">
                          <a
                            href={citation.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary hover:underline flex items-center gap-1"
                          >
                            {citation.title}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <p className="text-sm text-muted-foreground mt-1">
                            Source: {citation.source}
                          </p>
                          {citation.quote && (
                            <p className="text-sm italic mt-2 p-2 bg-muted rounded">
                              "{citation.quote}"
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Accessed: {new Date(citation.accessedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Link2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No citations recorded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};