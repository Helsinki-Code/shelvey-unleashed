import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Check, Circle, Loader2, Lock, ChevronRight, Eye, 
  MessageSquare, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Phase {
  id: string;
  name: string;
  status: 'completed' | 'active' | 'locked';
  progress: number;
  deliverables: Deliverable[];
}

interface Deliverable {
  id: string;
  name: string;
  status: 'completed' | 'in_progress' | 'pending';
  progress?: number;
}

interface ProjectJourneyViewProps {
  project: {
    id: string;
    name: string;
    description?: string;
    status: string;
    currentPhase: number;
  };
  phases: Phase[];
  onBack: () => void;
  onViewDeliverable?: (deliverableId: string) => void;
  onTalkToAI?: (context: string) => void;
}

export const ProjectJourneyView = ({
  project,
  phases,
  onBack,
  onViewDeliverable,
  onTalkToAI,
}: ProjectJourneyViewProps) => {
  const [selectedPhase, setSelectedPhase] = useState<Phase | null>(
    phases.find(p => p.status === 'active') || null
  );

  const getPhaseIcon = (status: Phase['status']) => {
    switch (status) {
      case 'completed':
        return <Check className="w-5 h-5 text-primary-foreground" />;
      case 'active':
        return <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" />;
      case 'locked':
        return <Lock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getDeliverableIcon = (status: Deliverable['status']) => {
    switch (status) {
      case 'completed':
        return <Check className="w-4 h-4 text-primary" />;
      case 'in_progress':
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case 'pending':
        return <Circle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="text-muted-foreground">{project.description}</p>
            )}
          </div>
        </div>
        <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
          {project.status}
        </Badge>
      </div>

      {/* Journey Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Business Journey</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute top-5 left-0 right-0 h-1 bg-muted rounded-full">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ 
                  width: `${(phases.filter(p => p.status === 'completed').length / phases.length) * 100}%` 
                }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {/* Phase Nodes */}
            <div className="relative flex justify-between">
              {phases.map((phase, index) => (
                <button
                  key={phase.id}
                  onClick={() => phase.status !== 'locked' && setSelectedPhase(phase)}
                  disabled={phase.status === 'locked'}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      phase.status === 'completed'
                        ? 'bg-primary'
                        : phase.status === 'active'
                        ? 'bg-primary ring-4 ring-primary/20'
                        : 'bg-muted'
                    } ${
                      phase.status !== 'locked' 
                        ? 'cursor-pointer group-hover:scale-110' 
                        : 'cursor-not-allowed'
                    }`}
                  >
                    {getPhaseIcon(phase.status)}
                  </div>
                  <span className={`text-xs font-medium ${
                    phase.status === 'locked' ? 'text-muted-foreground' : ''
                  }`}>
                    {phase.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {phase.status === 'completed' && 'Completed'}
                    {phase.status === 'active' && 'In Progress'}
                    {phase.status === 'locked' && 'Locked'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Work Section */}
      {selectedPhase && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Preview Panel */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Preview
              </CardTitle>
              <Button variant="outline" size="sm">
                Open Full Preview
              </Button>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border">
                <div className="text-center text-muted-foreground">
                  <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {selectedPhase.status === 'active' 
                      ? 'Preview will appear here as work is completed'
                      : selectedPhase.status === 'completed'
                      ? 'Click to view completed work'
                      : 'This phase has not started yet'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Work Items Panel */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">
                Work Items - {selectedPhase.name}
              </CardTitle>
              <Badge variant="outline">
                {selectedPhase.deliverables.filter(d => d.status === 'completed').length}/
                {selectedPhase.deliverables.length} Complete
              </Badge>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                  {selectedPhase.deliverables.map((deliverable) => (
                    <div
                      key={deliverable.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => onViewDeliverable?.(deliverable.id)}
                    >
                      {getDeliverableIcon(deliverable.status)}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${
                          deliverable.status === 'completed' ? 'line-through text-muted-foreground' : ''
                        }`}>
                          {deliverable.name}
                        </p>
                        {deliverable.status === 'in_progress' && deliverable.progress !== undefined && (
                          <div className="flex items-center gap-2 mt-1">
                            <Progress value={deliverable.progress} className="h-1 flex-1" />
                            <span className="text-xs text-muted-foreground">{deliverable.progress}%</span>
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="mt-4 pt-4 border-t">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => onTalkToAI?.(`Discuss ${selectedPhase.name} phase`)}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Need changes? Tell AI
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
