import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Calendar, Users, Clock, FileText, CheckCircle2, Play, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Meeting {
  id: string;
  meeting_type: string;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  attendees: { agent_id: string; agent_name: string }[];
  agenda: { item: string; completed: boolean }[];
  minutes: string | null;
  action_items: { item: string; assignee: string; due: string }[];
  status: string;
  team_id: string | null;
}

export function TeamMeetingView() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  useEffect(() => {
    if (user) {
      fetchMeetings();
      
      // Subscribe to real-time updates
      const channel = supabase
        .channel('team-meetings')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'team_meetings',
          filter: `user_id=eq.${user.id}`
        }, () => {
          fetchMeetings();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchMeetings = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('team_meetings')
        .select('*')
        .eq('user_id', user.id)
        .order('scheduled_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      const typedMeetings: Meeting[] = (data || []).map(m => ({
        id: m.id,
        meeting_type: m.meeting_type,
        scheduled_at: m.scheduled_at,
        started_at: m.started_at,
        completed_at: m.completed_at,
        attendees: Array.isArray(m.attendees) ? m.attendees as Meeting['attendees'] : [],
        agenda: Array.isArray(m.agenda) ? m.agenda as Meeting['agenda'] : [],
        minutes: m.minutes,
        action_items: Array.isArray(m.action_items) ? m.action_items as Meeting['action_items'] : [],
        status: m.status || 'scheduled',
        team_id: m.team_id
      }));
      
      setMeetings(typedMeetings);
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const startMeeting = async (meetingId: string) => {
    try {
      const { error } = await supabase
        .from('team_meetings')
        .update({ 
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('id', meetingId);

      if (error) throw error;
      toast.success('Meeting started');
    } catch (error) {
      toast.error('Failed to start meeting');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500/20 text-blue-400';
      case 'in_progress': return 'bg-yellow-500/20 text-yellow-400';
      case 'completed': return 'bg-green-500/20 text-green-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getMeetingTypeIcon = (type: string) => {
    switch (type) {
      case 'standup': return '🌅';
      case 'review': return '📋';
      case 'planning': return '📊';
      case 'emergency': return '🚨';
      default: return '📅';
    }
  };

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Meetings List */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Team Meetings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {meetings.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No meetings scheduled</p>
              ) : (
                meetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    onClick={() => setSelectedMeeting(meeting)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedMeeting?.id === meeting.id 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border/50 bg-background/50 hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getMeetingTypeIcon(meeting.meeting_type)}</span>
                        <div>
                          <p className="font-medium capitalize">{meeting.meeting_type} Meeting</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(meeting.scheduled_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(meeting.status)}>
                        {meeting.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {meeting.attendees?.length || 0} attendees
                      </span>
                      {meeting.action_items?.length > 0 && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" />
                          {meeting.action_items.length} action items
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Meeting Details */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Meeting Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedMeeting ? (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold capitalize">
                      {getMeetingTypeIcon(selectedMeeting.meeting_type)} {selectedMeeting.meeting_type} Meeting
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedMeeting.scheduled_at), 'EEEE, MMMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  {selectedMeeting.status === 'scheduled' && (
                    <Button onClick={() => startMeeting(selectedMeeting.id)} size="sm">
                      <Play className="h-4 w-4 mr-1" />
                      Start
                    </Button>
                  )}
                </div>

                {/* Attendees */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Attendees
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMeeting.attendees?.map((attendee, i) => (
                      <Badge key={i} variant="outline">
                        {attendee.agent_name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Agenda */}
                {selectedMeeting.agenda?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Agenda</h4>
                    <ul className="space-y-2">
                      {selectedMeeting.agenda.map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          {item.completed ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                          )}
                          <span className={item.completed ? 'line-through text-muted-foreground' : ''}>
                            {item.item}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Minutes */}
                {selectedMeeting.minutes && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Meeting Minutes</h4>
                    <div className="bg-muted/50 rounded-lg p-4 text-sm">
                      {selectedMeeting.minutes}
                    </div>
                  </div>
                )}

                {/* Action Items */}
                {selectedMeeting.action_items?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Action Items</h4>
                    <div className="space-y-2">
                      {selectedMeeting.action_items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div>
                            <p className="text-sm">{item.item}</p>
                            <p className="text-xs text-muted-foreground">
                              Assigned to: {item.assignee}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {item.due}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="text-xs text-muted-foreground border-t pt-4 space-y-1">
                  {selectedMeeting.started_at && (
                    <p>Started: {format(new Date(selectedMeeting.started_at), 'h:mm a')}</p>
                  )}
                  {selectedMeeting.completed_at && (
                    <p>Completed: {format(new Date(selectedMeeting.completed_at), 'h:mm a')}</p>
                  )}
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
              <Calendar className="h-12 w-12 mb-4 opacity-50" />
              <p>Select a meeting to view details</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
