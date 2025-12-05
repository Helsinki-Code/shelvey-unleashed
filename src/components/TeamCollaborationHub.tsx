import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { 
  Users, MessageSquare, Calendar, AlertTriangle, CheckCircle, 
  Clock, Send, RefreshCw, Loader2, Bell, ArrowUp, ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { HelpTooltip, HELP_CONTENT } from './HelpTooltip';
import { ALL_AGENTS, getAgentById } from '@/lib/all-agents';

interface AgentMessage {
  id: string;
  from_agent_id: string;
  from_agent_name: string;
  to_agent_id: string | null;
  to_agent_name: string | null;
  content: string;
  message_type: string;
  priority: string | null;
  subject: string | null;
  created_at: string;
  read_at: string | null;
}

interface TeamMeeting {
  id: string;
  meeting_type: string;
  scheduled_at: string;
  status: string;
  attendees: any;
  agenda: any;
  minutes: string | null;
  action_items: any;
}

interface Escalation {
  id: string;
  issue_type: string;
  issue_description: string;
  created_by_agent_name: string;
  current_handler_type: string;
  escalation_level: number;
  status: string;
  created_at: string;
  resolution: string | null;
}

interface ProgressReport {
  id: string;
  agent_name: string;
  report_to_agent_name: string;
  title: string;
  content: string;
  report_type: string;
  created_at: string;
  acknowledged_at: string | null;
  deliverables_completed: any;
  blockers: any;
}

export function TeamCollaborationHub() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('messages');
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [meetings, setMeetings] = useState<TeamMeeting[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [reports, setReports] = useState<ProgressReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [selectedEscalation, setSelectedEscalation] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchAllData();
      setupRealtimeSubscriptions();
    }
  }, [user]);

  const setupRealtimeSubscriptions = () => {
    const channel = supabase
      .channel('team-collaboration-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_messages' }, () => fetchMessages())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_meetings' }, () => fetchMeetings())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'escalations' }, () => fetchEscalations())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'progress_reports' }, () => fetchReports())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchAllData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchMessages(),
      fetchMeetings(),
      fetchEscalations(),
      fetchReports()
    ]);
    setIsLoading(false);
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('agent_messages')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setMessages(data || []);
  };

  const fetchMeetings = async () => {
    const { data } = await supabase
      .from('team_meetings')
      .select('*')
      .eq('user_id', user?.id)
      .order('scheduled_at', { ascending: false })
      .limit(20);
    setMeetings(data || []);
  };

  const fetchEscalations = async () => {
    const { data } = await supabase
      .from('escalations')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setEscalations(data || []);
  };

  const fetchReports = async () => {
    const { data } = await supabase
      .from('progress_reports')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setReports(data || []);
  };

  const resolveEscalation = async (escalationId: string, resolution: string) => {
    try {
      const { error } = await supabase
        .from('escalations')
        .update({ 
          status: 'resolved',
          resolution,
          resolved_at: new Date().toISOString(),
          resolved_by: 'user'
        })
        .eq('id', escalationId);

      if (error) throw error;
      toast.success('Escalation resolved');
      setSelectedEscalation(null);
      setReplyContent('');
      fetchEscalations();
    } catch (err) {
      toast.error('Failed to resolve escalation');
    }
  };

  const acknowledgeReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('progress_reports')
        .update({ 
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: 'user'
        })
        .eq('id', reportId);

      if (error) throw error;
      toast.success('Report acknowledged');
      fetchReports();
    } catch (err) {
      toast.error('Failed to acknowledge report');
    }
  };

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'help_request': return 'bg-orange-500/20 text-orange-500';
      case 'status_update': return 'bg-blue-500/20 text-blue-500';
      case 'handoff': return 'bg-purple-500/20 text-purple-500';
      case 'escalation': return 'bg-red-500/20 text-red-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getEscalationLevelColor = (level: number) => {
    switch (level) {
      case 1: return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 2: return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
      case 3: return 'bg-red-500/20 text-red-500 border-red-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const pendingEscalations = escalations.filter(e => e.status === 'pending' || e.status === 'in_progress');
  const unreadMessages = messages.filter(m => !m.read_at).length;
  const pendingReports = reports.filter(r => !r.acknowledged_at).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Team Collaboration Hub</h2>
          <HelpTooltip 
            title="Team Collaboration"
            description="See how your AI agents communicate, share updates, and escalate issues. This is your window into how the team works together."
          />
        </div>
        <Button variant="outline" size="sm" onClick={fetchAllData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <MessageSquare className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{unreadMessages}</p>
              <p className="text-xs text-muted-foreground">Unread Messages</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingEscalations.length}</p>
              <p className="text-xs text-muted-foreground">Pending Escalations</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Calendar className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{meetings.filter(m => m.status === 'scheduled').length}</p>
              <p className="text-xs text-muted-foreground">Upcoming Meetings</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Bell className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingReports}</p>
              <p className="text-xs text-muted-foreground">Reports to Review</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="messages" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Messages
            {unreadMessages > 0 && (
              <Badge className="bg-blue-500 text-white text-xs px-1.5">{unreadMessages}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="escalations" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Escalations
            {pendingEscalations.length > 0 && (
              <Badge className="bg-red-500 text-white text-xs px-1.5">{pendingEscalations.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="meetings" className="gap-2">
            <Calendar className="w-4 h-4" />
            Meetings
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <Users className="w-4 h-4" />
            Reports
            {pendingReports > 0 && (
              <Badge className="bg-emerald-500 text-white text-xs px-1.5">{pendingReports}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Messages Tab */}
        <TabsContent value="messages" className="mt-4">
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Agent Communications</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No messages yet</p>
                    <p className="text-sm">Agent communications will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map(msg => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-3 rounded-lg border ${!msg.read_at ? 'bg-primary/5 border-primary/20' : 'bg-background/50 border-border/50'}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {msg.from_agent_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{msg.from_agent_name}</span>
                                {msg.to_agent_name && (
                                  <>
                                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">{msg.to_agent_name}</span>
                                  </>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {new Date(msg.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <Badge className={getMessageTypeColor(msg.message_type)}>
                            {msg.message_type.replace('_', ' ')}
                          </Badge>
                        </div>
                        {msg.subject && (
                          <p className="font-medium text-sm mt-2">{msg.subject}</p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">{msg.content}</p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Escalations Tab */}
        <TabsContent value="escalations" className="mt-4">
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Escalations Requiring Attention</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {escalations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50 text-emerald-500" />
                    <p>No escalations</p>
                    <p className="text-sm">Your AI team is handling everything smoothly</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {escalations.map(esc => (
                      <motion.div
                        key={esc.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 rounded-lg border ${
                          esc.status === 'pending' ? 'bg-red-500/5 border-red-500/20' : 
                          esc.status === 'resolved' ? 'bg-emerald-500/5 border-emerald-500/20' :
                          'bg-background/50 border-border/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge className={getEscalationLevelColor(esc.escalation_level || 1)}>
                                Level {esc.escalation_level || 1}
                              </Badge>
                              <span className="font-medium text-sm">{esc.issue_type}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              From: {esc.created_by_agent_name} • {new Date(esc.created_at).toLocaleString()}
                            </p>
                          </div>
                          <Badge variant={esc.status === 'resolved' ? 'default' : 'destructive'}>
                            {esc.status}
                          </Badge>
                        </div>
                        <p className="text-sm mt-2">{esc.issue_description}</p>
                        
                        {esc.resolution && (
                          <div className="mt-2 p-2 rounded bg-emerald-500/10 text-emerald-500 text-sm">
                            Resolution: {esc.resolution}
                          </div>
                        )}
                        
                        {esc.status !== 'resolved' && (
                          <div className="mt-3 space-y-2">
                            {selectedEscalation === esc.id ? (
                              <div className="space-y-2">
                                <Textarea
                                  placeholder="Provide resolution instructions..."
                                  value={replyContent}
                                  onChange={(e) => setReplyContent(e.target.value)}
                                  className="min-h-[80px]"
                                />
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    onClick={() => resolveEscalation(esc.id, replyContent)}
                                    disabled={!replyContent.trim()}
                                  >
                                    <Send className="w-4 h-4 mr-1" />
                                    Resolve
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => setSelectedEscalation(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setSelectedEscalation(esc.id)}
                              >
                                Resolve This
                              </Button>
                            )}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Meetings Tab */}
        <TabsContent value="meetings" className="mt-4">
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Team Meetings</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {meetings.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No meetings scheduled</p>
                    <p className="text-sm">Daily standups will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {meetings.map(meeting => (
                      <motion.div
                        key={meeting.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-lg border bg-background/50 border-border/50"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{meeting.meeting_type}</Badge>
                              <span className="text-sm">
                                {new Date(meeting.scheduled_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <Badge variant={meeting.status === 'completed' ? 'default' : 'secondary'}>
                            {meeting.status}
                          </Badge>
                        </div>
                        
                        {meeting.minutes && (
                          <div className="mt-3 p-2 rounded bg-muted/50 text-sm">
                            <p className="font-medium mb-1">Minutes:</p>
                            <p className="text-muted-foreground">{meeting.minutes}</p>
                          </div>
                        )}
                        
                        {meeting.action_items && Array.isArray(meeting.action_items) && meeting.action_items.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm font-medium">Action Items:</p>
                            <ul className="text-sm text-muted-foreground list-disc list-inside">
                              {meeting.action_items.map((item: string, i: number) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="mt-4">
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Progress Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {reports.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No reports yet</p>
                    <p className="text-sm">Agent progress reports will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reports.map(report => (
                      <motion.div
                        key={report.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 rounded-lg border ${
                          !report.acknowledged_at ? 'bg-primary/5 border-primary/20' : 'bg-background/50 border-border/50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{report.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {report.agent_name} → {report.report_to_agent_name} • {new Date(report.created_at).toLocaleString()}
                            </p>
                          </div>
                          <Badge variant="outline">{report.report_type}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">{report.content}</p>
                        
                        {!report.acknowledged_at && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="mt-3"
                            onClick={() => acknowledgeReport(report.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Acknowledge
                          </Button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}