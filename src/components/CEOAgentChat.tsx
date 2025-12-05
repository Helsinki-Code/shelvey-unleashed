import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader2, Sparkles, RefreshCw, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CEOTaskDelegation } from './CEOTaskDelegation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface CEOAgentChatProps {
  projectId?: string;
  showDelegation?: boolean;
}

export const CEOAgentChat = ({ projectId, showDelegation = true }: CEOAgentChatProps) => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDelegationPanel, setShowDelegationPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add welcome message on first load
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `Hello! I'm your CEO Agent - your AI business strategist and executor.

I'm here to help you build a profitable business from the ground up. Let's start by understanding your situation:

1. **What are your interests or areas of expertise?**
2. **What's your available capital for starting a business?**
3. **How much time can you dedicate weekly?**

Once I understand your situation, I'll conduct deep market research to identify the highest-profit opportunities for YOU in today's market. Then we'll build it together, step by step.

What would you like to focus on?`,
        timestamp: new Date(),
      }]);
    }
  }, []);

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

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response body');

      // Add empty assistant message to update
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

        // Process SSE lines
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
              // Ignore parse errors for incomplete JSON
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
      // Remove loading message on error
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
      content: `Chat cleared. Let's start fresh!

What business opportunity would you like to explore today?`,
      timestamp: new Date(),
    }]);
  };

  return (
    <div className="flex gap-4">
      {/* Delegation Panel */}
      {showDelegation && showDelegationPanel && (
        <motion.div
          initial={{ opacity: 0, x: -20, width: 0 }}
          animate={{ opacity: 1, x: 0, width: 'auto' }}
          exit={{ opacity: 0, x: -20, width: 0 }}
          className="w-[400px] flex-shrink-0"
        >
          <CEOTaskDelegation projectId={projectId} />
        </motion.div>
      )}

      <Card className="glass-morphism cyber-border h-[600px] flex flex-col flex-1">
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="cyber-text text-lg">CEO Agent</CardTitle>
                <p className="text-xs text-muted-foreground">AI Business Strategist</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {showDelegation && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowDelegationPanel(!showDelegationPanel)}
                  className="gap-2"
                >
                  {showDelegationPanel ? <ChevronLeft className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                  {showDelegationPanel ? 'Hide' : 'Delegate'}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={clearChat}>
                <RefreshCw className="w-4 h-4 mr-2" />
                New Chat
              </Button>
            </div>
          </div>
        </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
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
                  <p className="text-xs text-muted-foreground mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
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
        <div className="p-4 border-t border-border/50">
          <div className="flex gap-2">
            <Textarea
              placeholder="Ask your CEO Agent anything about building a business..."
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
        </CardContent>
      </Card>
    </div>
  );
};
