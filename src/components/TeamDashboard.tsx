import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { DIVISIONS } from '@/lib/organization';
import { Users, Play, Pause, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Team {
  id: string;
  name: string;
  division: string;
  status: string;
  manager_agent_id: string;
}

interface TeamMember {
  id: string;
  agent_id: string;
  agent_name: string;
  role: string;
  status: string;
  current_task: string | null;
}

interface Deliverable {
  id: string;
  name: string;
  status: string;
  assigned_agent_id: string | null;
}

export function TeamDashboard() {
  const [activeTeams, setActiveTeams] = useState<Team[]>([]);
  const [teamData, setTeamData] = useState<Record<string, { members: TeamMember[]; deliverables: Deliverable[] }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [autoAssigning, setAutoAssigning] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveTeams();

    const channel = supabase
      .channel('team-dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        fetchActiveTeams();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => {
        fetchActiveTeams();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'phase_deliverables' }, () => {
        fetchActiveTeams();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchActiveTeams = async () => {
    const { data: teams } = await supabase
      .from('teams')
      .select('*')
      .eq('status', 'active');

    if (teams) {
      setActiveTeams(teams);
      
      // Fetch members and deliverables for each active team
      const teamDataMap: Record<string, { members: TeamMember[]; deliverables: Deliverable[] }> = {};
      
      for (const team of teams) {
        const [membersRes, deliverablesRes] = await Promise.all([
          supabase.from('team_members').select('*').eq('team_id', team.id),
          supabase.from('phase_deliverables').select('*').eq('assigned_team_id', team.id)
        ]);

        teamDataMap[team.id] = {
          members: membersRes.data || [],
          deliverables: deliverablesRes.data || []
        };
      }

      setTeamData(teamDataMap);
    }
    setIsLoading(false);
  };

  const handleAutoAssign = async (teamId: string) => {
    setAutoAssigning(teamId);
    try {
      const response = await supabase.functions.invoke('team-manager', {
        body: { action: 'auto_assign_deliverables', teamId }
      });

      if (response.error) throw response.error;
      
      const assignments = response.data.assignments || [];
      if (assignments.length > 0) {
        toast.success(`Assigned ${assignments.length} tasks to team members`);
      } else {
        toast.info('No pending tasks to assign or no idle members available');
      }
      
      fetchActiveTeams();
    } catch (error: any) {
      toast.error(error.message || 'Failed to auto-assign tasks');
    } finally {
      setAutoAssigning(null);
    }
  };

  const getDivisionColor = (division: string) => {
    const div = DIVISIONS.find(d => d.id === division);
    return div?.color || 'from-gray-500 to-slate-500';
  };

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activeTeams.length === 0) {
    return (
      <Card className="bg-card/50 backdrop-blur border-primary/20">
        <CardContent className="p-6 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No active teams at the moment</p>
          <p className="text-sm text-muted-foreground mt-1">
            Teams activate as business phases progress
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {activeTeams.map(team => {
        const data = teamData[team.id] || { members: [], deliverables: [] };
        const workingCount = data.members.filter(m => m.status === 'working').length;
        const idleCount = data.members.filter(m => m.status === 'idle').length;
        const completedDeliverables = data.deliverables.filter(d => d.status === 'approved').length;
        const totalDeliverables = data.deliverables.length;
        const progress = totalDeliverables > 0 ? Math.round((completedDeliverables / totalDeliverables) * 100) : 0;

        return (
          <motion.div
            key={team.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-card/50 backdrop-blur border-primary/20 overflow-hidden">
              <div className={`h-1 bg-gradient-to-r ${getDivisionColor(team.division)}`} />
              
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg">{team.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {workingCount} working • {idleCount} idle
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAutoAssign(team.id)}
                  disabled={autoAssigning === team.id}
                  className="gap-2"
                >
                  {autoAssigning === team.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Auto-Assign
                </Button>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Progress */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Deliverables Progress</span>
                    <span>{completedDeliverables}/{totalDeliverables}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                {/* Team Members Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {data.members.filter(m => m.role !== 'executive').map(member => (
                    <div
                      key={member.id}
                      className={`p-2 rounded border ${
                        member.status === 'working' 
                          ? 'border-yellow-500/30 bg-yellow-500/5' 
                          : member.status === 'reviewing'
                          ? 'border-blue-500/30 bg-blue-500/5'
                          : 'border-border/50 bg-background/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full ${
                          member.status === 'working' ? 'bg-yellow-500 animate-pulse' :
                          member.status === 'reviewing' ? 'bg-blue-500' :
                          member.status === 'active' ? 'bg-green-500' :
                          'bg-muted-foreground'
                        }`} />
                        <span className="text-sm font-medium truncate">{member.agent_name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {member.current_task || member.status}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Deliverables */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Deliverables</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {data.deliverables.map(deliverable => {
                      const statusColors: Record<string, string> = {
                        pending: 'bg-muted text-muted-foreground',
                        in_progress: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
                        review: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
                        approved: 'bg-green-500/20 text-green-500 border-green-500/30',
                        rejected: 'bg-red-500/20 text-red-500 border-red-500/30'
                      };

                      return (
                        <div
                          key={deliverable.id}
                          className={`px-3 py-2 rounded border text-sm ${statusColors[deliverable.status]}`}
                        >
                          <div className="font-medium truncate">{deliverable.name}</div>
                          <div className="text-xs capitalize mt-1">
                            {deliverable.status.replace('_', ' ')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
