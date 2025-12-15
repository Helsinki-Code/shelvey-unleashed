import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Phase to Team mapping - FIXED: All 5 Phase 1 agents included
const PHASE_TEAMS: Record<number, { teamId: string; division: string; agents: string[] }> = {
  1: {
    teamId: 'research-team',
    division: 'research',
    agents: ['head-of-research', 'market-research', 'trend-prediction', 'customer-profiler', 'competitor-analyst'],
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

// FIXED: Map deliverable types to specific agents
const DELIVERABLE_AGENT_MAPPING: Record<string, string> = {
  // Phase 1 deliverables
  'market_analysis': 'market-research',
  'competitor_analysis': 'competitor-analyst',
  'target_customer': 'customer-profiler',
  'trend_forecast': 'trend-prediction',
  // Phase 2 deliverables
  'brand_strategy': 'brand-identity',
  'logo_design': 'visual-design',
  'color_palette': 'visual-design',
  'brand_guidelines': 'brand-identity',
  // Phase 3 deliverables
  'website': 'code-builder',
  'technical_docs': 'code-builder',
  // Phase 4 deliverables
  'content_strategy': 'content-creator',
  'blog_content': 'content-creator',
  'social_content': 'content-creator',
  // Phase 5 deliverables
  'marketing_strategy': 'social-media',
  'ad_campaigns': 'paid-ads',
  'email_sequences': 'social-media',
  // Phase 6 deliverables
  'sales_strategy': 'sales-development',
  'sales_scripts': 'sales-closer',
  'crm_setup': 'sales-development',
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
    { type: 'brand_strategy', name: 'Brand Strategy', description: 'Brand positioning, values, and voice guidelines' },
    { type: 'logo_design', name: 'Logo Design', description: 'Primary logo and variations using AI image generation' },
    { type: 'color_palette', name: 'Color Palette', description: 'Brand colors and usage guidelines' },
    { type: 'brand_guidelines', name: 'Brand Guidelines', description: 'Complete brand style guide' },
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

// FIXED: Proper agent assignment based on deliverable type
function getAgentForDeliverable(deliverableType: string, phaseAgents: string[]): string {
  const mappedAgent = DELIVERABLE_AGENT_MAPPING[deliverableType];
  if (mappedAgent && phaseAgents.includes(mappedAgent)) {
    return mappedAgent;
  }
  // Fallback to round-robin if no specific mapping
  return phaseAgents[0];
}

// Unified start_phase action - gets phase, activates it if needed, and starts agent work
async function startPhase(supabase: any, supabaseUrl: string, serviceKey: string, params: any) {
  const { projectId, phaseNumber } = params;

  console.log('[phase-auto-worker] startPhase called:', { projectId, phaseNumber });

  // Get the phase
  const { data: phase, error: phaseError } = await supabase
    .from('business_phases')
    .select('*')
    .eq('project_id', projectId)
    .eq('phase_number', phaseNumber)
    .maybeSingle();

  if (phaseError) {
    throw new Error(`Failed to fetch phase: ${phaseError.message}`);
  }

  if (!phase) {
    throw new Error(`Phase ${phaseNumber} not found for project ${projectId}`);
  }

  const userId = phase.user_id;

  // If phase is not active, activate it first
  if (phase.status !== 'active') {
    await supabase
      .from('business_phases')
      .update({
        status: 'active',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', phase.id);
  }

  // Get existing deliverables for this phase
  const { data: existingDeliverables } = await supabase
    .from('phase_deliverables')
    .select('*')
    .eq('phase_id', phase.id);

  // Get project details
  const { data: project } = await supabase
    .from('business_projects')
    .select('*')
    .eq('id', projectId)
    .single();

  const phaseTeam = PHASE_TEAMS[phaseNumber];
  if (!phaseTeam) {
    throw new Error('No team configured for this phase');
  }

  // Get pending deliverables to work on
  const pendingDeliverables = (existingDeliverables || []).filter(
    (d: any) => d.status === 'pending' || d.status === 'in_progress'
  );

  console.log('[phase-auto-worker] Starting work on', pendingDeliverables.length, 'deliverables with agents:', phaseTeam.agents);

  // Start work on each pending deliverable with CORRECT agent assignment
  const workStarted: any[] = [];

  for (const deliverable of pendingDeliverables) {
    // FIXED: Get the correct agent for this deliverable type
    const assignedAgent = getAgentForDeliverable(deliverable.deliverable_type, phaseTeam.agents);
    const agentName = assignedAgent.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

    console.log(`[phase-auto-worker] Assigning ${deliverable.name} (${deliverable.deliverable_type}) to ${assignedAgent}`);

    // Update deliverable status to in_progress
    await supabase
      .from('phase_deliverables')
      .update({
        status: 'in_progress',
        assigned_agent_id: assignedAgent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliverable.id);

    // Log agent activity with project context
    await supabase.from('agent_activity_logs').insert({
      agent_id: assignedAgent,
      agent_name: agentName,
      action: `Started working on: ${deliverable.name}`,
      status: 'in_progress',
      metadata: {
        deliverableId: deliverable.id,
        deliverableType: deliverable.deliverable_type,
        phaseNumber,
        projectId,
      },
    });

    // Call agent-work-executor to actually do the work
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/agent-work-executor`, {
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
          phaseNumber, // CRITICAL: Pass phase number for phase-specific work
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
        assignedAgent,
        agentName,
        success: result.success,
        successCount: result.data?.successCount,
        totalCount: result.data?.totalCount,
      });

      console.log(`[phase-auto-worker] Agent work result for ${deliverable.name}:`, result.success);
    } catch (error) {
      console.error(`[phase-auto-worker] Error starting work on ${deliverable.name}:`, error);
      workStarted.push({
        deliverableId: deliverable.id,
        deliverableName: deliverable.name,
        deliverableType: deliverable.deliverable_type,
        assignedAgent,
        agentName,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Send notification
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'phase_work_started',
    title: `Phase ${phaseNumber} Agents Activated`,
    message: `${workStarted.length} agents are now working on your deliverables.`,
    metadata: { phaseId: phase.id, phaseNumber, workStarted: workStarted.length, agents: phaseTeam.agents },
  });

  return {
    phaseId: phase.id,
    phaseName: phase.phase_name,
    phaseNumber,
    status: 'active',
    deliverablesInProgress: workStarted.length,
    workStarted,
    assignedAgents: phaseTeam.agents,
  };
}

async function activatePhase(supabase: any, supabaseUrl: string, serviceKey: string, params: any) {
  const { userId, projectId, phaseId, phaseNumber } = params;

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
    try {
      await supabase.functions.invoke('meeting-orchestrator', {
        body: {
          action: 'schedule_standup',
          userId,
          projectId,
          teamId: phaseTeam.teamId,
          scheduledAt: new Date().toISOString(),
          attendees: phaseTeam.agents.map(agentId => ({
            agentId,
            agentName: agentId.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
            role: 'team_member',
          })),
        },
      });
    } catch (e) {
      console.log('[phase-auto-worker] Meeting orchestrator not available:', e);
    }
  }

  // Log activity
  await supabase.from('agent_activity_logs').insert({
    agent_id: 'coo-agent',
    agent_name: 'COO Agent',
    action: `Activated Phase ${phase.phase_number}: ${phase.phase_name}`,
    status: 'completed',
    metadata: { phaseId: phase.id, projectId, deliverableCount: createdDeliverables.length },
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

  const { data: project } = await supabase
    .from('business_projects')
    .select('*')
    .eq('id', projectId)
    .single();

  const workStarted: any[] = [];

  for (const deliverable of (deliverables || [])) {
    const assignedAgent = getAgentForDeliverable(deliverable.deliverable_type, phaseTeam.agents);

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
          phaseNumber: phase.phase_number, // CRITICAL: Pass phase number
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

  // Mark current phase as completed
  await supabase
    .from('business_phases')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('project_id', projectId)
    .eq('phase_number', currentPhaseNumber);

  // Get next phase
  const nextPhaseNumber = currentPhaseNumber + 1;
  const { data: nextPhase } = await supabase
    .from('business_phases')
    .select('*')
    .eq('project_id', projectId)
    .eq('phase_number', nextPhaseNumber)
    .single();

  if (!nextPhase) {
    return { 
      success: true, 
      message: 'All phases completed!', 
      projectComplete: true 
    };
  }

  // Activate next phase
  await supabase
    .from('business_phases')
    .update({
      status: 'active',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', nextPhase.id);

  // Notify user
  await supabase.from('notifications').insert({
    user_id: nextPhase.user_id,
    type: 'phase_advanced',
    title: `Phase ${nextPhaseNumber} Ready`,
    message: `Phase ${currentPhaseNumber} completed! Phase ${nextPhaseNumber}: ${nextPhase.phase_name} is now active.`,
    metadata: { previousPhase: currentPhaseNumber, newPhase: nextPhaseNumber },
  });

  return {
    success: true,
    previousPhase: currentPhaseNumber,
    newPhase: nextPhaseNumber,
    phaseName: nextPhase.phase_name,
    phaseId: nextPhase.id,
  };
}

async function monitorProgress(supabase: any, supabaseUrl: string, serviceKey: string, params: any) {
  const { projectId } = params;

  // Get all phases for the project
  const { data: phases } = await supabase
    .from('business_phases')
    .select('*')
    .eq('project_id', projectId)
    .order('phase_number');

  // Get all deliverables
  const { data: allDeliverables } = await supabase
    .from('phase_deliverables')
    .select('*, business_phases!inner(project_id)')
    .eq('business_phases.project_id', projectId);

  // Calculate progress per phase
  const phaseProgress = (phases || []).map((phase: any) => {
    const phaseDeliverables = (allDeliverables || []).filter((d: any) => d.phase_id === phase.id);
    const approved = phaseDeliverables.filter((d: any) => d.ceo_approved && d.user_approved).length;
    
    return {
      phaseNumber: phase.phase_number,
      phaseName: phase.phase_name,
      status: phase.status,
      totalDeliverables: phaseDeliverables.length,
      approvedDeliverables: approved,
      progressPercentage: phaseDeliverables.length > 0 
        ? Math.round((approved / phaseDeliverables.length) * 100) 
        : 0,
    };
  });

  // Get recent activity
  const { data: recentActivity } = await supabase
    .from('agent_activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  return {
    phases: phaseProgress,
    recentActivity: recentActivity || [],
    overallProgress: phaseProgress.length > 0
      ? Math.round(phaseProgress.reduce((sum: number, p: any) => sum + p.progressPercentage, 0) / phaseProgress.length)
      : 0,
  };
}
