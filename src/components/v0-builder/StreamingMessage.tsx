import { motion, AnimatePresence } from 'framer-motion';
import { Message, MessageContent, MessageTimestamp, Response, removeCodeBlocksFromContent } from '@/components/ai-elements';
import { FileChip, FileChipsContainer } from '@/components/ai-elements/file-chip';
import { StatusChip } from '@/components/ai-elements/status-chip';
import type { Message as MessageType, ProjectFile } from './V0Builder';

interface StreamingMessageProps {
  message: MessageType;
  generatingFiles?: string[];
  onFileClick?: (path: string) => void;
}

export function StreamingMessage({ message, generatingFiles = [], onFileClick }: StreamingMessageProps) {
  const isUser = message.role === 'user';
  
  // Clean content: remove any code blocks that shouldn't appear in chat
  const cleanedContent = isUser 
    ? message.content 
    : removeCodeBlocksFromContent(message.content);

  return (
    <Message from={message.role}>
      <MessageContent isUser={isUser}>
        <Response isStreaming={message.isStreaming}>
          {cleanedContent || (message.isStreaming ? '' : 'Thinking...')}
        </Response>
      </MessageContent>
      
      {/* Status chips for files being generated */}
      <AnimatePresence>
        {message.isStreaming && generatingFiles.length > 0 && (
          <motion.div 
            className="mt-2 space-y-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {generatingFiles.map((file) => (
              <StatusChip 
                key={file} 
                label={`Generating ${file}...`}
                status="loading"
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completed file chips */}
      {message.files && message.files.length > 0 && (
        <FileChipsContainer>
          {message.files.map((file) => (
            <FileChip
              key={file.path}
              path={file.path}
              type={file.type}
              status="complete"
              onClick={() => onFileClick?.(file.path)}
            />
          ))}
        </FileChipsContainer>
      )}

      <MessageTimestamp timestamp={message.timestamp} />
    </Message>
  );
}
