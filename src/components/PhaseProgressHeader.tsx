import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { getPhaseAgent } from '@/lib/phase-agents';

interface PhaseProgressHeaderProps {
  projectId: string;
  projectName?: string;
  phaseNumber: number;
  phaseStatus: string;
  deliverables: { ceo_approved: boolean | null; user_approved: boolean | null }[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function PhaseProgressHeader({
  projectId,
  projectName,
  phaseNumber,
  phaseStatus,
  deliverables,
  onRefresh,
  isRefreshing,
}: PhaseProgressHeaderProps) {
  const navigate = useNavigate();
  const agent = getPhaseAgent(phaseNumber);
  const Icon = agent?.icon;

  const approvedCount = deliverables.filter(d => d.ceo_approved && d.user_approved).length;
  const progress = deliverables.length > 0 
    ? Math.round((approvedCount / deliverables.length) * 100) 
    : 0;

  const statusColor = {
    active: 'bg-green-500',
    completed: 'bg-blue-500',
    pending: 'bg-muted',
  }[phaseStatus] || 'bg-muted';

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate(`/projects/${projectId}`)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Project
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {Icon && <Icon className="w-6 h-6 text-primary" />}
              Phase {phaseNumber}: {agent?.phaseName}
            </h1>
            {projectName && <p className="text-muted-foreground">{projectName}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
          <Badge className={statusColor}>
            {phaseStatus || 'pending'}
          </Badge>
          <PageHeader showNotifications={true} showLogout={true} />
        </div>
      </div>

      {/* Progress Bar */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Phase Progress</span>
            <span className="font-bold text-lg">{progress}%</span>
          </div>
          <Progress value={progress} className="h-3" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{approvedCount} of {deliverables.length} deliverables approved</span>
            <span>{phaseStatus === 'completed' ? 'Phase Complete!' : 'In Progress'}</span>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
