import { motion } from 'framer-motion';
import { FileCode, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileChipProps {
  path: string;
  type?: string;
  status?: 'generating' | 'complete';
  onClick?: () => void;
  className?: string;
}

export function FileChip({ path, type, status = 'complete', onClick, className }: FileChipProps) {
  const filename = path.split('/').pop() || path;
  
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors",
        "bg-primary/10 text-primary hover:bg-primary/20",
        onClick && "cursor-pointer",
        !onClick && "cursor-default",
        className
      )}
    >
      {status === 'generating' ? (
        <motion.div
          className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      ) : (
        <FileCode className="h-3 w-3" />
      )}
      <span>{filename}</span>
      {status === 'complete' && (
        <Check className="h-3 w-3 text-green-500" />
      )}
    </motion.button>
  );
}

interface FileChipsContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function FileChipsContainer({ children, className }: FileChipsContainerProps) {
  return (
    <div className={cn("flex flex-wrap gap-2 mt-2", className)}>
      {children}
    </div>
  );
}
