import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Escalation timeouts in milliseconds
const MANAGER_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const CEO_TIMEOUT = 10 * 60 * 1000; // 10 minutes

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, ...params } = await req.json();

    console.log(`[escalation-handler] Action: ${action}`, params);

    let result;

    switch (action) {
      case 'create_escalation':
        result = await createEscalation(supabase, params);
        break;
      case 'escalate_to_manager':
        result = await escalateToManager(supabase, params);
        break;
      case 'escalate_to_ceo':
        result = await escalateToCEO(supabase, params);
        break;
      case 'escalate_to_human':
        result = await escalateToHuman(supabase, params);
        break;
      case 'resolve_escalation':
        result = await resolveEscalation(supabase, params);
        break;
      case 'add_solution_attempt':
        result = await addSolutionAttempt(supabase, params);
        break;
      case 'get_escalations':
        result = await getEscalations(supabase, params);
        break;
      case 'check_timeouts':
        result = await checkTimeouts(supabase, params);
        break;
      case 'respond_to_escalation':
        result = await respondToEscalation(supabase, params);
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
    console.error('[escalation-handler] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function createEscalation(supabase: any, params: any) {
  const { userId, projectId, agentId, agentName, issueType, issueDescription, context, taskId, deliverableId, teamId, managerId } = params;

  // Create escalation starting at level 1 (manager)
  const { data: escalation, error } = await supabase
    .from('escalations')
    .insert({
      user_id: userId,
      project_id: projectId,
      created_by_agent_id: agentId,
      created_by_agent_name: agentName,
      escalation_level: 1,
      current_handler_type: 'manager',
      current_handler_id: managerId,
      issue_type: issueType,
      issue_description: issueDescription,
      context: context || {},
      task_id: taskId,
      deliverable_id: deliverableId,
      status: 'open',
      escalated_to_manager_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  // Log activity
  await supabase.from('agent_activity_logs').insert({
    agent_id: agentId,
    agent_name: agentName,
    action: `Created escalation: ${issueType}`,
    status: 'pending',
    metadata: { escalationId: escalation.id, issueType, managerId },
  });

  // Notify manager
  await supabase.from('agent_messages').insert({
    user_id: userId,
    project_id: projectId,
    from_agent_id: agentId,
    from_agent_name: agentName,
    to_agent_id: managerId,
    to_agent_name: 'Team Manager',
    team_id: teamId,
    message_type: 'request_help',
    subject: `⚠️ Escalation: ${issueType}`,
    content: issueDescription,
    context: { escalationId: escalation.id, taskId, deliverableId },
    priority: 'urgent',
  });

  // Create notification for user
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'escalation',
    title: `Agent Escalation: ${issueType}`,
    message: `${agentName} has created an escalation: ${issueDescription.substring(0, 100)}...`,
    metadata: { escalationId: escalation.id, agentId, issueType },
  });

  return escalation;
}

async function escalateToManager(supabase: any, params: any) {
  const { escalationId, managerId, managerName } = params;

  const { data, error } = await supabase
    .from('escalations')
    .update({
      escalation_level: 1,
      current_handler_type: 'manager',
      current_handler_id: managerId,
      escalated_to_manager_at: new Date().toISOString(),
      status: 'in_progress',
      updated_at: new Date().toISOString(),
    })
    .eq('id', escalationId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

async function escalateToCEO(supabase: any, params: any) {
  const { escalationId, reason } = params;

  // Get escalation details
  const { data: escalation, error: fetchError } = await supabase
    .from('escalations')
    .select('*')
    .eq('id', escalationId)
    .single();

  if (fetchError) throw fetchError;

  // Update escalation to CEO level
  const { data, error } = await supabase
    .from('escalations')
    .update({
      escalation_level: 2,
      current_handler_type: 'ceo',
      current_handler_id: 'ceo-agent',
      escalated_to_ceo_at: new Date().toISOString(),
      attempted_solutions: [
        ...(escalation.attempted_solutions || []),
        { level: 'manager', reason, timestamp: new Date().toISOString() },
      ],
      updated_at: new Date().toISOString(),
    })
    .eq('id', escalationId)
    .select()
    .single();

  if (error) throw error;

  // Notify CEO agent
  await supabase.from('agent_messages').insert({
    user_id: escalation.user_id,
    project_id: escalation.project_id,
    from_agent_id: escalation.current_handler_id || 'manager',
    from_agent_name: 'Team Manager',
    to_agent_id: 'ceo-agent',
    to_agent_name: 'CEO Agent',
    message_type: 'request_help',
    subject: `🚨 CEO Escalation: ${escalation.issue_type}`,
    content: `Manager escalation: ${reason}\n\nOriginal issue: ${escalation.issue_description}`,
    context: { escalationId, previousAttempts: escalation.attempted_solutions },
    priority: 'urgent',
  });

  // Log activity
  await supabase.from('agent_activity_logs').insert({
    agent_id: 'coo-agent',
    agent_name: 'COO Agent',
    action: `Escalated to CEO: ${escalation.issue_type}`,
    status: 'pending',
    metadata: { escalationId, reason },
  });

  return data;
}

async function escalateToHuman(supabase: any, params: any) {
  const { escalationId, reason } = params;

  // Get escalation details
  const { data: escalation, error: fetchError } = await supabase
    .from('escalations')
    .select('*')
    .eq('id', escalationId)
    .single();

  if (fetchError) throw fetchError;

  // Update escalation to human level
  const { data, error } = await supabase
    .from('escalations')
    .update({
      escalation_level: 3,
      current_handler_type: 'human',
      current_handler_id: 'human_user',
      escalated_to_human_at: new Date().toISOString(),
      status: 'pending_human',
      attempted_solutions: [
        ...(escalation.attempted_solutions || []),
        { level: 'ceo', reason, timestamp: new Date().toISOString() },
      ],
      updated_at: new Date().toISOString(),
    })
    .eq('id', escalationId)
    .select()
    .single();

  if (error) throw error;

  // Create urgent notification for human user
  await supabase.from('notifications').insert({
    user_id: escalation.user_id,
    type: 'escalation_human',
    title: '🚨 URGENT: Human Intervention Required',
    message: `The agents need your help! Issue: ${escalation.issue_description.substring(0, 150)}...`,
    metadata: { 
      escalationId, 
      issueType: escalation.issue_type,
      attemptedSolutions: escalation.attempted_solutions,
      context: escalation.context,
    },
  });

  // Send email notification if Resend is configured
  try {
    await supabase.functions.invoke('send-email-notification', {
      body: {
        userId: escalation.user_id,
        template: 'escalation_human',
        data: {
          issueType: escalation.issue_type,
          issueDescription: escalation.issue_description,
          attemptedSolutions: escalation.attempted_solutions,
          escalationId,
        },
      },
    });
  } catch (emailError) {
    console.error('Failed to send email notification:', emailError);
  }

  // Log activity
  await supabase.from('agent_activity_logs').insert({
    agent_id: 'ceo-agent',
    agent_name: 'CEO Agent',
    action: `Escalated to Human User: ${escalation.issue_type}`,
    status: 'pending',
    metadata: { escalationId, reason },
  });

  return data;
}

async function resolveEscalation(supabase: any, params: any) {
  const { escalationId, resolution, resolutionType, resolvedBy } = params;

  const { data, error } = await supabase
    .from('escalations')
    .update({
      resolution,
      resolution_type: resolutionType || 'resolved',
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
      status: 'resolved',
      updated_at: new Date().toISOString(),
    })
    .eq('id', escalationId)
    .select()
    .single();

  if (error) throw error;

  // Notify the original agent
  await supabase.from('agent_messages').insert({
    user_id: data.user_id,
    project_id: data.project_id,
    from_agent_id: resolvedBy,
    from_agent_name: resolvedBy === 'human_user' ? 'Human User' : 'Manager',
    to_agent_id: data.created_by_agent_id,
    to_agent_name: data.created_by_agent_name,
    message_type: 'answer',
    subject: `✅ Escalation Resolved: ${data.issue_type}`,
    content: resolution,
    context: { escalationId, resolutionType },
    priority: 'high',
  });

  // Log activity
  await supabase.from('agent_activity_logs').insert({
    agent_id: resolvedBy,
    agent_name: resolvedBy === 'human_user' ? 'Human User' : resolvedBy,
    action: `Resolved escalation: ${data.issue_type}`,
    status: 'completed',
    metadata: { escalationId, resolutionType },
  });

  return data;
}

async function addSolutionAttempt(supabase: any, params: any) {
  const { escalationId, attempt } = params;

  const { data: escalation, error: fetchError } = await supabase
    .from('escalations')
    .select('attempted_solutions')
    .eq('id', escalationId)
    .single();

  if (fetchError) throw fetchError;

  const { data, error } = await supabase
    .from('escalations')
    .update({
      attempted_solutions: [
        ...(escalation.attempted_solutions || []),
        { ...attempt, timestamp: new Date().toISOString() },
      ],
      updated_at: new Date().toISOString(),
    })
    .eq('id', escalationId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

async function getEscalations(supabase: any, params: any) {
  const { projectId, status, level, limit } = params;

  let query = supabase
    .from('escalations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit || 50);

  if (projectId) query = query.eq('project_id', projectId);
  if (status) query = query.eq('status', status);
  if (level) query = query.eq('escalation_level', level);

  const { data, error } = await query;
  if (error) throw error;

  return data;
}

async function checkTimeouts(supabase: any, params: any) {
  const { projectId } = params;

  // Get open escalations
  const { data: escalations, error } = await supabase
    .from('escalations')
    .select('*')
    .eq('project_id', projectId)
    .in('status', ['open', 'in_progress']);

  if (error) throw error;

  const now = Date.now();
  const escalationsToUpdate: any[] = [];

  for (const escalation of escalations || []) {
    // Check manager timeout
    if (escalation.escalation_level === 1 && escalation.escalated_to_manager_at) {
      const managerTime = new Date(escalation.escalated_to_manager_at).getTime();
      if (now - managerTime > MANAGER_TIMEOUT) {
        escalationsToUpdate.push({ ...escalation, nextLevel: 2 });
      }
    }
    // Check CEO timeout
    else if (escalation.escalation_level === 2 && escalation.escalated_to_ceo_at) {
      const ceoTime = new Date(escalation.escalated_to_ceo_at).getTime();
      if (now - ceoTime > CEO_TIMEOUT) {
        escalationsToUpdate.push({ ...escalation, nextLevel: 3 });
      }
    }
  }

  // Auto-escalate timed out escalations
  for (const escalation of escalationsToUpdate) {
    if (escalation.nextLevel === 2) {
      await escalateToCEO(supabase, {
        escalationId: escalation.id,
        reason: 'Manager response timeout (5 minutes)',
      });
    } else if (escalation.nextLevel === 3) {
      await escalateToHuman(supabase, {
        escalationId: escalation.id,
        reason: 'CEO response timeout (10 minutes)',
      });
    }
  }

  return { checked: escalations?.length || 0, escalated: escalationsToUpdate.length };
}

async function respondToEscalation(supabase: any, params: any) {
  const { escalationId, responderId, responderType, response, action } = params;

  if (action === 'resolve') {
    return await resolveEscalation(supabase, {
      escalationId,
      resolution: response,
      resolutionType: 'resolved',
      resolvedBy: responderId,
    });
  }

  if (action === 'escalate') {
    const { data: escalation } = await supabase
      .from('escalations')
      .select('escalation_level')
      .eq('id', escalationId)
      .single();

    if (escalation?.escalation_level === 1) {
      return await escalateToCEO(supabase, { escalationId, reason: response });
    } else if (escalation?.escalation_level === 2) {
      return await escalateToHuman(supabase, { escalationId, reason: response });
    }
  }

  // Just add a solution attempt
  return await addSolutionAttempt(supabase, {
    escalationId,
    attempt: {
      responderId,
      responderType,
      response,
      action,
    },
  });
}
