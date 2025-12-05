import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, teamId, managerId, deliverableId, agentId, taskDescription, content, feedback } = await req.json();

    // Get the team and manager info
    const { data: team } = await supabase
      .from('teams')
      .select('*, team_members(*)')
      .eq('id', teamId)
      .single();

    if (!team) {
      throw new Error('Team not found');
    }

    const manager = team.team_members?.find((m: any) => m.role === 'manager');
    
    // Update manager status
    if (manager) {
      await supabase
        .from('team_members')
        .update({ status: 'working', current_task: `${action}` })
        .eq('id', manager.id);
    }

    let result: any = {};

    switch (action) {
      case 'assign_task':
        // Manager assigns a deliverable to a team member
        const { data: deliverable } = await supabase
          .from('phase_deliverables')
          .update({ 
            assigned_agent_id: agentId,
            status: 'in_progress'
          })
          .eq('id', deliverableId)
          .select()
          .single();

        // Update the assigned agent's status
        await supabase
          .from('team_members')
          .update({ 
            status: 'working',
            current_task: deliverable?.name
          })
          .eq('agent_id', agentId);

        result = { success: true, deliverable };
        break;

      case 'submit_for_review':
        // Team member submits work for manager review
        await supabase
          .from('phase_deliverables')
          .update({
            status: 'review',
            content: content,
            reviewed_by: managerId
          })
          .eq('id', deliverableId);

        // Reset the agent's status
        await supabase
          .from('team_members')
          .update({ status: 'idle', current_task: null })
          .eq('agent_id', agentId);

        // Set manager to reviewing
        if (manager) {
          await supabase
            .from('team_members')
            .update({ status: 'reviewing', current_task: 'Reviewing deliverable' })
            .eq('id', manager.id);
        }

        result = { success: true, message: 'Submitted for review' };
        break;

      case 'approve_deliverable':
        // Manager approves the deliverable
        await supabase
          .from('phase_deliverables')
          .update({
            status: 'approved',
            approved_by: managerId,
            approved_at: new Date().toISOString()
          })
          .eq('id', deliverableId);

        result = { success: true, message: 'Deliverable approved' };
        break;

      case 'reject_deliverable':
        // Manager rejects with feedback
        await supabase
          .from('phase_deliverables')
          .update({
            status: 'rejected',
            feedback: feedback
          })
          .eq('id', deliverableId);

        // Get the deliverable to find assigned agent
        const { data: rejectedDeliverable } = await supabase
          .from('phase_deliverables')
          .select('assigned_agent_id, name')
          .eq('id', deliverableId)
          .single();

        // Reassign to the agent
        if (rejectedDeliverable?.assigned_agent_id) {
          await supabase
            .from('team_members')
            .update({ 
              status: 'working',
              current_task: `Revising: ${rejectedDeliverable.name}`
            })
            .eq('agent_id', rejectedDeliverable.assigned_agent_id);
        }

        result = { success: true, message: 'Deliverable rejected with feedback' };
        break;

      case 'get_team_status':
        const { data: teamMembers } = await supabase
          .from('team_members')
          .select('*')
          .eq('team_id', teamId);

        const { data: teamDeliverables } = await supabase
          .from('phase_deliverables')
          .select('*')
          .eq('assigned_team_id', teamId);

        result = { 
          team,
          members: teamMembers,
          deliverables: teamDeliverables,
          stats: {
            totalMembers: teamMembers?.length || 0,
            working: teamMembers?.filter((m: any) => m.status === 'working').length || 0,
            idle: teamMembers?.filter((m: any) => m.status === 'idle').length || 0,
            pendingDeliverables: teamDeliverables?.filter((d: any) => d.status === 'pending').length || 0,
            inProgress: teamDeliverables?.filter((d: any) => d.status === 'in_progress').length || 0,
            completed: teamDeliverables?.filter((d: any) => d.status === 'approved').length || 0
          }
        };
        break;

      case 'auto_assign_deliverables':
        // Automatically assign pending deliverables to idle team members
        const { data: pendingDeliverables } = await supabase
          .from('phase_deliverables')
          .select('*')
          .eq('assigned_team_id', teamId)
          .eq('status', 'pending');

        const { data: idleMembers } = await supabase
          .from('team_members')
          .select('*')
          .eq('team_id', teamId)
          .eq('status', 'idle')
          .in('role', ['member', 'lead']);

        const assignments: any[] = [];
        if (pendingDeliverables && idleMembers) {
          for (let i = 0; i < Math.min(pendingDeliverables.length, idleMembers.length); i++) {
            const deliverable = pendingDeliverables[i];
            const member = idleMembers[i];

            await supabase
              .from('phase_deliverables')
              .update({ 
                assigned_agent_id: member.agent_id,
                status: 'in_progress'
              })
              .eq('id', deliverable.id);

            await supabase
              .from('team_members')
              .update({ 
                status: 'working',
                current_task: deliverable.name
              })
              .eq('id', member.id);

            assignments.push({ deliverable: deliverable.name, agent: member.agent_name });
          }
        }

        result = { success: true, assignments };
        break;

      default:
        result = { error: 'Unknown action' };
    }

    // Reset manager status
    if (manager) {
      await supabase
        .from('team_members')
        .update({ status: 'active', current_task: null })
        .eq('id', manager.id);
    }

    // Log activity
    await supabase.from('agent_activity_logs').insert({
      agent_id: managerId || team.manager_agent_id,
      agent_name: manager?.agent_name || 'Team Manager',
      action: action,
      status: 'completed',
      metadata: { teamId, deliverableId, result }
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Team Manager error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
