import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { FileText, User, Clock, CheckCircle2, MessageSquare, Loader2, AlertTriangle, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ProgressReport {
  id: string;
  agent_id: string;
  agent_name: string;
  report_to_agent_id: string;
  report_to_agent_name: string;
  report_type: string;
  title: string;
  content: string;
  deliverables_completed: { name: string; status: string }[];
  tasks_in_progress: { name: string; progress: number }[];
  blockers: { description: string; severity: string }[];
  next_steps: { step: string; eta: string }[];
  metrics: Record<string, number>;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  feedback: string | null;
  created_at: string;
}

export function ProgressReportsPanel() {
  const { user } = useAuth();
  const [reports, setReports] = useState<ProgressReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ProgressReport | null>(null);
  const [feedback, setFeedback] = useState('');
  const [acknowledging, setAcknowledging] = useState(false);

  useEffect(() => {
    if (user) {
      fetchReports();

      // Real-time subscription
      const channel = supabase
        .channel('progress-reports')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'progress_reports',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          console.log('Progress report update:', payload);
          fetchReports();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchReports = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('progress_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const typedReports: ProgressReport[] = (data || []).map(r => ({
        id: r.id,
        agent_id: r.agent_id,
        agent_name: r.agent_name,
        report_to_agent_id: r.report_to_agent_id,
        report_to_agent_name: r.report_to_agent_name,
        report_type: r.report_type,
        title: r.title,
        content: r.content,
        deliverables_completed: Array.isArray(r.deliverables_completed) 
          ? r.deliverables_completed as ProgressReport['deliverables_completed'] 
          : [],
        tasks_in_progress: Array.isArray(r.tasks_in_progress) 
          ? r.tasks_in_progress as ProgressReport['tasks_in_progress'] 
          : [],
        blockers: Array.isArray(r.blockers) 
          ? r.blockers as ProgressReport['blockers'] 
          : [],
        next_steps: Array.isArray(r.next_steps) 
          ? r.next_steps as ProgressReport['next_steps'] 
          : [],
        metrics: (r.metrics as Record<string, number>) || {},
        acknowledged_at: r.acknowledged_at,
        acknowledged_by: r.acknowledged_by,
        feedback: r.feedback,
        created_at: r.created_at || new Date().toISOString()
      }));

      setReports(typedReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!selectedReport) return;

    setAcknowledging(true);
    try {
      const { error } = await supabase
        .from('progress_reports')
        .update({
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: 'human_user',
          feedback: feedback.trim() || null
        })
        .eq('id', selectedReport.id);

      if (error) throw error;

      toast.success('Report acknowledged');
      setSelectedReport(null);
      setFeedback('');
    } catch (error) {
      toast.error('Failed to acknowledge report');
    } finally {
      setAcknowledging(false);
    }
  };

  const getReportTypeColor = (type: string) => {
    switch (type) {
      case 'daily': return 'bg-blue-500/20 text-blue-400';
      case 'weekly': return 'bg-purple-500/20 text-purple-400';
      case 'milestone': return 'bg-green-500/20 text-green-400';
      case 'blocker': return 'bg-red-500/20 text-red-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const pendingReports = reports.filter(r => !r.acknowledged_at);
  const acknowledgedReports = reports.filter(r => r.acknowledged_at);

  if (loading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Reports */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Pending Reports
              {pendingReports.length > 0 && (
                <Badge className="bg-primary/20 text-primary ml-2">
                  {pendingReports.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[450px] pr-4">
              <div className="space-y-3">
                {pendingReports.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mb-4 opacity-50" />
                    <p>All reports acknowledged</p>
                  </div>
                ) : (
                  pendingReports.map((report) => (
                    <div
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className="p-4 rounded-lg border border-primary/30 bg-primary/5 cursor-pointer hover:border-primary/50 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <p className="font-medium line-clamp-1">{report.title}</p>
                          <p className="text-xs text-muted-foreground">
                            From: {report.agent_name} → {report.report_to_agent_name}
                          </p>
                        </div>
                        <Badge className={getReportTypeColor(report.report_type)}>
                          {report.report_type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {report.content}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(report.created_at), 'MMM d, h:mm a')}
                        </span>
                        <div className="flex items-center gap-2">
                          {report.blockers?.length > 0 && (
                            <span className="flex items-center gap-1 text-red-400">
                              <AlertTriangle className="h-3 w-3" />
                              {report.blockers.length} blockers
                            </span>
                          )}
                          {report.deliverables_completed?.length > 0 && (
                            <span className="flex items-center gap-1 text-green-400">
                              <CheckCircle2 className="h-3 w-3" />
                              {report.deliverables_completed.length} completed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Acknowledged Reports */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
              Acknowledged Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[450px] pr-4">
              <div className="space-y-3">
                {acknowledgedReports.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No acknowledged reports</p>
                ) : (
                  acknowledgedReports.map((report) => (
                    <div
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className="p-4 rounded-lg border border-border/30 bg-background/30 cursor-pointer hover:border-border/50 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <p className="font-medium line-clamp-1">{report.title}</p>
                          <p className="text-xs text-muted-foreground">
                            From: {report.agent_name}
                          </p>
                        </div>
                        <Badge className="bg-green-500/20 text-green-400">
                          Acknowledged
                        </Badge>
                      </div>
                      {report.feedback && (
                        <div className="mt-2 p-2 bg-green-500/10 rounded text-sm">
                          <p className="text-xs font-medium text-green-400 mb-1">Feedback:</p>
                          <p className="text-muted-foreground line-clamp-2">{report.feedback}</p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Acknowledged {format(new Date(report.acknowledged_at!), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Report Details Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Progress Report Details
            </DialogTitle>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Report Title</p>
                  <p className="text-muted-foreground">{selectedReport.title}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Type</p>
                  <Badge className={getReportTypeColor(selectedReport.report_type)}>
                    {selectedReport.report_type}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">From Agent</p>
                  <p className="text-muted-foreground">{selectedReport.agent_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Reporting To</p>
                  <p className="text-muted-foreground">{selectedReport.report_to_agent_name}</p>
                </div>
              </div>

              {/* Content */}
              <div>
                <p className="text-sm font-medium mb-2">Report Content</p>
                <div className="bg-muted/50 rounded-lg p-4 text-sm">
                  {selectedReport.content}
                </div>
              </div>

              {/* Deliverables Completed */}
              {selectedReport.deliverables_completed?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                    Deliverables Completed
                  </p>
                  <div className="space-y-2">
                    {selectedReport.deliverables_completed.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-green-500/10 rounded text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                        <span>{d.name}</span>
                        <Badge variant="outline" className="ml-auto text-xs">{d.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks In Progress */}
              {selectedReport.tasks_in_progress?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-400" />
                    Tasks In Progress
                  </p>
                  <div className="space-y-2">
                    {selectedReport.tasks_in_progress.map((t, i) => (
                      <div key={i} className="p-2 bg-blue-500/10 rounded">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>{t.name}</span>
                          <span className="text-blue-400">{t.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${t.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Blockers */}
              {selectedReport.blockers?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    Blockers
                  </p>
                  <div className="space-y-2">
                    {selectedReport.blockers.map((b, i) => (
                      <div key={i} className="p-2 bg-red-500/10 rounded text-sm flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p>{b.description}</p>
                          <Badge variant="outline" className="mt-1 text-xs text-red-400 border-red-400/30">
                            {b.severity}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next Steps */}
              {selectedReport.next_steps?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Next Steps</p>
                  <div className="space-y-2">
                    {selectedReport.next_steps.map((s, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                        <span>{s.step}</span>
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {s.eta}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metrics */}
              {Object.keys(selectedReport.metrics || {}).length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Metrics</p>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(selectedReport.metrics).map(([key, value]) => (
                      <div key={key} className="p-2 bg-muted/30 rounded text-center">
                        <p className="text-lg font-bold text-primary">{value}</p>
                        <p className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Feedback Section */}
              {!selectedReport.acknowledged_at && (
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Your Feedback (Optional)
                  </p>
                  <Textarea
                    placeholder="Provide feedback or guidance for this report..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              {/* Existing Feedback */}
              {selectedReport.feedback && (
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <p className="text-xs font-medium text-green-400 mb-1">Your Feedback:</p>
                  <p className="text-sm">{selectedReport.feedback}</p>
                </div>
              )}

              {/* Timestamps */}
              <div className="text-xs text-muted-foreground border-t pt-4 space-y-1">
                <p>Submitted: {format(new Date(selectedReport.created_at), 'EEEE, MMMM d, yyyy h:mm a')}</p>
                {selectedReport.acknowledged_at && (
                  <p>Acknowledged: {format(new Date(selectedReport.acknowledged_at), 'EEEE, MMMM d, yyyy h:mm a')}</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReport(null)}>
              Close
            </Button>
            {selectedReport && !selectedReport.acknowledged_at && (
              <Button onClick={handleAcknowledge} disabled={acknowledging}>
                {acknowledging ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Acknowledge Report
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
