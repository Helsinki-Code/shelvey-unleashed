import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SIMPLIFIED: 1 agent per phase
const PHASE_AGENT: Record<number, { agentId: string; agentName: string }> = {
  1: { agentId: 'research-agent', agentName: 'Research Agent' },
  2: { agentId: 'brand-agent', agentName: 'Brand Agent' },
  3: { agentId: 'development-agent', agentName: 'Development Agent' },
  4: { agentId: 'content-agent', agentName: 'Content Agent' },
  5: { agentId: 'marketing-agent', agentName: 'Marketing Agent' },
  6: { agentId: 'sales-agent', agentName: 'Sales Agent' },
};

// Deliverable types for each phase
const PHASE_DELIVERABLES: Record<number, { type: string; name: string; description: string }[]> = {
  1: [
    { type: 'analysis', name: 'Market Analysis Report', description: 'Comprehensive market size, trends, and opportunity analysis' },
    { type: 'report', name: 'Competitor Landscape', description: 'Analysis of direct and indirect competitors' },
    { type: 'report', name: 'Trend Forecast Report', description: 'Industry trends and future predictions' },
    { type: 'document', name: 'Target Audience Profile', description: 'Detailed customer personas and segments' },
  ],
  2: [
    { type: 'document', name: 'Brand Strategy', description: 'Brand positioning, values, and voice guidelines' },
    { type: 'design', name: 'Logo Design', description: 'Primary logo and variations using AI image generation' },
    { type: 'design', name: 'Color Palette', description: 'Brand colors and usage guidelines' },
    { type: 'document', name: 'Brand Guidelines', description: 'Complete brand style guide' },
  ],
  3: [
    { type: 'design', name: 'Website Design', description: 'UI/UX design for main website' },
    { type: 'code', name: 'Website Development', description: 'Fully functional responsive website' },
    { type: 'code', name: 'Payment Integration', description: 'Stripe payment processing setup' },
    { type: 'configuration', name: 'Analytics Setup', description: 'Google Analytics and tracking setup' },
  ],
  4: [
    { type: 'content', name: 'Website Copy', description: 'All website text content' },
    { type: 'content', name: 'Blog Posts', description: 'Initial blog content for SEO' },
    { type: 'content', name: 'Email Templates', description: 'Welcome, nurture, and promotional emails' },
    { type: 'content', name: 'Social Media Content', description: 'Initial social media posts and calendar' },
  ],
  5: [
    { type: 'document', name: 'Marketing Strategy', description: 'Go-to-market strategy and channel plan' },
    { type: 'campaign', name: 'Social Media Campaigns', description: 'Launch campaigns for all social platforms' },
    { type: 'design', name: 'Ad Creatives', description: 'Paid advertising creative assets' },
    { type: 'partnerships', name: 'Influencer Partnerships', description: 'Influencer outreach and partnership agreements' },
  ],
  6: [
    { type: 'document', name: 'Sales Playbook', description: 'Sales process, scripts, and objection handling' },
    { type: 'data', name: 'Lead Pipeline', description: 'Qualified leads and pipeline management' },
    { type: 'report', name: 'Revenue Report', description: 'Revenue tracking and growth metrics' },
    { type: 'process', name: 'Customer Onboarding', description: 'Customer onboarding process and materials' },
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
      case 'start_phase':
        result = await startPhase(supabase, supabaseUrl, supabaseServiceKey, params);
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
        result = await monitorProgress(supabase, params);
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

// Unified start_phase action - activates phase and starts the single agent
async function startPhase(supabase: any, supabaseUrl: string, serviceKey: string, params: any) {
  const { projectId, phaseNumber } = params;
  console.log('[phase-auto-worker] startPhase called:', { projectId, phaseNumber });

  const { data: phase, error: phaseError } = await supabase
    .from('business_phases')
    .select('*')
    .eq('project_id', projectId)
    .eq('phase_number', phaseNumber)
    .maybeSingle();

  if (phaseError) throw new Error(`Failed to fetch phase: ${phaseError.message}`);
  if (!phase) throw new Error(`Phase ${phaseNumber} not found for project ${projectId}`);

  const userId = phase.user_id;
  const agent = PHASE_AGENT[phaseNumber];
  if (!agent) throw new Error('No agent configured for this phase');

  // Activate phase if not active
  if (phase.status !== 'active') {
    await supabase
      .from('business_phases')
      .update({ status: 'active', started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', phase.id);
  }

  const { data: existingDeliverables } = await supabase
    .from('phase_deliverables')
    .select('*')
    .eq('phase_id', phase.id);

  const { data: project } = await supabase
    .from('business_projects')
    .select('*')
    .eq('id', projectId)
    .single();

  const pendingDeliverables = (existingDeliverables || []).filter(
    (d: any) => d.status === 'pending' || d.status === 'in_progress'
  );

  console.log(`[phase-auto-worker] Starting work on ${pendingDeliverables.length} deliverables with ${agent.agentName}`);

  const workStarted: any[] = [];

  for (const deliverable of pendingDeliverables) {
    console.log(`[phase-auto-worker] Assigning ${deliverable.name} to ${agent.agentName}`);

    await supabase
      .from('phase_deliverables')
      .update({ status: 'in_progress', assigned_agent_id: agent.agentId, updated_at: new Date().toISOString() })
      .eq('id', deliverable.id);

    await supabase.from('agent_activity_logs').insert({
      agent_id: agent.agentId,
      agent_name: agent.agentName,
      action: `Started working on: ${deliverable.name}`,
      status: 'in_progress',
      metadata: { deliverableId: deliverable.id, deliverableType: deliverable.deliverable_type, phaseNumber, projectId },
    });

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/agent-work-executor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}` },
        body: JSON.stringify({
          userId,
          projectId,
          deliverableId: deliverable.id,
          agentId: agent.agentId,
          taskType: deliverable.deliverable_type,
          phaseNumber,
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

      const result = await response.json();
      workStarted.push({
        deliverableId: deliverable.id,
        deliverableName: deliverable.name,
        deliverableType: deliverable.deliverable_type,
        agentId: agent.agentId,
        agentName: agent.agentName,
        success: result.success,
      });
      console.log(`[phase-auto-worker] Agent work result for ${deliverable.name}:`, result.success);
    } catch (error) {
      console.error(`[phase-auto-worker] Error starting work on ${deliverable.name}:`, error);
      workStarted.push({
        deliverableId: deliverable.id,
        deliverableName: deliverable.name,
        agentId: agent.agentId,
        agentName: agent.agentName,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'phase_work_started',
    title: `Phase ${phaseNumber}: ${agent.agentName} Activated`,
    message: `${agent.agentName} is now working on ${workStarted.length} deliverables.`,
    metadata: { phaseId: phase.id, phaseNumber, workStarted: workStarted.length, agentId: agent.agentId },
  });

  return {
    phaseId: phase.id,
    phaseName: phase.phase_name,
    phaseNumber,
    status: 'active',
    deliverablesInProgress: workStarted.length,
    workStarted,
    assignedAgent: agent,
  };
}

async function activatePhase(supabase: any, supabaseUrl: string, serviceKey: string, params: any) {
  const { userId, projectId, phaseId, phaseNumber } = params;

  let phase;
  if (phaseId) {
    const { data } = await supabase.from('business_phases').select('*').eq('id', phaseId).single();
    phase = data;
  } else {
    const { data } = await supabase.from('business_phases').select('*').eq('project_id', projectId).eq('phase_number', phaseNumber).single();
    phase = data;
  }

  if (!phase) throw new Error('Phase not found');

  await supabase
    .from('business_phases')
    .update({ status: 'active', started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', phase.id);

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

    if (!error && newDeliverable) createdDeliverables.push(newDeliverable);
  }

  const agent = PHASE_AGENT[phase.phase_number];

  await supabase.from('agent_activity_logs').insert({
    agent_id: 'coo-agent',
    agent_name: 'COO Agent',
    action: `Activated Phase ${phase.phase_number}: ${phase.phase_name}`,
    status: 'completed',
    metadata: { phaseId: phase.id, projectId, deliverableCount: createdDeliverables.length },
  });

  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'phase_started',
    title: `Phase ${phase.phase_number} Started`,
    message: `${phase.phase_name} has begun. ${agent?.agentName || 'Agent'} will handle ${createdDeliverables.length} deliverables.`,
    metadata: { phaseId: phase.id, phaseNumber: phase.phase_number },
  });

  return { phase, deliverables: createdDeliverables, assignedAgent: agent };
}

async function startPhaseWork(supabase: any, supabaseUrl: string, serviceKey: string, params: any) {
  const { userId, projectId, phaseId } = params;

  const { data: phase } = await supabase.from('business_phases').select('*').eq('id', phaseId).single();
  if (!phase) throw new Error('Phase not found');

  const { data: deliverables } = await supabase.from('phase_deliverables').select('*').eq('phase_id', phaseId).eq('status', 'pending');

  const agent = PHASE_AGENT[phase.phase_number];
  if (!agent) throw new Error('No agent assigned for this phase');

  const { data: project } = await supabase.from('business_projects').select('*').eq('id', projectId).single();

  const workStarted: any[] = [];

  for (const deliverable of (deliverables || [])) {
    try {
      const workResponse = await fetch(`${supabaseUrl}/functions/v1/agent-work-executor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}` },
        body: JSON.stringify({
          userId,
          projectId,
          deliverableId: deliverable.id,
          agentId: agent.agentId,
          taskType: deliverable.deliverable_type,
          phaseNumber: phase.phase_number,
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
      workStarted.push({ deliverableId: deliverable.id, deliverableName: deliverable.name, agentId: agent.agentId, success: workResult.success });
    } catch (workError) {
      console.error(`Failed to start work on ${deliverable.name}:`, workError);
      workStarted.push({ deliverableId: deliverable.id, deliverableName: deliverable.name, agentId: agent.agentId, success: false, error: workError instanceof Error ? workError.message : String(workError) });
    }
  }

  return { phaseId, phaseName: phase.phase_name, workStarted, totalDeliverables: deliverables?.length || 0, successfullyStarted: workStarted.filter(w => w.success).length };
}

async function checkPhaseCompletion(supabase: any, params: any) {
  const { phaseId } = params;

  const { data: deliverables } = await supabase.from('phase_deliverables').select('*').eq('phase_id', phaseId);

  if (!deliverables || deliverables.length === 0) return { complete: false, reason: 'No deliverables found' };

  const totalDeliverables = deliverables.length;
  const approvedDeliverables = deliverables.filter((d: any) => d.ceo_approved === true && d.user_approved === true).length;
  const inProgress = deliverables.filter((d: any) => d.status === 'in_progress').length;
  const inReview = deliverables.filter((d: any) => d.status === 'review').length;
  const pending = deliverables.filter((d: any) => d.status === 'pending').length;

  return {
    complete: approvedDeliverables === totalDeliverables,
    totalDeliverables,
    approvedDeliverables,
    inProgress,
    inReview,
    pending,
    progressPercentage: Math.round((approvedDeliverables / totalDeliverables) * 100),
  };
}

async function advanceToNextPhase(supabase: any, supabaseUrl: string, serviceKey: string, params: any) {
  const { projectId, currentPhaseNumber } = params;

  await supabase
    .from('business_phases')
    .update({ status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('project_id', projectId)
    .eq('phase_number', currentPhaseNumber);

  const nextPhaseNumber = currentPhaseNumber + 1;
  const { data: nextPhase } = await supabase.from('business_phases').select('*').eq('project_id', projectId).eq('phase_number', nextPhaseNumber).single();

  if (!nextPhase) return { success: true, message: 'All phases completed!', projectComplete: true };

  await supabase
    .from('business_phases')
    .update({ status: 'active', started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', nextPhase.id);

  await supabase.from('notifications').insert({
    user_id: nextPhase.user_id,
    type: 'phase_advanced',
    title: `Phase ${nextPhaseNumber} Ready`,
    message: `Phase ${currentPhaseNumber} completed! Phase ${nextPhaseNumber}: ${nextPhase.phase_name} is now active.`,
    metadata: { previousPhase: currentPhaseNumber, newPhase: nextPhaseNumber },
  });

  return { success: true, previousPhase: currentPhaseNumber, newPhase: nextPhaseNumber, phaseName: nextPhase.phase_name, phaseId: nextPhase.id };
}

async function monitorProgress(supabase: any, params: any) {
  const { projectId } = params;

  const { data: phases } = await supabase.from('business_phases').select('*').eq('project_id', projectId).order('phase_number');
  const { data: allDeliverables } = await supabase.from('phase_deliverables').select('*, business_phases!inner(project_id)').eq('business_phases.project_id', projectId);

  const phaseProgress = (phases || []).map((phase: any) => {
    const phaseDeliverables = (allDeliverables || []).filter((d: any) => d.phase_id === phase.id);
    const approved = phaseDeliverables.filter((d: any) => d.ceo_approved && d.user_approved).length;
    const agent = PHASE_AGENT[phase.phase_number];
    
    return {
      phaseNumber: phase.phase_number,
      phaseName: phase.phase_name,
      status: phase.status,
      totalDeliverables: phaseDeliverables.length,
      approvedDeliverables: approved,
      progressPercentage: phaseDeliverables.length > 0 ? Math.round((approved / phaseDeliverables.length) * 100) : 0,
      assignedAgent: agent,
    };
  });

  const { data: recentActivity } = await supabase.from('agent_activity_logs').select('*').order('created_at', { ascending: false }).limit(20);

  return {
    phases: phaseProgress,
    recentActivity: recentActivity || [],
    overallProgress: phaseProgress.length > 0 ? Math.round(phaseProgress.reduce((sum: number, p: any) => sum + p.progressPercentage, 0) / phaseProgress.length) : 0,
  };
}
