import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ResponseProps {
  children: ReactNode;
  isStreaming?: boolean;
  className?: string;
}

/**
 * Response component for rendering AI responses with streaming support.
 * Renders clean text content with proper formatting.
 */
export function Response({ children, isStreaming, className }: ResponseProps) {
  return (
    <div className={cn("text-sm whitespace-pre-wrap", className)}>
      {children}
      {isStreaming && (
        <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse" />
      )}
    </div>
  );
}

/**
 * Removes code blocks from content for display in chat.
 * Code blocks are handled separately via file events.
 */
export function removeCodeBlocksFromContent(content: string): string {
  // Remove complete fenced code blocks (```language:path ... ```)
  let cleaned = content.replace(/```[\w]*:[^\n]*\n[\s\S]*?```/g, '');
  
  // Remove any standalone ``` markers
  cleaned = cleaned.replace(/```[\w]*\n[\s\S]*?```/g, '');
  
  // Clean up excessive whitespace but preserve paragraph structure
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned.trim();
}
