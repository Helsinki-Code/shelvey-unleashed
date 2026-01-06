import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COO_SYSTEM_PROMPT = `You are the COO (Chief Operating Officer) of ShelVey AI Business Builder. Your role is to:

1. RECEIVE strategic directives from the CEO and translate them into actionable plans
2. COORDINATE all 7 divisions: Research, Brand & Design, Development, Content, Marketing, Sales, and Operations
3. ACTIVATE teams sequentially based on business phase progression
4. MONITOR deliverables and ensure quality standards
5. REPORT progress back to the CEO

You manage the following Division Heads who report directly to you:
- Head of Research: Market research, competitor analysis, trend prediction
- Creative Director: Brand identity, visual design, brand guidelines
- Head of Development: Product architecture, code building, QA testing
- Content Director: Content creation, copywriting, SEO optimization
- Head of Marketing: Social media, paid ads, influencer outreach
- Head of Sales: Sales development, closing, customer success
- Head of Operations: Operations, finance, analytics, compliance

PHASE MANAGEMENT:
- Phase 1 (Research) must complete before Phase 2 (Brand) begins
- Each phase has entry criteria that must be met
- Each phase has exit criteria that determine completion
- You activate teams when their phase becomes active

When responding, be executive and decisive. Focus on:
- Current phase status and progress
- Team assignments and workload
- Blockers and risk mitigation
- Timeline and milestone tracking`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { action, projectId, userId, directive, phaseNumber, teamId, deliverableId } = await req.json();

    console.log('[coo-coordinator]', { action, projectId, userId, phaseNumber, teamId, deliverableId });

    // Update COO agent status to active
    await supabase
      .from('team_members')
      .update({ status: 'active', current_task: `Processing: ${action}` })
      .eq('agent_id', 'coo');

    let result: any = {};

    switch (action) {
      case 'initialize_project':
        // Create all 6 phases for a new project
        const phases = [
          { phase_number: 1, phase_name: 'Research & Discovery' },
          { phase_number: 2, phase_name: 'Brand & Identity' },
          { phase_number: 3, phase_name: 'Development & Build' },
          { phase_number: 4, phase_name: 'Content Creation' },
          { phase_number: 5, phase_name: 'Marketing Launch' },
          { phase_number: 6, phase_name: 'Sales & Growth' }
        ];

        // Get team IDs for each phase
        const { data: teams } = await supabase
          .from('teams')
          .select('id, division, activation_phase');

        for (const phase of phases) {
          const team = teams?.find(t => t.activation_phase === phase.phase_number);
          
          const { data: phaseData } = await supabase
            .from('business_phases')
            .insert({
              project_id: projectId,
              phase_number: phase.phase_number,
              phase_name: phase.phase_name,
              status: phase.phase_number === 1 ? 'active' : 'pending',
              team_id: team?.id,
              user_id: userId,
              started_at: phase.phase_number === 1 ? new Date().toISOString() : null
            })
            .select()
            .single();

          // Create default deliverables for each phase
          const deliverables = getPhaseDeliverables(phase.phase_number, phaseData?.id, team?.id, userId);
          if (deliverables.length > 0) {
            await supabase.from('phase_deliverables').insert(deliverables);
          }
        }

        // Activate research team
        await supabase
          .from('teams')
          .update({ status: 'active' })
          .eq('division', 'research');

        // Get the active phase (Phase 1)
        const { data: activePhase } = await supabase
          .from('business_phases')
          .select('id')
          .eq('project_id', projectId)
          .eq('phase_number', 1)
          .single();

        // Trigger phase work to start the agents working
        if (activePhase) {
          console.log('[COO] Starting phase work for Phase 1');
          
          // Fire and forget - don't await to avoid blocking
          fetch(`${supabaseUrl}/functions/v1/phase-auto-worker`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              action: 'start_phase_work',
              userId,
              projectId,
              phaseId: activePhase.id,
            }),
          }).then(async (response) => {
            const workResult = await response.json();
            console.log('[COO] Phase work started:', workResult);
          }).catch((workError) => {
            console.error('[COO] Failed to start phase work:', workError);
          });
        }

        result = { success: true, message: 'Project phases initialized, Research team activated, work started' };
        break;

      case 'activate_phase':
        // Get the phase and its team
        const { data: phaseToActivate } = await supabase
          .from('business_phases')
          .select('*, teams(*)')
          .eq('project_id', projectId)
          .eq('phase_number', phaseNumber)
          .single();

        if (!phaseToActivate) {
          throw new Error('Phase not found');
        }

        // Check if previous phase is completed
        if (phaseNumber > 1) {
          const { data: prevPhase } = await supabase
            .from('business_phases')
            .select('status')
            .eq('project_id', projectId)
            .eq('phase_number', phaseNumber - 1)
            .single();

          if (prevPhase?.status !== 'completed') {
            throw new Error(`Phase ${phaseNumber - 1} must be completed first`);
          }
        }

        // Activate the phase
        await supabase
          .from('business_phases')
          .update({ status: 'active', started_at: new Date().toISOString() })
          .eq('id', phaseToActivate.id);

        // Activate the team
        if (phaseToActivate.team_id) {
          await supabase
            .from('teams')
            .update({ status: 'active' })
            .eq('id', phaseToActivate.team_id);

          // Set team members to idle (ready to work)
          await supabase
            .from('team_members')
            .update({ status: 'idle' })
            .eq('team_id', phaseToActivate.team_id);
        }

        result = { success: true, message: `Phase ${phaseNumber} activated`, phase: phaseToActivate };
        break;

      case 'complete_phase':
        // Mark phase as completed
        await supabase
          .from('business_phases')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('project_id', projectId)
          .eq('phase_number', phaseNumber);

        // Deactivate the team
        const { data: completedPhase } = await supabase
          .from('business_phases')
          .select('team_id')
          .eq('project_id', projectId)
          .eq('phase_number', phaseNumber)
          .single();

        if (completedPhase?.team_id) {
          await supabase
            .from('teams')
            .update({ status: 'inactive' })
            .eq('id', completedPhase.team_id);
        }

        // Auto-activate next phase if exists
        if (phaseNumber < 6) {
          const nextPhaseNum = phaseNumber + 1;
          const { data: nextPhase } = await supabase
            .from('business_phases')
            .select('id, team_id')
            .eq('project_id', projectId)
            .eq('phase_number', nextPhaseNum)
            .single();

          if (nextPhase) {
            await supabase
              .from('business_phases')
              .update({ status: 'active', started_at: new Date().toISOString() })
              .eq('id', nextPhase.id);

            if (nextPhase.team_id) {
              await supabase
                .from('teams')
                .update({ status: 'active' })
                .eq('id', nextPhase.team_id);
            }
          }
        }

        result = { success: true, message: `Phase ${phaseNumber} completed` };
        break;

      case 'get_status':
        const { data: allPhases } = await supabase
          .from('business_phases')
          .select('*, teams(*), phase_deliverables(*)')
          .eq('project_id', projectId)
          .order('phase_number');

        const { data: activeTeams } = await supabase
          .from('teams')
          .select('*, team_members(*)')
          .eq('status', 'active');

        result = { phases: allPhases, activeTeams };
        break;

      case 'delegate_to_manager':
        // Delegate a task to a specific team manager
        const { data: team } = await supabase
          .from('teams')
          .select('*, team_members(*)')
          .eq('id', teamId)
          .single();

        if (team) {
          const manager = team.team_members?.find((m: any) => m.role === 'manager');
          if (manager) {
            await supabase
              .from('team_members')
              .update({ status: 'working', current_task: directive })
              .eq('id', manager.id);
          }
        }

        result = { success: true, message: `Task delegated to ${team?.name}` };
        break;

      default:
        result = { error: 'Unknown action' };
    }

    // Reset COO status
    await supabase
      .from('team_members')
      .update({ status: 'active', current_task: null })
      .eq('agent_id', 'coo');

    // Log activity
    await supabase.from('agent_activity_logs').insert({
      agent_id: 'coo',
      agent_name: 'COO Agent',
      action: action,
      status: 'completed',
      metadata: { projectId, directive, result }
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('COO Coordinator error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function getPhaseDeliverables(phaseNumber: number, phaseId: string, teamId: string | undefined, userId: string) {
  // Keep this in sync with the app's intended phase deliverables.
  // IMPORTANT: Phase 2 is a SINGLE "brand_assets" deliverable with granular per-asset approvals.
  const deliverablesByPhase: Record<number, Array<{ name: string; type: string; description: string }>> = {
    1: [
      { name: 'Market Analysis', type: 'analysis', description: 'Comprehensive market research and opportunity assessment' },
      { name: 'Competitor Report', type: 'report', description: 'Analysis of direct and indirect competitors' },
      { name: 'Trend Forecast', type: 'report', description: 'Industry trends and future predictions' },
      { name: 'Target Audience Profile', type: 'document', description: 'Detailed customer personas and segments' },
    ],
    2: [
      { name: 'Brand Assets', type: 'brand_assets', description: 'Generated logos, icons, color palette, and social banners' },
    ],
    3: [
      { name: 'Website Design', type: 'design', description: 'UI/UX design for main website' },
      { name: 'Website Development', type: 'code', description: 'Fully functional responsive website' },
      { name: 'Payment Integration', type: 'code', description: 'Stripe payment processing setup' },
      { name: 'Analytics Setup', type: 'configuration', description: 'Google Analytics and tracking setup' },
    ],
    4: [
      { name: 'Website Copy', type: 'content', description: 'All website text content' },
      { name: 'Blog Posts', type: 'content', description: 'Initial blog content for SEO' },
      { name: 'Email Templates', type: 'content', description: 'Welcome, nurture, and promotional emails' },
      { name: 'Social Media Content', type: 'content', description: 'Initial social media posts and calendar' },
    ],
    5: [
      { name: 'Marketing Strategy', type: 'document', description: 'Go-to-market strategy and channel plan' },
      { name: 'Social Media Campaigns', type: 'campaign', description: 'Launch campaigns for all social platforms' },
      { name: 'Ad Creatives', type: 'design', description: 'Paid advertising creative assets' },
      { name: 'Influencer Partnerships', type: 'partnerships', description: 'Influencer outreach and partnership agreements' },
    ],
    6: [
      { name: 'Sales Playbook', type: 'document', description: 'Sales process, scripts, and objection handling' },
      { name: 'Lead Pipeline', type: 'data', description: 'Qualified leads and pipeline management' },
      { name: 'Revenue Report', type: 'report', description: 'Revenue tracking and growth metrics' },
      { name: 'Customer Onboarding', type: 'process', description: 'Customer onboarding process and materials' },
    ],
  };

  const deliverables = deliverablesByPhase[phaseNumber] || [];
  return deliverables.map((d) => ({
    phase_id: phaseId,
    name: d.name,
    description: d.description,
    deliverable_type: d.type,
    assigned_team_id: teamId,
    user_id: userId,
    status: 'pending',
  }));
}
