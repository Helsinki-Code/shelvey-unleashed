import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Clock, User, MessageSquare, Play, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useCEO } from '@/hooks/useCEO';
import { format } from 'date-fns';

interface VoiceCall {
  id: string;
  agent_id: string;
  status: string;
  transcript: string | null;
  duration_seconds: number | null;
  audio_url: string | null;
  created_at: string;
}

const VoiceCallHistory: React.FC = () => {
  const { ceoName } = useCEO();
  const [calls, setCalls] = useState<VoiceCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<VoiceCall | null>(null);

  useEffect(() => {
    fetchCalls();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('voice-calls')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'voice_conversations',
        },
        () => {
          fetchCalls();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCalls = async () => {
    try {
      const { data, error } = await supabase
        .from('voice_conversations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setCalls(data || []);
    } catch (error) {
      console.error('Error fetching calls:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAgentName = (agentId: string) => {
    const names: Record<string, string> = {
      'ceo': ceoName,
      'sales': 'Sales Agent',
      'support': 'Support Agent',
      'research': 'Research Agent',
      'content': 'Content Agent',
    };
    return names[agentId] || agentId;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'active': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="py-12 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground mt-4">Loading call history...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Call List */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            Voice Call History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {calls.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Phone className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No voice calls yet</p>
                  <p className="text-sm">Start a voice conversation to see history</p>
                </div>
              ) : (
                calls.map((call, index) => (
                  <motion.div
                    key={call.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedCall?.id === call.id
                        ? 'bg-primary/10 border-primary/50'
                        : 'bg-muted/30 border-border/50 hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedCall(call)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">
                          {getAgentName(call.agent_id)}
                        </span>
                      </div>
                      <Badge variant="outline" className={getStatusColor(call.status)}>
                        {call.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(call.duration_seconds)}
                      </span>
                      <span>
                        {format(new Date(call.created_at), 'MMM d, h:mm a')}
                      </span>
                    </div>

                    {call.transcript && (
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                        {call.transcript}
                      </p>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Call Details */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Call Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedCall ? (
            <div className="space-y-4">
              {/* Call Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Agent</p>
                  <p className="font-medium">{getAgentName(selectedCall.agent_id)}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Duration</p>
                  <p className="font-medium">{formatDuration(selectedCall.duration_seconds)}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <Badge variant="outline" className={getStatusColor(selectedCall.status)}>
                    {selectedCall.status}
                  </Badge>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Date</p>
                  <p className="font-medium text-sm">
                    {format(new Date(selectedCall.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>

              {/* Audio Player */}
              {selectedCall.audio_url && (
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">Recording</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Play className="w-4 h-4 mr-2" />
                      Play
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Transcript */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Transcript</p>
                <ScrollArea className="h-[250px]">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    {selectedCall.transcript ? (
                      <p className="text-sm whitespace-pre-wrap">{selectedCall.transcript}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        No transcript available for this call
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-center">
              <div>
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">Select a call to view details</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceCallHistory;
