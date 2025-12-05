import { Sparkles, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useExperienceMode } from '@/contexts/ExperienceModeContext';

export const ExperienceModeToggle = () => {
  const { mode, setMode, isBeginner } = useExperienceMode();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          {isBeginner ? (
            <>
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="hidden sm:inline text-xs">Simple</span>
            </>
          ) : (
            <>
              <Code2 className="w-4 h-4 text-accent" />
              <span className="hidden sm:inline text-xs">Expert</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem 
          onClick={() => setMode('beginner')}
          className={mode === 'beginner' ? 'bg-primary/10' : ''}
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-medium">Simple Mode</span>
              {mode === 'beginner' && <span className="text-xs text-primary ml-auto">Active</span>}
            </div>
            <span className="text-xs text-muted-foreground">
              Friendly terms, guided help, simplified views
            </span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setMode('expert')}
          className={mode === 'expert' ? 'bg-accent/10' : ''}
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-accent" />
              <span className="font-medium">Expert Mode</span>
              {mode === 'expert' && <span className="text-xs text-accent ml-auto">Active</span>}
            </div>
            <span className="text-xs text-muted-foreground">
              Full technical details, all features visible
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
