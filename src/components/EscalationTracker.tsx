import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle, ArrowUpCircle, CheckCircle2, Clock, User, Bot, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Escalation {
  id: string;
  created_by_agent_id: string;
  created_by_agent_name: string;
  escalation_level: number;
  current_handler_type: string;
  current_handler_id: string | null;
  issue_type: string;
  issue_description: string;
  context: Record<string, unknown>;
  attempted_solutions: { solution: string; result: string }[];
  status: string;
  resolution: string | null;
  created_at: string;
}

export function EscalationTracker() {
  const { user } = useAuth();
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEscalation, setSelectedEscalation] = useState<Escalation | null>(null);
  const [resolution, setResolution] = useState('');
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchEscalations();

      const channel = supabase
        .channel('escalations')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'escalations',
          filter: `user_id=eq.${user.id}`
        }, () => {
          fetchEscalations();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchEscalations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('escalations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const typedEscalations: Escalation[] = (data || []).map(e => ({
        id: e.id,
        created_by_agent_id: e.created_by_agent_id,
        created_by_agent_name: e.created_by_agent_name,
        escalation_level: e.escalation_level || 1,
        current_handler_type: e.current_handler_type,
        current_handler_id: e.current_handler_id,
        issue_type: e.issue_type,
        issue_description: e.issue_description,
        context: (e.context as Record<string, unknown>) || {},
        attempted_solutions: Array.isArray(e.attempted_solutions) 
          ? e.attempted_solutions as Escalation['attempted_solutions'] 
          : [],
        status: e.status || 'open',
        resolution: e.resolution,
        created_at: e.created_at || new Date().toISOString()
      }));
      
      setEscalations(typedEscalations);
    } catch (error) {
      console.error('Error fetching escalations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedEscalation || !resolution.trim()) return;

    setResolving(true);
    try {
      const { error } = await supabase
        .from('escalations')
        .update({
          status: 'resolved',
          resolution,
          resolution_type: 'human_resolution',
          resolved_by: 'human_user',
          resolved_at: new Date().toISOString()
        })
        .eq('id', selectedEscalation.id);

      if (error) throw error;

      toast.success('Escalation resolved');
      setSelectedEscalation(null);
      setResolution('');
    } catch (error) {
      toast.error('Failed to resolve escalation');
    } finally {
      setResolving(false);
    }
  };

  const getLevelInfo = (level: number) => {
    switch (level) {
      case 1: return { label: 'Team Manager', icon: <Bot className="h-4 w-4" />, color: 'bg-blue-500/20 text-blue-400' };
      case 2: return { label: 'CEO Agent', icon: <Bot className="h-4 w-4" />, color: 'bg-orange-500/20 text-orange-400' };
      case 3: return { label: 'Human User', icon: <User className="h-4 w-4" />, color: 'bg-red-500/20 text-red-400' };
      default: return { label: 'Unknown', icon: null, color: 'bg-muted text-muted-foreground' };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-yellow-500/20 text-yellow-400';
      case 'in_progress': return 'bg-blue-500/20 text-blue-400';
      case 'resolved': return 'bg-green-500/20 text-green-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const openEscalations = escalations.filter(e => e.status !== 'resolved');
  const resolvedEscalations = escalations.filter(e => e.status === 'resolved');

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
        {/* Open Escalations */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              Open Escalations
              {openEscalations.length > 0 && (
                <Badge className="bg-yellow-500/20 text-yellow-400 ml-2">
                  {openEscalations.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[450px] pr-4">
              <div className="space-y-3">
                {openEscalations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mb-4 opacity-50" />
                    <p>No open escalations</p>
                  </div>
                ) : (
                  openEscalations.map((escalation) => {
                    const levelInfo = getLevelInfo(escalation.escalation_level);
                    return (
                      <div
                        key={escalation.id}
                        onClick={() => setSelectedEscalation(escalation)}
                        className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5 cursor-pointer hover:border-yellow-500/50 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <ArrowUpCircle className="h-5 w-5 text-yellow-400" />
                            <div>
                              <p className="font-medium">{escalation.issue_type}</p>
                              <p className="text-xs text-muted-foreground">
                                From: {escalation.created_by_agent_name}
                              </p>
                            </div>
                          </div>
                          <Badge className={levelInfo.color}>
                            {levelInfo.icon}
                            <span className="ml-1">Level {escalation.escalation_level}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {escalation.issue_description}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(escalation.created_at), 'MMM d, h:mm a')}
                          </span>
                          <Badge className={getStatusColor(escalation.status)}>
                            {escalation.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Resolved Escalations */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
              Resolved Escalations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[450px] pr-4">
              <div className="space-y-3">
                {resolvedEscalations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No resolved escalations</p>
                ) : (
                  resolvedEscalations.map((escalation) => (
                    <div
                      key={escalation.id}
                      className="p-4 rounded-lg border border-border/30 bg-background/30"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="font-medium">{escalation.issue_type}</p>
                          <p className="text-xs text-muted-foreground">
                            From: {escalation.created_by_agent_name}
                          </p>
                        </div>
                        <Badge className="bg-green-500/20 text-green-400">
                          Resolved
                        </Badge>
                      </div>
                      {escalation.resolution && (
                        <div className="mt-2 p-2 bg-green-500/10 rounded text-sm">
                          <p className="text-xs font-medium text-green-400 mb-1">Resolution:</p>
                          <p className="text-muted-foreground">{escalation.resolution}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Resolution Dialog */}
      <Dialog open={!!selectedEscalation} onOpenChange={() => setSelectedEscalation(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              Escalation Details
            </DialogTitle>
          </DialogHeader>

          {selectedEscalation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Issue Type</p>
                  <p className="text-muted-foreground">{selectedEscalation.issue_type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Created By</p>
                  <p className="text-muted-foreground">{selectedEscalation.created_by_agent_name}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Description</p>
                <p className="text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  {selectedEscalation.issue_description}
                </p>
              </div>

              {selectedEscalation.attempted_solutions?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Attempted Solutions</p>
                  <div className="space-y-2">
                    {selectedEscalation.attempted_solutions.map((sol, i) => (
                      <div key={i} className="p-2 bg-muted/30 rounded text-sm">
                        <p><strong>Solution:</strong> {sol.solution}</p>
                        <p className="text-muted-foreground"><strong>Result:</strong> {sol.result}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedEscalation.status !== 'resolved' && (
                <div>
                  <p className="text-sm font-medium mb-2">Your Resolution</p>
                  <Textarea
                    placeholder="Provide guidance or resolution for this escalation..."
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    rows={4}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedEscalation(null)}>
              Close
            </Button>
            {selectedEscalation?.status !== 'resolved' && (
              <Button onClick={handleResolve} disabled={!resolution.trim() || resolving}>
                {resolving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Resolve Escalation
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
