import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Check, Loader2, Lock, Eye, MessageSquare,
  ChevronRight, Settings, Globe, Sparkles, FastForward
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { HelpTooltip, HELP_CONTENT } from '@/components/HelpTooltip';
import { DeliverableContentViewer } from '@/components/DeliverableContentViewer';

interface Phase {
  id: string;
  phase_number: number;
  phase_name: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
}

interface Deliverable {
  id: string;
  name: string;
  deliverable_type: string;
  status: string;
  description: string | null;
  generated_content?: any;
}

const PHASE_INFO = [
  { name: 'Research', icon: '🔍', description: 'Market research, competitor analysis, and opportunity validation' },
  { name: 'Branding', icon: '🎨', description: 'Logo, colors, typography, and brand identity creation' },
  { name: 'Development', icon: '⚡', description: 'Website building, technical setup, and integrations' },
  { name: 'Content', icon: '📝', description: 'Copywriting, blog posts, and marketing materials' },
  { name: 'Marketing', icon: '📢', description: 'Social media, ads, and promotional campaigns' },
  { name: 'Sales', icon: '💰', description: 'Sales funnels, outreach, and revenue generation' },
];

const ProjectDetailPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [project, setProject] = useState<any>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [selectedPhase, setSelectedPhase] = useState<Phase | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && projectId) {
      fetchProjectData();
    }
  }, [user, projectId]);

  const fetchProjectData = async () => {
    try {
      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('business_projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', user!.id)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Fetch phases
      const { data: phasesData } = await supabase
        .from('business_phases')
        .select('*')
        .eq('project_id', projectId)
        .order('phase_number');

      setPhases(phasesData || []);
      
      // Set active phase as selected
      const activePhase = phasesData?.find(p => p.status === 'active');
      setSelectedPhase(activePhase || phasesData?.[0] || null);

      // Fetch deliverables for selected phase with generated_content
      if (activePhase) {
        const { data: deliverablesData } = await supabase
          .from('phase_deliverables')
          .select('id, name, deliverable_type, status, description, generated_content')
          .eq('phase_id', activePhase.id);
        
        setDeliverables(deliverablesData || []);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      toast({
        title: 'Error',
        description: 'Failed to load project',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhaseSelect = async (phase: Phase) => {
    setSelectedPhase(phase);
    
    // Fetch deliverables for this phase with generated_content
    const { data } = await supabase
      .from('phase_deliverables')
      .select('id, name, deliverable_type, status, description, generated_content')
      .eq('phase_id', phase.id);
    
    setDeliverables(data || []);
  };

  const [isApproving, setIsApproving] = useState(false);
  const [isAdvancingPhase, setIsAdvancingPhase] = useState(false);

  const handleApproveDeliverable = async (deliverableId: string) => {
    setIsApproving(true);
    try {
      // First check if CEO has already approved
      const { data: deliverable } = await supabase
        .from('phase_deliverables')
        .select('ceo_approved, user_approved')
        .eq('id', deliverableId)
        .single();

      // If CEO hasn't approved yet, trigger CEO review first
      if (!deliverable?.ceo_approved) {
        const { data: ceoReviewData, error: ceoError } = await supabase.functions.invoke('approve-deliverable', {
          body: {
            deliverableId,
            action: 'ceo_review',
          },
        });

        if (ceoError) throw ceoError;

        if (!ceoReviewData?.ceoApproved) {
          toast({
            title: 'CEO Review',
            description: ceoReviewData?.feedback || 'CEO Agent has requested revisions.',
            variant: 'destructive',
          });
          if (selectedPhase) handlePhaseSelect(selectedPhase);
          return;
        }
      }

      // Now trigger user approval
      const { data: approvalData, error: approvalError } = await supabase.functions.invoke('approve-deliverable', {
        body: {
          deliverableId,
          action: 'user_approve',
        },
      });

      if (approvalError) throw approvalError;

      // Check if phase was completed
      if (approvalData?.phaseCompleted) {
        toast({
          title: '🎉 Phase Complete!',
          description: `All deliverables approved! Moving to Phase ${approvalData.nextPhase}`,
        });
        // Refresh entire project data to show new phase
        await fetchProjectData();
      } else {
        toast({ title: 'Deliverable approved!' });
        // Refresh deliverables
        if (selectedPhase) {
          handlePhaseSelect(selectedPhase);
        }
      }
    } catch (error) {
      console.error('Approval error:', error);
      toast({
        title: 'Approval failed',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleAdvancePhase = async () => {
    if (!selectedPhase) return;
    
    setIsAdvancingPhase(true);
    try {
      const { data, error } = await supabase.functions.invoke('phase-manager', {
        body: {
          action: 'advance_phase',
          projectId: projectId,
          phaseId: selectedPhase.id,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: '🎉 Phase Advanced!',
          description: data.message || 'Moving to next phase',
        });
        await fetchProjectData();
      } else {
        toast({
          title: 'Cannot advance',
          description: data?.message || 'Not all deliverables are approved',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Advance phase error:', error);
      toast({
        title: 'Failed to advance phase',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsAdvancingPhase(false);
    }
  };

  const allDeliverablesApproved = deliverables.length > 0 && 
    deliverables.every(d => d.status === 'approved');

  const getPhaseStatus = (phaseNumber: number) => {
    const phase = phases.find(p => p.phase_number === phaseNumber);
    if (!phase) return 'locked';
    return phase.status;
  };

  const getPhaseProgress = (phaseNumber: number) => {
    const phase = phases.find(p => p.phase_number === phaseNumber);
    if (!phase || phase.status === 'pending') return 0;
    if (phase.status === 'completed') return 100;
    // Calculate based on deliverables
    const phaseDeliverables = deliverables.filter(d => selectedPhase?.id === phase.id);
    const completed = phaseDeliverables.filter(d => d.status === 'approved').length;
    return phaseDeliverables.length > 0 ? Math.round((completed / phaseDeliverables.length) * 100) : 50;
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Project not found</p>
          <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <DashboardSidebar />
      
      <main className="flex-1 ml-[260px] p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{project.name}</h1>
                <p className="text-muted-foreground">{project.description || 'No description'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                {project.status}
              </Badge>
              <Button variant="outline" size="icon">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Journey Timeline */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                Your Business Journey
                <HelpTooltip 
                  title={HELP_CONTENT.phase.title}
                  description={HELP_CONTENT.phase.description}
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Progress Line */}
                <div className="absolute top-6 left-0 right-0 h-1 bg-muted rounded-full">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ 
                      width: `${(phases.filter(p => p.status === 'completed').length / 6) * 100}%` 
                    }}
                  />
                </div>

                {/* Phase Nodes */}
                <div className="relative flex justify-between">
                  {PHASE_INFO.map((info, index) => {
                    const status = getPhaseStatus(index + 1);
                    const isSelected = selectedPhase?.phase_number === index + 1;
                    
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          const phase = phases.find(p => p.phase_number === index + 1);
                          if (phase && status !== 'pending') handlePhaseSelect(phase);
                        }}
                        disabled={status === 'pending'}
                        className="flex flex-col items-center gap-2 group"
                      >
                        <motion.div
                          whileHover={status !== 'pending' ? { scale: 1.1 } : {}}
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all ${
                            status === 'completed'
                              ? 'bg-primary'
                              : status === 'active'
                              ? 'bg-primary ring-4 ring-primary/20'
                              : 'bg-muted'
                          } ${isSelected ? 'ring-4 ring-accent' : ''} ${
                            status !== 'pending' ? 'cursor-pointer' : 'cursor-not-allowed'
                          }`}
                        >
                          {status === 'completed' ? (
                            <Check className="w-5 h-5 text-primary-foreground" />
                          ) : status === 'pending' ? (
                            <Lock className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <span>{info.icon}</span>
                          )}
                        </motion.div>
                        <span className={`text-xs font-medium ${
                          status === 'pending' ? 'text-muted-foreground' : ''
                        }`}>
                          {info.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {status === 'completed' && 'Complete'}
                          {status === 'active' && 'In Progress'}
                          {status === 'pending' && 'Locked'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Phase Details */}
          {selectedPhase && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Preview */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Preview
                  </CardTitle>
                  <Button variant="outline" size="sm">
                    <Globe className="w-4 h-4 mr-2" />
                    Open Full Preview
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border-2 border-dashed">
                    <div className="text-center text-muted-foreground p-4">
                      {selectedPhase.status === 'active' ? (
                        <>
                          <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin opacity-50" />
                          <p className="text-sm">Your AI team is working on this phase</p>
                          <p className="text-xs mt-1">Preview will update as work completes</p>
                        </>
                      ) : selectedPhase.status === 'completed' ? (
                        <>
                          <Check className="w-8 h-8 mx-auto mb-2 text-primary" />
                          <p className="text-sm">Phase completed!</p>
                          <Button variant="link" size="sm" className="mt-2">
                            View deliverables
                          </Button>
                        </>
                      ) : (
                        <>
                          <Lock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Complete previous phases first</p>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Work Items */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    Work Items - {PHASE_INFO[selectedPhase.phase_number - 1]?.name}
                    <HelpTooltip 
                      title={HELP_CONTENT.deliverable.title}
                      description={HELP_CONTENT.deliverable.description}
                    />
                  </CardTitle>
                  <Badge variant="outline">
                    {deliverables.filter(d => d.status === 'approved').length}/{deliverables.length} Complete
                  </Badge>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-4">
                    {deliverables.length > 0 ? (
                      <div className="space-y-3">
                        {deliverables.map((deliverable) => (
                          <DeliverableContentViewer
                            key={deliverable.id}
                            deliverable={deliverable}
                            onApprove={handleApproveDeliverable}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Deliverables will appear as work begins</p>
                      </div>
                    )}
                  </ScrollArea>

                  <div className="mt-4 pt-4 border-t space-y-2">
                    {/* Manual Advance Phase Button */}
                    {allDeliverablesApproved && selectedPhase?.status === 'active' && (
                      <Button 
                        className="w-full" 
                        onClick={handleAdvancePhase}
                        disabled={isAdvancingPhase}
                      >
                        {isAdvancingPhase ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <FastForward className="w-4 h-4 mr-2" />
                        )}
                        Advance to Next Phase
                      </Button>
                    )}
                    <Button variant="outline" className="w-full" onClick={() => navigate('/dashboard')}>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Need changes? Talk to CEO
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Phase Description */}
          {selectedPhase && (
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{PHASE_INFO[selectedPhase.phase_number - 1]?.icon}</span>
                  <div>
                    <h3 className="font-semibold">{PHASE_INFO[selectedPhase.phase_number - 1]?.name} Phase</h3>
                    <p className="text-sm text-muted-foreground">
                      {PHASE_INFO[selectedPhase.phase_number - 1]?.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default ProjectDetailPage;
