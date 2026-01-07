import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StreamingMessage } from './StreamingMessage';
import { SuggestionChips } from './SuggestionChips';
import { cn } from '@/lib/utils';
import type { Message } from './V0Builder';

interface ChatPanelProps {
  messages: Message[];
  isGenerating: boolean;
  onSendMessage: (content: string) => void;
  project: {
    name: string;
    industry: string;
    description: string;
  };
  specs?: any;
}

export function ChatPanel({
  messages,
  isGenerating,
  onSendMessage,
  project,
  specs,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = () => {
    if (!input.trim() || isGenerating) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onSendMessage(suggestion);
  };

  const suggestions = [
    `Generate a modern landing page for ${project.name}`,
    'Add a contact form with validation',
    'Create a pricing section with 3 tiers',
    'Add smooth scroll animations',
  ];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">AI Website Builder</h3>
            <p className="text-xs text-muted-foreground">Describe what you want to build</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="py-4 space-y-4">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-8"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h4 className="text-lg font-semibold mb-2 text-foreground">
                Let's build your website
              </h4>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                Describe what you want, and I'll generate a complete React website for you.
              </p>
              <SuggestionChips
                suggestions={suggestions}
                onSelect={handleSuggestionClick}
              />
            </motion.div>
          ) : (
            messages.map((message) => (
              <StreamingMessage key={message.id} message={message} />
            ))
          )}
          
          {isGenerating && messages[messages.length - 1]?.role !== 'assistant' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-muted-foreground"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Generating...</span>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t border-border">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to build..."
            className={cn(
              "min-h-[80px] max-h-[200px] pr-12 resize-none",
              "bg-muted/50 border-border focus:border-primary/50",
              "text-foreground placeholder:text-muted-foreground"
            )}
            disabled={isGenerating}
          />
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!input.trim() || isGenerating}
            className="absolute bottom-2 right-2 h-8 w-8"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
