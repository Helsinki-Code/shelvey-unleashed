import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, RotateCcw, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import type { MissionState } from '@/types/agent';

interface MissionControlBarProps {
  mission: MissionState | null;
  health: { overallStatus: string };
  connected: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
}

export function MissionControlBar({ mission, health, connected, onStart, onPause, onResume }: MissionControlBarProps) {
  const statusColors: Record<string, string> = {
    initializing: 'bg-muted',
    running: 'bg-cyber-green',
    paused: 'bg-yellow-500',
    completed: 'bg-primary',
    failed: 'bg-destructive',
  };

  const healthColors: Record<string, string> = {
    healthy: 'text-cyber-green',
    degraded: 'text-yellow-500',
    critical: 'text-destructive',
  };

  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-card/80 backdrop-blur border border-border/50 shadow-lg">
      {/* Left: Mission Info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {connected ? (
            <Wifi className="h-4 w-4 text-cyber-green animate-pulse" />
          ) : (
            <WifiOff className="h-4 w-4 text-muted-foreground" />
          )}
          <Badge variant={connected ? 'default' : 'secondary'}>
            {connected ? 'CONNECTED' : 'OFFLINE'}
          </Badge>
        </div>

        {mission ? (
          <>
            <div className="h-6 w-px bg-border" />
            <div>
              <p className="text-xs text-muted-foreground">Target</p>
              <p className="text-sm font-mono truncate max-w-[200px]">{mission.url}</p>
            </div>
            <div className="h-6 w-px bg-border" />
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge className={statusColors[mission.status] || 'bg-muted'}>
                {mission.status.toUpperCase()}
              </Badge>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">No active mission</p>
        )}
      </div>

      {/* Center: Progress */}
      {mission && (
        <div className="flex-1 max-w-md">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Mission Progress</span>
            <span>{mission.totalProgress}%</span>
          </div>
          <Progress value={mission.totalProgress} className="h-2" />
        </div>
      )}

      {/* Right: Health + Controls */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">System Health:</span>
          <span className={`font-semibold ${healthColors[health.overallStatus]}`}>
            {health.overallStatus === 'healthy' ? '● NOMINAL' : health.overallStatus === 'degraded' ? '◐ DEGRADED' : '✖ CRITICAL'}
          </span>
          {health.overallStatus !== 'healthy' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
        </div>

        <div className="h-6 w-px bg-border" />

        {!mission ? (
          <Button onClick={onStart} className="gap-2">
            <Play className="h-4 w-4" />
            Start Mission
          </Button>
        ) : mission.status === 'running' ? (
          <Button onClick={onPause} variant="secondary" className="gap-2">
            <Pause className="h-4 w-4" />
            Pause
          </Button>
        ) : mission.status === 'paused' ? (
          <Button onClick={onResume} className="gap-2">
            <Play className="h-4 w-4" />
            Resume
          </Button>
        ) : (
          <Button onClick={onStart} variant="outline" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            New Mission
          </Button>
        )}
      </div>
    </div>
  );
}
