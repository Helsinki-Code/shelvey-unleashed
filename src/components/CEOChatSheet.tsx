import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader2, Sparkles, RefreshCw, Phone, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CEOVoiceCall } from './CEOVoiceCall';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface UserCEO {
  ceo_name: string;
  ceo_image_url: string | null;
  persona: string;
  voice_id: string;
  communication_style: string;
}

interface CEOChatSheetProps {
  currentPage?: string;
}

export const CEOChatSheet = ({ currentPage }: CEOChatSheetProps) => {
  const { session, user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const [userCEO, setUserCEO] = useState<UserCEO | null>(null);
  const [isLoadingCEO, setIsLoadingCEO] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch user's custom CEO
  useEffect(() => {
    const fetchUserCEO = async () => {
      if (!user) {
        setIsLoadingCEO(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_ceos')
        .select('ceo_name, ceo_image_url, persona, voice_id, communication_style')
        .eq('user_id', user.id)
        .single();

      if (data && !error) {
        setUserCEO(data);
      }
      setIsLoadingCEO(false);
    };

    fetchUserCEO();
  }, [user]);

  const ceoName = userCEO?.ceo_name || 'Your CEO';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0 && !isLoadingCEO) {
      setMessages([{
        role: 'assistant',
        content: `Hello! I'm ${ceoName}, your AI CEO.

I'm here to help you build a profitable business. What would you like to work on today?`,
        timestamp: new Date(),
      }]);
    }
  }, [isOpen, ceoName, isLoadingCEO]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !session) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    let assistantContent = '';

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ceo-agent-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map(m => ({
              role: m.role,
              content: m.content,
            })),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response body');

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }]);

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantContent += content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: 'assistant',
                    content: assistantContent,
                    timestamp: new Date(),
                  };
                  return newMessages;
                });
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive',
      });
      setMessages(prev => prev.filter(m => m.content !== ''));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: `Chat cleared. What would you like to work on?`,
      timestamp: new Date(),
    }]);
  };

  return (
    <>
      <AnimatePresence>
        {showVoiceCall && userCEO && (
          <CEOVoiceCall 
            onClose={() => setShowVoiceCall(false)} 
            ceoName={userCEO.ceo_name}
            ceoImageUrl={userCEO.ceo_image_url}
            voiceId={userCEO.voice_id}
            persona={userCEO.persona}
          />
        )}
        {showVoiceCall && !userCEO && (
          <CEOVoiceCall onClose={() => setShowVoiceCall(false)} />
        )}
      </AnimatePresence>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button 
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
            size="icon"
          >
            <MessageSquare className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px] flex flex-col p-0">
          <SheetHeader className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {userCEO?.ceo_image_url ? (
                  <img 
                    src={userCEO.ceo_image_url} 
                    alt={ceoName}
                    className="w-10 h-10 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Bot className="w-5 h-5 text-primary-foreground" />
                  </div>
                )}
                <div>
                  <SheetTitle>Talk to {ceoName}</SheetTitle>
                  <p className="text-xs text-muted-foreground">Your AI CEO</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowVoiceCall(true)}
                >
                  <Phone className="w-4 h-4 mr-1" />
                  Call
                </Button>
                <Button variant="ghost" size="sm" onClick={clearChat}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <AnimatePresence mode="popLayout">
              {messages.map((message, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    message.role === 'user' 
                      ? 'bg-primary/20' 
                      : 'bg-gradient-to-br from-primary to-accent'
                  }`}>
                    {message.role === 'user' 
                      ? <User className="w-4 h-4 text-primary" />
                      : <Sparkles className="w-4 h-4 text-primary-foreground" />
                    }
                  </div>
                  <div className={`flex-1 max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}>
                    <div className={`inline-block p-3 rounded-xl ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {isLoading && messages[messages.length - 1]?.content === '' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
                </div>
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-sm text-muted-foreground">Thinking...</p>
                </div>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Textarea
                placeholder="Ask your CEO anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[60px] max-h-[120px] resize-none"
                disabled={isLoading}
              />
              <Button 
                onClick={sendMessage} 
                disabled={isLoading || !input.trim()}
                className="h-auto"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
