import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { WarRoomState, OrchestratorPhase } from '@/types/agent';

interface GlobalProgressProps {
  state: WarRoomState;
  className?: string;
}

const PHASE_LABELS: Record<OrchestratorPhase, string> = {
  idle: 'Idle',
  initializing: 'Initializing',
  crawling: 'Crawling Website',
  keyword_research: 'Keyword Research',
  serp_analysis: 'SERP Analysis',
  content_strategy: 'Content Strategy',
  outline_generation: 'Outline Generation',
  article_writing: 'Article Writing',
  ai_overview_optimization: 'AI Overview Optimization',
  internal_linking: 'Internal Linking',
  image_generation: 'Image Generation',
  rank_tracking: 'Rank Tracking',
  analytics: 'Analytics',
  content_optimization: 'Content Optimization',
  indexing_prediction: 'Indexing Prediction',
  link_validation: 'Link Validation',
  report_generation: 'Report Generation',
  completed: 'Completed',
};

export function GlobalProgress({ state, className }: GlobalProgressProps) {
  const activeCount = state.agentTasks.filter(a => a.status === 'working').length;
  const completedCount = state.agentTasks.filter(a => a.status === 'completed').length;
  const pendingApprovals = state.approvals.length;

  return (
    <div className={cn("flex items-center gap-4 p-3 border-b border-border bg-card/50", className)}>
      <div className="flex items-center gap-2 min-w-0">
        <div className={cn("w-2 h-2 rounded-full", state.isActive ? "bg-green-500 animate-pulse" : "bg-muted-foreground/40")} />
        <span className="text-sm font-medium truncate">{PHASE_LABELS[state.currentPhase]}</span>
      </div>

      <div className="flex-1 max-w-xs">
        <Progress value={state.overallProgress} className="h-2" />
      </div>
      <span className="text-xs font-mono text-muted-foreground">{Math.round(state.overallProgress)}%</span>

      <div className="flex items-center gap-3 text-xs">
        <Badge variant="secondary" className="gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          {activeCount} Active
        </Badge>
        <Badge variant="outline">{completedCount} Done</Badge>
        {pendingApprovals > 0 && (
          <Badge variant="destructive" className="animate-pulse">
            {pendingApprovals} Approval{pendingApprovals > 1 ? 's' : ''}
          </Badge>
        )}
      </div>
    </div>
  );
}
