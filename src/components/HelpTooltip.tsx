import { HelpCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface HelpTooltipProps {
  title: string;
  description: string;
  learnMoreUrl?: string;
  className?: string;
}

export const HelpTooltip = ({ title, description, learnMoreUrl, className }: HelpTooltipProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={`h-5 w-5 rounded-full ${className}`}>
          <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" side="top">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">💡</span>
            <h4 className="font-semibold">What's this?</h4>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {learnMoreUrl && (
            <Button variant="link" size="sm" className="p-0 h-auto" asChild>
              <a href={learnMoreUrl} target="_blank" rel="noopener noreferrer">
                Learn More <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Common help content for technical terms
export const HELP_CONTENT = {
  mcp: {
    title: 'MCP Server',
    description: 'An "MCP Server" is like a special connection that lets your AI team use apps like Twitter, Stripe, or Gmail. Think of it as giving your AI team the right tools!',
  },
  agent: {
    title: 'AI Agent',
    description: 'An AI Agent is like a virtual team member with specific skills. Each agent specializes in one area like marketing, sales, or development.',
  },
  phase: {
    title: 'Business Phase',
    description: 'Your business journey is divided into phases: Research, Branding, Development, Content, Marketing, and Sales. Each phase must complete before the next begins.',
  },
  deliverable: {
    title: 'Deliverable',
    description: 'A deliverable is a piece of work your AI team creates for you, like a logo, website page, or marketing plan. You can review and approve each one.',
  },
  rls: {
    title: 'Row Level Security',
    description: 'This ensures your data is private and only you can see your business projects, not other users.',
  },
  apiKey: {
    title: 'API Key',
    description: 'An API key is like a password that lets your AI team connect to external services like Twitter or Stripe on your behalf.',
  },
};

export const ExplainThisButton = ({ 
  sectionName, 
  explanation 
}: { 
  sectionName: string; 
  explanation: string;
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs gap-1">
          <HelpCircle className="h-3 w-3" />
          Explain This
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96">
        <div className="space-y-3">
          <h4 className="font-semibold">{sectionName} - Explained Simply</h4>
          <p className="text-sm text-muted-foreground">{explanation}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
};
