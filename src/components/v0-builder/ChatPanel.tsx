import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StreamingMessage } from './StreamingMessage';
import { SuggestionChips } from './SuggestionChips';
import { cn } from '@/lib/utils';
import type { Message } from './V0Builder';

interface ChatPanelProps {
  messages: Message[];
  isGenerating: boolean;
  onSendMessage: (content: string) => void;
  onFileClick?: (path: string) => void;
  currentGeneratingFiles?: string[];
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
  onFileClick,
  currentGeneratingFiles = [],
  project,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentGeneratingFiles]);

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

  const suggestions = [
    `Create a modern landing page for ${project.name}`,
    'Add a contact form with validation',
    'Create a pricing section with 3 tiers',
    'Build a multi-page site with navigation',
  ];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground leading-tight">
              AI Builder
            </h3>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Describe what you want to build
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-4">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="pt-8 pb-4"
            >
              <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <h4 className="text-base font-semibold mb-1.5 text-foreground">
                  What do you want to build?
                </h4>
                <p className="text-sm text-muted-foreground max-w-[260px] mx-auto">
                  Describe your website and I'll generate production-ready React code.
                </p>
              </div>
              <SuggestionChips
                suggestions={suggestions}
                onSelect={onSendMessage}
              />
            </motion.div>
          ) : (
            <>
              {messages.map((message, index) => {
                const isLastStreaming =
                  message.role === 'assistant' &&
                  message.isStreaming &&
                  index === messages.length - 1;

                return (
                  <StreamingMessage
                    key={message.id}
                    message={message}
                    generatingFiles={
                      isLastStreaming ? currentGeneratingFiles : []
                    }
                    onFileClick={onFileClick}
                  />
                );
              })}

              {/* Typing indicator */}
              <AnimatePresence>
                {isGenerating &&
                  messages.length > 0 &&
                  messages[messages.length - 1]?.role === 'user' && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="flex justify-start"
                    >
                      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {[0, 150, 300].map((delay) => (
                            <span
                              key={delay}
                              className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce"
                              style={{ animationDelay: `${delay}ms` }}
                            />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
              </AnimatePresence>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-border shrink-0">
        <div
          className={cn(
            'relative rounded-xl border transition-colors',
            'bg-muted/40 border-border',
            'focus-within:border-primary/50 focus-within:bg-muted/60'
          )}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to build…"
            disabled={isGenerating}
            rows={2}
            className={cn(
              'w-full bg-transparent px-4 pt-3 pb-10 text-sm resize-none outline-none',
              'placeholder:text-muted-foreground/60 disabled:opacity-50',
              'text-foreground'
            )}
          />
          <div className="absolute bottom-2 right-2">
            <Button
              size="icon"
              className="h-7 w-7 rounded-lg"
              disabled={!input.trim() || isGenerating}
              onClick={handleSubmit}
            >
              {isGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground/70 mt-1.5 text-center">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}