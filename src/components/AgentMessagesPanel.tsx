import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MessageSquare, ArrowRight, HelpCircle, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface AgentMessage {
  id: string;
  from_agent_id: string;
  from_agent_name: string;
  to_agent_id: string | null;
  to_agent_name: string | null;
  message_type: string;
  subject: string | null;
  content: string;
  priority: string;
  read_at: string | null;
  created_at: string;
}

export function AgentMessagesPanel() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (user) {
      fetchMessages();

      const channel = supabase
        .channel('agent-messages')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'agent_messages',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          const newMsg = payload.new as AgentMessage;
          setMessages(prev => [newMsg, ...prev]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchMessages = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('agent_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMessages = messages.filter(msg => {
    if (activeTab === 'all') return true;
    return msg.message_type === activeTab;
  });

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'request_help': return <HelpCircle className="h-4 w-4 text-yellow-400" />;
      case 'handoff': return <RefreshCw className="h-4 w-4 text-blue-400" />;
      case 'escalation': return <AlertTriangle className="h-4 w-4 text-red-400" />;
      case 'status_update': return <ArrowRight className="h-4 w-4 text-green-400" />;
      default: return <MessageSquare className="h-4 w-4 text-primary" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'request_help': return 'Help Request';
      case 'handoff': return 'Task Handoff';
      case 'escalation': return 'Escalation';
      case 'status_update': return 'Status Update';
      case 'question': return 'Question';
      case 'answer': return 'Answer';
      default: return type;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/20 text-red-400';
      case 'high': return 'bg-orange-500/20 text-orange-400';
      case 'normal': return 'bg-blue-500/20 text-blue-400';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
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
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Agent Communications
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="request_help">Help</TabsTrigger>
            <TabsTrigger value="handoff">Handoffs</TabsTrigger>
            <TabsTrigger value="escalation">Escalations</TabsTrigger>
            <TabsTrigger value="status_update">Updates</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3">
                {filteredMessages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No messages</p>
                ) : (
                  filteredMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-4 rounded-lg border transition-all ${
                        message.read_at 
                          ? 'border-border/30 bg-background/30' 
                          : 'border-primary/50 bg-primary/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          {getMessageIcon(message.message_type)}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{message.from_agent_name}</span>
                              {message.to_agent_name && (
                                <>
                                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-muted-foreground">{message.to_agent_name}</span>
                                </>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(message.created_at), 'MMM d, h:mm a')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {getTypeLabel(message.message_type)}
                          </Badge>
                          {message.priority && message.priority !== 'normal' && (
                            <Badge className={`text-xs ${getPriorityColor(message.priority)}`}>
                              {message.priority}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {message.subject && (
                        <p className="font-medium text-sm mb-1">{message.subject}</p>
                      )}
                      
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {message.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
