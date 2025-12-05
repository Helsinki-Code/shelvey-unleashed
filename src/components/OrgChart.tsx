import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Crown, Users, UserCheck, User, ChevronDown, ChevronRight } from 'lucide-react';
import { DIVISIONS, STATUS_COLORS } from '@/lib/organization';

interface TeamMember {
  id: string;
  agent_id: string;
  agent_name: string;
  role: string;
  reports_to: string | null;
  status: string;
  current_task: string | null;
  team_id: string;
}

interface Team {
  id: string;
  name: string;
  division: string;
  status: string;
}

export function OrgChart() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set(['operations']));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrganization();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('org-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => {
        fetchOrganization();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        fetchOrganization();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrganization = async () => {
    const [membersRes, teamsRes] = await Promise.all([
      supabase.from('team_members').select('*'),
      supabase.from('teams').select('*')
    ]);

    if (membersRes.data) setMembers(membersRes.data);
    if (teamsRes.data) setTeams(teamsRes.data);
    setIsLoading(false);
  };

  const toggleDivision = (division: string) => {
    setExpandedDivisions(prev => {
      const next = new Set(prev);
      if (next.has(division)) {
        next.delete(division);
      } else {
        next.add(division);
      }
      return next;
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'executive': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'manager': return <Users className="w-4 h-4 text-blue-500" />;
      case 'lead': return <UserCheck className="w-4 h-4 text-green-500" />;
      default: return <User className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusDot = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-500',
      working: 'bg-yellow-500',
      reviewing: 'bg-blue-500',
      idle: 'bg-muted-foreground',
      blocked: 'bg-red-500'
    };
    return <span className={`w-2 h-2 rounded-full ${colors[status] || 'bg-muted'}`} />;
  };

  const executives = members.filter(m => m.role === 'executive');
  const ceo = executives.find(m => m.agent_id === 'ceo');

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-muted-foreground">Loading organization...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Organization Chart
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* CEO at the top */}
        {ceo && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center"
          >
            <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-lg p-4 text-center min-w-[200px]">
              <div className="flex items-center justify-center gap-2 mb-1">
                {getRoleIcon('executive')}
                <span className="font-semibold">{ceo.agent_name}</span>
              </div>
              <div className="text-xs text-muted-foreground mb-2">Chief Executive Officer</div>
              <div className="flex items-center justify-center gap-2">
                {getStatusDot(ceo.status)}
                <span className={`text-xs ${STATUS_COLORS[ceo.status as keyof typeof STATUS_COLORS]}`}>
                  {ceo.current_task || ceo.status}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* C-Suite under CEO */}
        <div className="flex justify-center gap-4">
          {executives.filter(e => e.reports_to === 'ceo').map(exec => (
            <motion.div
              key={exec.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-lg p-3 text-center min-w-[160px]"
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                {getRoleIcon('executive')}
                <span className="font-medium text-sm">{exec.agent_name}</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                {getStatusDot(exec.status)}
                <span className={`text-xs ${STATUS_COLORS[exec.status as keyof typeof STATUS_COLORS]}`}>
                  {exec.current_task || exec.status}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Divisions */}
        <div className="grid gap-3 mt-6">
          {DIVISIONS.map(division => {
            const team = teams.find(t => t.division === division.id);
            const teamMembers = members.filter(m => {
              const memberTeam = teams.find(t => t.id === m.team_id);
              return memberTeam?.division === division.id && m.role !== 'executive';
            });
            const isExpanded = expandedDivisions.has(division.id);
            const isActive = team?.status === 'active';

            return (
              <motion.div
                key={division.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`border rounded-lg overflow-hidden transition-colors ${
                  isActive ? 'border-primary/50 bg-primary/5' : 'border-border/50 bg-card/30'
                }`}
              >
                <button
                  onClick={() => toggleDivision(division.id)}
                  className="w-full flex items-center justify-between p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${division.color}`} />
                    <span className="font-medium">{division.name}</span>
                    {isActive && (
                      <Badge variant="outline" className="text-xs bg-primary/20 text-primary border-primary/30">
                        Active
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{teamMembers.length} agents</span>
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </button>

                {isExpanded && teamMembers.length > 0 && (
                  <div className="px-3 pb-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {teamMembers.map(member => (
                      <div
                        key={member.id}
                        className="bg-background/50 rounded p-2 text-sm"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {getRoleIcon(member.role)}
                          <span className="font-medium truncate">{member.agent_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {getStatusDot(member.status)}
                          <span className={`text-xs truncate ${STATUS_COLORS[member.status as keyof typeof STATUS_COLORS]}`}>
                            {member.current_task || member.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
