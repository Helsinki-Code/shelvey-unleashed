import { motion } from 'framer-motion';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type StatusType = 'loading' | 'complete' | 'error';

interface StatusChipProps {
  label: string;
  status?: StatusType;
  className?: string;
}

export function StatusChip({ label, status = 'loading', className }: StatusChipProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs",
        status === 'loading' && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
        status === 'complete' && "bg-green-500/10 text-green-600 dark:text-green-400",
        status === 'error' && "bg-red-500/10 text-red-600 dark:text-red-400",
        className
      )}
    >
      {status === 'loading' && (
        <Loader2 className="h-3 w-3 animate-spin" />
      )}
      {status === 'complete' && (
        <Check className="h-3 w-3" />
      )}
      {status === 'error' && (
        <AlertCircle className="h-3 w-3" />
      )}
      <span>{label}</span>
    </motion.div>
  );
}
