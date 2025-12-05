import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Phase to Team mapping
const PHASE_TEAMS: Record<number, { teamId: string; division: string; agents: string[] }> = {
  1: {
    teamId: 'research-team',
    division: 'research',
    agents: ['market-research', 'trend-prediction'],
  },
  2: {
    teamId: 'branding-team',
    division: 'brand',
    agents: ['brand-identity', 'visual-design', 'content-creator'],
  },
  3: {
    teamId: 'development-team',
    division: 'development',
    agents: ['code-builder', 'qa-testing'],
  },
  4: {
    teamId: 'content-team',
    division: 'content',
    agents: ['content-creator', 'seo-optimization'],
  },
  5: {
    teamId: 'marketing-team',
    division: 'marketing',
    agents: ['social-media', 'paid-ads', 'influencer-outreach'],
  },
  6: {
    teamId: 'sales-team',
    division: 'sales',
    agents: ['sales-development', 'sales-closer', 'customer-success'],
  },
};

// Deliverable types for each phase
const PHASE_DELIVERABLES: Record<number, { type: string; name: string; description: string }[]> = {
  1: [
    { type: 'market_analysis', name: 'Market Analysis Report', description: 'Comprehensive market size, trends, and opportunity analysis' },
    { type: 'competitor_analysis', name: 'Competitor Landscape', description: 'Analysis of direct and indirect competitors' },
    { type: 'target_customer', name: 'Target Customer Profiles', description: 'Detailed customer personas and segments' },
    { type: 'trend_forecast', name: 'Trend Forecast Report', description: 'Industry trends and future predictions' },
  ],
  2: [
    { type: 'brand_identity', name: 'Brand Identity Package', description: 'Logo, colors, typography, and brand guidelines' },
    { type: 'brand_voice', name: 'Brand Voice Document', description: 'Tone, messaging, and communication guidelines' },
    { type: 'visual_assets', name: 'Visual Asset Library', description: 'Marketing images, icons, and graphics' },
  ],
  3: [
    { type: 'website', name: 'Business Website', description: 'Fully functional landing page with branding' },
    { type: 'technical_docs', name: 'Technical Documentation', description: 'Site architecture and maintenance guides' },
  ],
  4: [
    { type: 'content_strategy', name: 'Content Strategy', description: 'Content calendar and topic planning' },
    { type: 'blog_content', name: 'Blog Articles', description: 'SEO-optimized blog posts' },
    { type: 'social_content', name: 'Social Media Content', description: 'Posts for all social platforms' },
  ],
  5: [
    { type: 'marketing_strategy', name: 'Marketing Strategy', description: 'Comprehensive marketing plan' },
    { type: 'ad_campaigns', name: 'Ad Campaigns', description: 'Paid advertising campaigns' },
    { type: 'email_sequences', name: 'Email Sequences', description: 'Email marketing automation' },
  ],
  6: [
    { type: 'sales_strategy', name: 'Sales Strategy', description: 'Sales process and methodology' },
    { type: 'sales_scripts', name: 'Sales Scripts', description: 'Call scripts and email templates' },
    { type: 'crm_setup', name: 'CRM Configuration', description: 'Customer relationship management setup' },
  ],
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, ...params } = await req.json();

    console.log(`[phase-auto-worker] Action: ${action}`, params);

    let result;

    switch (action) {
      case 'activate_phase':
        result = await activatePhase(supabase, supabaseUrl, supabaseServiceKey, params);
        break;
      case 'start_phase_work':
        result = await startPhaseWork(supabase, supabaseUrl, supabaseServiceKey, params);
        break;
      case 'check_phase_completion':
        result = await checkPhaseCompletion(supabase, params);
        break;
      case 'advance_to_next_phase':
        result = await advanceToNextPhase(supabase, supabaseUrl, supabaseServiceKey, params);
        break;
      case 'monitor_progress':
        result = await monitorProgress(supabase, supabaseUrl, supabaseServiceKey, params);
        break;
      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[phase-auto-worker] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function activatePhase(supabase: any, supabaseUrl: string, serviceKey: string, params: any) {
  const { userId, projectId, phaseId, phaseNumber } = params;

  // Get or create phase
  let phase;
  if (phaseId) {
    const { data } = await supabase
      .from('business_phases')
      .select('*')
      .eq('id', phaseId)
      .single();
    phase = data;
  } else {
    const { data } = await supabase
      .from('business_phases')
      .select('*')
      .eq('project_id', projectId)
      .eq('phase_number', phaseNumber)
      .single();
    phase = data;
  }

  if (!phase) {
    throw new Error('Phase not found');
  }

  // Update phase status to active
  await supabase
    .from('business_phases')
    .update({
      status: 'active',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', phase.id);

  // Create deliverables for this phase
  const phaseDeliverables = PHASE_DELIVERABLES[phase.phase_number] || [];
  const createdDeliverables: any[] = [];

  for (const deliverable of phaseDeliverables) {
    const { data: newDeliverable, error } = await supabase
      .from('phase_deliverables')
      .insert({
        user_id: userId,
        phase_id: phase.id,
        deliverable_type: deliverable.type,
        name: deliverable.name,
        description: deliverable.description,
        status: 'pending',
      })
      .select()
      .single();

    if (!error && newDeliverable) {
      createdDeliverables.push(newDeliverable);
    }
  }

  // Schedule daily standup for the team
  const phaseTeam = PHASE_TEAMS[phase.phase_number];
  if (phaseTeam) {
    await supabase.functions.invoke('meeting-orchestrator', {
      body: {
        action: 'schedule_standup',
        userId,
        projectId,
        teamId: phaseTeam.teamId,
        scheduledAt: new Date().toISOString(),
        attendees: phaseTeam.agents.map(agentId => ({
          agentId,
          agentName: agentId,
          role: 'team_member',
        })),
      },
    });
  }

  // Log activity
  await supabase.from('agent_activity_logs').insert({
    agent_id: 'coo-agent',
    agent_name: 'COO Agent',
    action: `Activated Phase ${phase.phase_number}: ${phase.phase_name}`,
    status: 'completed',
    metadata: { phaseId: phase.id, deliverableCount: createdDeliverables.length },
  });

  // Notify user
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'phase_started',
    title: `Phase ${phase.phase_number} Started`,
    message: `${phase.phase_name} has begun. ${createdDeliverables.length} deliverables to complete.`,
    metadata: { phaseId: phase.id, phaseNumber: phase.phase_number },
  });

  return {
    phase,
    deliverables: createdDeliverables,
    teamAssigned: phaseTeam,
  };
}

async function startPhaseWork(supabase: any, supabaseUrl: string, serviceKey: string, params: any) {
  const { userId, projectId, phaseId } = params;

  // Get phase and its deliverables
  const { data: phase } = await supabase
    .from('business_phases')
    .select('*')
    .eq('id', phaseId)
    .single();

  if (!phase) {
    throw new Error('Phase not found');
  }

  const { data: deliverables } = await supabase
    .from('phase_deliverables')
    .select('*')
    .eq('phase_id', phaseId)
    .eq('status', 'pending');

  const phaseTeam = PHASE_TEAMS[phase.phase_number];
  if (!phaseTeam) {
    throw new Error('No team assigned for this phase');
  }

  // Get project details for context
  const { data: project } = await supabase
    .from('business_projects')
    .select('*')
    .eq('id', projectId)
    .single();

  // Assign and start work on each deliverable
  const workStarted: any[] = [];

  for (let i = 0; i < (deliverables?.length || 0); i++) {
    const deliverable = deliverables[i];
    const assignedAgent = phaseTeam.agents[i % phaseTeam.agents.length];

    // Start the agent work
    try {
      const workResponse = await fetch(`${supabaseUrl}/functions/v1/agent-work-executor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          userId,
          projectId,
          deliverableId: deliverable.id,
          agentId: assignedAgent,
          taskType: deliverable.deliverable_type,
          inputData: {
            projectName: project?.name,
            industry: project?.industry,
            targetMarket: project?.target_market,
            description: project?.description,
            deliverableName: deliverable.name,
            deliverableDescription: deliverable.description,
          },
        }),
      });

      const workResult = await workResponse.json();
      workStarted.push({
        deliverableId: deliverable.id,
        deliverableName: deliverable.name,
        assignedAgent,
        success: workResult.success,
      });
      } catch (workError) {
        console.error(`Failed to start work on ${deliverable.name}:`, workError);
        workStarted.push({
          deliverableId: deliverable.id,
          deliverableName: deliverable.name,
          assignedAgent,
          success: false,
          error: workError instanceof Error ? workError.message : String(workError),
        });
    }
  }

  return {
    phaseId,
    phaseName: phase.phase_name,
    workStarted,
    totalDeliverables: deliverables?.length || 0,
    successfullyStarted: workStarted.filter(w => w.success).length,
  };
}

async function checkPhaseCompletion(supabase: any, params: any) {
  const { phaseId } = params;

  // Get all deliverables for this phase
  const { data: deliverables } = await supabase
    .from('phase_deliverables')
    .select('*')
    .eq('phase_id', phaseId);

  if (!deliverables || deliverables.length === 0) {
    return { complete: false, reason: 'No deliverables found' };
  }

  const totalDeliverables = deliverables.length;
  const approvedDeliverables = deliverables.filter(
    (d: any) => d.ceo_approved === true && d.user_approved === true
  ).length;
  const pendingApproval = deliverables.filter(
    (d: any) => d.status === 'review' || (d.ceo_approved && !d.user_approved)
  ).length;
  const inProgress = deliverables.filter(
    (d: any) => d.status === 'in_progress'
  ).length;

  const isComplete = approvedDeliverables === totalDeliverables;

  return {
    complete: isComplete,
    progress: {
      total: totalDeliverables,
      approved: approvedDeliverables,
      pendingApproval,
      inProgress,
      percentComplete: Math.round((approvedDeliverables / totalDeliverables) * 100),
    },
    deliverables: deliverables.map((d: any) => ({
      id: d.id,
      name: d.name,
      status: d.status,
      ceoApproved: d.ceo_approved,
      userApproved: d.user_approved,
    })),
  };
}

async function advanceToNextPhase(supabase: any, supabaseUrl: string, serviceKey: string, params: any) {
  const { userId, projectId, currentPhaseId } = params;

  // Get current phase
  const { data: currentPhase } = await supabase
    .from('business_phases')
    .select('*')
    .eq('id', currentPhaseId)
    .single();

  if (!currentPhase) {
    throw new Error('Current phase not found');
  }

  // Check if current phase is complete
  const completionCheck = await checkPhaseCompletion(supabase, { phaseId: currentPhaseId });
  
  if (!completionCheck.complete) {
    return {
      advanced: false,
      reason: 'Current phase is not complete',
      progress: completionCheck.progress,
    };
  }

  // Mark current phase as completed
  await supabase
    .from('business_phases')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', currentPhaseId);

  // Get or create next phase
  const nextPhaseNumber = currentPhase.phase_number + 1;

  if (nextPhaseNumber > 6) {
    // All phases complete
    await supabase
      .from('business_projects')
      .update({ status: 'completed', stage: 'operational' })
      .eq('id', projectId);

    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'project_complete',
      title: '🎉 Project Complete!',
      message: 'All 6 phases have been completed. Your autonomous business is ready!',
      metadata: { projectId },
    });

    return {
      advanced: false,
      reason: 'All phases complete',
      projectComplete: true,
    };
  }

  // Get next phase
  const { data: nextPhase } = await supabase
    .from('business_phases')
    .select('*')
    .eq('project_id', projectId)
    .eq('phase_number', nextPhaseNumber)
    .single();

  if (nextPhase) {
    // Activate next phase
    await activatePhase(supabase, supabaseUrl, serviceKey, {
      userId,
      projectId,
      phaseId: nextPhase.id,
      phaseNumber: nextPhaseNumber,
    });

    return {
      advanced: true,
      previousPhase: currentPhase.phase_number,
      newPhase: nextPhaseNumber,
      newPhaseName: nextPhase.phase_name,
    };
  }

  return {
    advanced: false,
    reason: 'Next phase not found',
  };
}

async function monitorProgress(supabase: any, supabaseUrl: string, serviceKey: string, params: any) {
  const { userId, projectId } = params;

  // Get all phases for the project
  const { data: phases } = await supabase
    .from('business_phases')
    .select('*')
    .eq('project_id', projectId)
    .order('phase_number');

  // Check for stuck tasks and escalations
  const { data: escalations } = await supabase
    .from('escalations')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'open');

  // Check escalation timeouts
  if (escalations && escalations.length > 0) {
    await fetch(`${supabaseUrl}/functions/v1/escalation-handler`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        action: 'check_timeouts',
        projectId,
      }),
    });
  }

  // Build progress report
  const phaseProgress = await Promise.all(
    (phases || []).map(async (phase: any) => {
      const completion = await checkPhaseCompletion(supabase, { phaseId: phase.id });
      return {
        phaseNumber: phase.phase_number,
        phaseName: phase.phase_name,
        status: phase.status,
        ...completion.progress,
      };
    })
  );

  return {
    projectId,
    phases: phaseProgress,
    openEscalations: escalations?.length || 0,
    overallProgress: {
      completedPhases: phases?.filter((p: any) => p.status === 'completed').length || 0,
      totalPhases: 6,
    },
  };
}
