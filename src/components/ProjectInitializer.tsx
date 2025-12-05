import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Rocket, Loader2, Briefcase, Target, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const INDUSTRIES = [
  'Technology',
  'E-commerce',
  'SaaS',
  'Healthcare',
  'Finance',
  'Education',
  'Entertainment',
  'Food & Beverage',
  'Real Estate',
  'Consulting',
  'Marketing',
  'Other'
];

interface ProjectInitializerProps {
  onProjectCreated?: (projectId: string) => void;
}

export function ProjectInitializer({ onProjectCreated }: ProjectInitializerProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    industry: '',
    targetMarket: ''
  });

  const handleCreateProject = async () => {
    if (!user || !formData.name.trim()) {
      toast.error('Please provide a project name');
      return;
    }

    setIsCreating(true);
    try {
      // Step 1: Create the business project
      const { data: project, error: projectError } = await supabase
        .from('business_projects')
        .insert({
          user_id: user.id,
          name: formData.name,
          description: formData.description || null,
          industry: formData.industry || null,
          target_market: formData.targetMarket || null,
          stage: 'research',
          status: 'active'
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Step 2: Initialize the project phases via COO Coordinator
      const { error: initError } = await supabase.functions.invoke('coo-coordinator', {
        body: {
          action: 'initialize_project',
          projectId: project.id,
          userId: user.id
        }
      });

      if (initError) {
        console.error('Phase initialization error:', initError);
        // Don't throw - project is created, phases can be initialized later
        toast.warning('Project created, but phase initialization had an issue. You can retry from the Organization page.');
      } else {
        // Log the CEO activity
        await supabase.from('agent_activity_logs').insert({
          agent_id: 'ceo-agent',
          agent_name: 'CEO Agent',
          action: `Initialized new business project: ${formData.name}`,
          status: 'completed',
          metadata: {
            project_id: project.id,
            industry: formData.industry,
            target_market: formData.targetMarket
          }
        });

        toast.success('Business project created and phases initialized! Research team is now active.');
      }

      // Reset form
      setFormData({
        name: '',
        description: '',
        industry: '',
        targetMarket: ''
      });

      onProjectCreated?.(project.id);

      // Navigate to organization page
      navigate('/organization');
    } catch (error: any) {
      console.error('Project creation error:', error);
      toast.error(error.message || 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="w-5 h-5 text-primary" />
          Launch New Business
        </CardTitle>
        <CardDescription>
          Create a new business project and let AI agents build it from research to launch
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-muted-foreground" />
            Business Name *
          </Label>
          <Input
            id="name"
            placeholder="e.g., NextGen AI Solutions"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Briefly describe your business idea..."
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="min-h-[80px]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              Industry
            </Label>
            <Select 
              value={formData.industry} 
              onValueChange={(v) => setFormData(prev => ({ ...prev, industry: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map(industry => (
                  <SelectItem key={industry} value={industry.toLowerCase()}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetMarket" className="flex items-center gap-2">
              <Target className="w-4 h-4 text-muted-foreground" />
              Target Market
            </Label>
            <Input
              id="targetMarket"
              placeholder="e.g., Small businesses, Startups"
              value={formData.targetMarket}
              onChange={(e) => setFormData(prev => ({ ...prev, targetMarket: e.target.value }))}
            />
          </div>
        </div>

        <Button 
          onClick={handleCreateProject}
          disabled={!formData.name.trim() || isCreating}
          className="w-full gap-2"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating & Initializing...
            </>
          ) : (
            <>
              <Rocket className="w-4 h-4" />
              Launch Business
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          This will create your project and automatically start the 6-phase business building process
        </p>
      </CardContent>
    </Card>
  );
}