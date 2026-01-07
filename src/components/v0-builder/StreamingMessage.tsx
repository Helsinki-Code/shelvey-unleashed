import { motion } from 'framer-motion';
import { User, Bot, FileCode, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message } from './V0Builder';

interface StreamingMessageProps {
  message: Message;
}

export function StreamingMessage({ message }: StreamingMessageProps) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex gap-3",
        isUser && "flex-row-reverse"
      )}
    >
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
        isUser 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted text-foreground"
      )}>
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      {/* Content */}
      <div className={cn(
        "flex-1 space-y-2",
        isUser && "text-right"
      )}>
        <div className={cn(
          "inline-block rounded-2xl px-4 py-2.5 max-w-[85%]",
          isUser 
            ? "bg-primary text-primary-foreground rounded-tr-sm" 
            : "bg-muted text-foreground rounded-tl-sm"
        )}>
          <p className="text-sm whitespace-pre-wrap">
            {message.content}
            {message.isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse" />
            )}
          </p>
        </div>

        {/* Generated Files */}
        {message.files && message.files.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.files.map((file) => (
              <motion.div
                key={file.path}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs"
              >
                <FileCode className="h-3 w-3" />
                {file.path.split('/').pop()}
              </motion.div>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <p className="text-[10px] text-muted-foreground">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </motion.div>
  );
}
