import { ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getTooltip } from '@/lib/terminology';

interface HelpTooltipProps {
  term: string;
  children?: ReactNode;
  showIcon?: boolean;
  className?: string;
}

export const HelpTooltip = ({ term, children, showIcon = true, className = '' }: HelpTooltipProps) => {
  const tooltip = getTooltip(term);
  
  if (!tooltip) {
    return <span className={className}>{children || term}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`inline-flex items-center gap-1 cursor-help ${className}`}>
          {children || term}
          {showIcon && <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[280px] p-3">
        <div className="space-y-2">
          <p className="font-medium text-sm flex items-center gap-1.5">
            💡 What's this?
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {tooltip}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
