import { motion, AnimatePresence } from 'framer-motion';
import { FileCode, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message, ProjectFile } from './V0Builder';

interface StreamingMessageProps {
  message: Message;
  generatingFiles?: string[];
  onFileClick?: (path: string) => void;
}

function removeCodeBlocks(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .trim();
}

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function StreamingMessage({
  message,
  generatingFiles = [],
  onFileClick,
}: StreamingMessageProps) {
  const isUser = message.role === 'user';
  const cleanedContent = isUser
    ? message.content
    : removeCodeBlocks(message.content);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
    >
      <div className="max-w-[88%] space-y-1.5">
        {/* Message bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-muted text-foreground rounded-bl-md'
          )}
        >
          <p className="whitespace-pre-wrap">
            {cleanedContent || (message.isStreaming ? '' : 'Thinking…')}
          </p>
          {message.isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse rounded-full align-middle" />
          )}
        </div>

        {/* Generating status chips */}
        <AnimatePresence>
          {message.isStreaming && generatingFiles.length > 0 && (
            <motion.div
              className="space-y-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {generatingFiles.map((file) => (
                <div
                  key={file}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/5 border border-primary/10 text-xs text-primary"
                >
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Generating {file.split('/').pop()}…
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Completed file chips */}
        {message.files && message.files.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.files.map((file) => (
              <button
                key={file.path}
                onClick={() => onFileClick?.(file.path)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors',
                  'bg-muted/60 border border-border/50',
                  'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <FileCode className="h-3 w-3" />
                {file.path.split('/').pop()}
              </button>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <p
          className={cn(
            'text-[10px] text-muted-foreground/50',
            isUser ? 'text-right' : 'text-left'
          )}
        >
          {formatTimestamp(message.timestamp)}
        </p>
      </div>
    </motion.div>
  );
}