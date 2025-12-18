import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TRADING_PHASES = [
  { number: 1, name: 'Research', agentId: 'research-agent' },
  { number: 2, name: 'Strategy', agentId: 'strategy-agent' },
  { number: 3, name: 'Setup', agentId: 'setup-agent' },
  { number: 4, name: 'Execution', agentId: 'execution-agent' },
  { number: 5, name: 'Monitor', agentId: 'monitor-agent' },
  { number: 6, name: 'Optimize', agentId: 'optimize-agent' }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, userId, projectId, params } = await req.json();
    console.log(`Trading Project Worker: ${action}`, { userId, projectId, params });

    switch (action) {
      case 'create_project': {
        const { name, exchange, mode, capital, riskLevel } = params;
        
        // Create project
        const { data: project, error: projectError } = await supabase
          .from('trading_projects')
          .insert({
            user_id: userId,
            name,
            exchange,
            mode,
            capital,
            risk_level: riskLevel,
            status: 'active',
            current_phase: 1
          })
          .select()
          .single();

        if (projectError) throw projectError;

        // Create all 6 phases
        const phases = TRADING_PHASES.map(phase => ({
          project_id: project.id,
          user_id: userId,
          phase_number: phase.number,
          phase_name: phase.name,
          agent_id: phase.agentId,
          status: phase.number === 1 ? 'pending' : 'pending'
        }));

        const { error: phasesError } = await supabase
          .from('trading_project_phases')
          .insert(phases);

        if (phasesError) throw phasesError;

        // Create risk controls
        const { error: riskError } = await supabase
          .from('trading_risk_controls')
          .insert({
            project_id: project.id,
            user_id: userId,
            max_position_pct: riskLevel === 'conservative' ? 5 : riskLevel === 'moderate' ? 10 : 20,
            daily_loss_limit: riskLevel === 'conservative' ? 2 : riskLevel === 'moderate' ? 5 : 10,
            stop_loss_pct: riskLevel === 'conservative' ? 1 : riskLevel === 'moderate' ? 2 : 5,
            kill_switch_active: false
          });

        if (riskError) throw riskError;

        // Log activity
        await supabase.from('trading_activity_logs').insert({
          project_id: project.id,
          user_id: userId,
          agent_id: 'system',
          agent_name: 'System',
          action: 'Project created',
          details: { name, exchange, mode, capital, riskLevel }
        });

        return new Response(JSON.stringify({ success: true, project }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'start_phase': {
        const { phaseNumber } = params;

        // Get phase
        const { data: phase, error: phaseError } = await supabase
          .from('trading_project_phases')
          .select('*')
          .eq('project_id', projectId)
          .eq('phase_number', phaseNumber)
          .single();

        if (phaseError) throw phaseError;

        // Update phase status
        const { error: updateError } = await supabase
          .from('trading_project_phases')
          .update({ 
            status: 'active', 
            started_at: new Date().toISOString() 
          })
          .eq('id', phase.id);

        if (updateError) throw updateError;

        // Log activity
        await supabase.from('trading_activity_logs').insert({
          project_id: projectId,
          phase_id: phase.id,
          user_id: userId,
          agent_id: phase.agent_id,
          agent_name: `${phase.phase_name} Agent`,
          action: `Phase ${phaseNumber} started`,
          details: { phaseName: phase.phase_name }
        });

        return new Response(JSON.stringify({ success: true, phase }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'complete_phase': {
        const { phaseNumber, deliverables } = params;

        const { data: phase, error: phaseError } = await supabase
          .from('trading_project_phases')
          .select('*')
          .eq('project_id', projectId)
          .eq('phase_number', phaseNumber)
          .single();

        if (phaseError) throw phaseError;

        // Update phase with deliverables and set to review
        const { error: updateError } = await supabase
          .from('trading_project_phases')
          .update({ 
            status: 'review',
            deliverables
          })
          .eq('id', phase.id);

        if (updateError) throw updateError;

        // Log activity
        await supabase.from('trading_activity_logs').insert({
          project_id: projectId,
          phase_id: phase.id,
          user_id: userId,
          agent_id: phase.agent_id,
          agent_name: `${phase.phase_name} Agent`,
          action: `Phase ${phaseNumber} ready for review`,
          details: { deliverables }
        });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'approve_phase': {
        const { phaseNumber, approverType, approved, feedback } = params;

        const { data: phase } = await supabase
          .from('trading_project_phases')
          .select('*')
          .eq('project_id', projectId)
          .eq('phase_number', phaseNumber)
          .single();

        if (!phase) throw new Error('Phase not found');

        const updateData: Record<string, unknown> = {};
        if (approverType === 'ceo') {
          updateData.ceo_approved = approved;
          updateData.ceo_feedback = feedback;
        } else {
          updateData.user_approved = approved;
        }

        // Check if both approvals are complete
        const ceoApproved = approverType === 'ceo' ? approved : phase.ceo_approved;
        const userApproved = approverType === 'user' ? approved : phase.user_approved;

        if (ceoApproved && userApproved) {
          updateData.status = 'completed';
          updateData.completed_at = new Date().toISOString();
        }

        await supabase
          .from('trading_project_phases')
          .update(updateData)
          .eq('id', phase.id);

        // If phase completed, unlock next phase
        if (ceoApproved && userApproved && phaseNumber < 6) {
          await supabase
            .from('trading_projects')
            .update({ current_phase: phaseNumber + 1 })
            .eq('id', projectId);
        }

        // Log activity
        await supabase.from('trading_activity_logs').insert({
          project_id: projectId,
          phase_id: phase.id,
          user_id: userId,
          agent_id: approverType === 'ceo' ? 'ceo-agent' : 'user',
          agent_name: approverType === 'ceo' ? 'CEO Agent' : 'User',
          action: `Phase ${phaseNumber} ${approved ? 'approved' : 'rejected'} by ${approverType}`,
          details: { feedback }
        });

        return new Response(JSON.stringify({ success: true, bothApproved: ceoApproved && userApproved }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'activate_kill_switch': {
        // Update risk controls
        await supabase
          .from('trading_risk_controls')
          .update({ 
            kill_switch_active: true,
            kill_switch_activated_at: new Date().toISOString()
          })
          .eq('project_id', projectId);

        // Update project status
        await supabase
          .from('trading_projects')
          .update({ status: 'stopped' })
          .eq('id', projectId);

        // Cancel all pending orders
        await supabase
          .from('trading_orders')
          .update({ status: 'cancelled', rejection_reason: 'Kill switch activated' })
          .eq('project_id', projectId)
          .in('status', ['pending_approval', 'approved']);

        // Log activity
        await supabase.from('trading_activity_logs').insert({
          project_id: projectId,
          user_id: userId,
          agent_id: 'system',
          agent_name: 'Kill Switch',
          action: 'EMERGENCY STOP - All trading halted',
          status: 'alert',
          details: { reason: 'User activated kill switch' }
        });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'deactivate_kill_switch': {
        await supabase
          .from('trading_risk_controls')
          .update({ kill_switch_active: false })
          .eq('project_id', projectId);

        await supabase
          .from('trading_projects')
          .update({ status: 'active' })
          .eq('id', projectId);

        await supabase.from('trading_activity_logs').insert({
          project_id: projectId,
          user_id: userId,
          agent_id: 'system',
          agent_name: 'System',
          action: 'Kill switch deactivated - Trading resumed',
          details: {}
        });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error: unknown) {
    console.error('Trading Project Worker Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
