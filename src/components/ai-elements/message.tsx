import { forwardRef, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageProps {
  children: ReactNode;
  from: 'user' | 'assistant' | 'system';
  className?: string;
}

export const Message = forwardRef<HTMLDivElement, MessageProps>(
  ({ children, from, className }, ref) => {
    const isUser = from === 'user';

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "flex gap-3",
          isUser && "flex-row-reverse",
          className
        )}
      >
        <MessageAvatar from={from} />
        <div className={cn(
          "flex-1 min-w-0",
          isUser && "flex flex-col items-end"
        )}>
          {children}
        </div>
      </motion.div>
    );
  }
);
Message.displayName = 'Message';

interface MessageAvatarProps {
  from: 'user' | 'assistant' | 'system';
}

export function MessageAvatar({ from }: MessageAvatarProps) {
  const isUser = from === 'user';

  return (
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
  );
}

interface MessageContentProps {
  children: ReactNode;
  isUser?: boolean;
  className?: string;
}

export function MessageContent({ children, isUser, className }: MessageContentProps) {
  return (
    <div className={cn(
      "inline-block rounded-2xl px-4 py-2.5 max-w-[90%]",
      isUser 
        ? "bg-primary text-primary-foreground rounded-tr-sm" 
        : "bg-muted text-foreground rounded-tl-sm",
      className
    )}>
      {children}
    </div>
  );
}

interface MessageTimestampProps {
  timestamp: Date;
}

export function MessageTimestamp({ timestamp }: MessageTimestampProps) {
  return (
    <p className="text-[10px] text-muted-foreground mt-1">
      {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </p>
  );
}
