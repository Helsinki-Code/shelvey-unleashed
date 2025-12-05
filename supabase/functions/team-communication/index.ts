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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, ...params } = await req.json();

    console.log(`[team-communication] Action: ${action}`, params);

    let result;

    switch (action) {
      case 'send_message':
        result = await sendMessage(supabase, params);
        break;
      case 'request_help':
        result = await requestHelp(supabase, params);
        break;
      case 'handoff_task':
        result = await handoffTask(supabase, params);
        break;
      case 'submit_report':
        result = await submitReport(supabase, params);
        break;
      case 'broadcast_to_team':
        result = await broadcastToTeam(supabase, params);
        break;
      case 'get_messages':
        result = await getMessages(supabase, params);
        break;
      case 'mark_read':
        result = await markRead(supabase, params);
        break;
      case 'reply_to_message':
        result = await replyToMessage(supabase, params);
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
    console.error('[team-communication] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendMessage(supabase: any, params: any) {
  const { userId, projectId, fromAgentId, fromAgentName, toAgentId, toAgentName, teamId, messageType, subject, content, context, priority } = params;

  const { data, error } = await supabase
    .from('agent_messages')
    .insert({
      user_id: userId,
      project_id: projectId,
      from_agent_id: fromAgentId,
      from_agent_name: fromAgentName,
      to_agent_id: toAgentId,
      to_agent_name: toAgentName,
      team_id: teamId,
      message_type: messageType || 'status_update',
      subject,
      content,
      context: context || {},
      priority: priority || 'normal',
    })
    .select()
    .single();

  if (error) throw error;

  // Log activity
  await supabase.from('agent_activity_logs').insert({
    agent_id: fromAgentId,
    agent_name: fromAgentName,
    action: `Sent ${messageType} to ${toAgentName || 'team'}`,
    status: 'completed',
    metadata: { messageId: data.id, messageType, toAgent: toAgentId },
  });

  return data;
}

async function requestHelp(supabase: any, params: any) {
  const { userId, projectId, fromAgentId, fromAgentName, toAgentId, toAgentName, teamId, issue, context, taskId } = params;

  // Create help request message
  const { data: message, error: messageError } = await supabase
    .from('agent_messages')
    .insert({
      user_id: userId,
      project_id: projectId,
      from_agent_id: fromAgentId,
      from_agent_name: fromAgentName,
      to_agent_id: toAgentId,
      to_agent_name: toAgentName,
      team_id: teamId,
      message_type: 'request_help',
      subject: `Help needed: ${issue.substring(0, 50)}...`,
      content: issue,
      context: { ...context, taskId },
      priority: 'high',
    })
    .select()
    .single();

  if (messageError) throw messageError;

  // Log activity
  await supabase.from('agent_activity_logs').insert({
    agent_id: fromAgentId,
    agent_name: fromAgentName,
    action: `Requested help from ${toAgentName}`,
    status: 'pending',
    metadata: { messageId: message.id, issue: issue.substring(0, 100), taskId },
  });

  return message;
}

async function handoffTask(supabase: any, params: any) {
  const { userId, projectId, fromAgentId, fromAgentName, toAgentId, toAgentName, teamId, taskId, deliverableId, handoffNotes, completedWork, nextSteps } = params;

  // Create handoff message
  const { data: message, error: messageError } = await supabase
    .from('agent_messages')
    .insert({
      user_id: userId,
      project_id: projectId,
      from_agent_id: fromAgentId,
      from_agent_name: fromAgentName,
      to_agent_id: toAgentId,
      to_agent_name: toAgentName,
      team_id: teamId,
      message_type: 'handoff',
      subject: `Task Handoff: ${handoffNotes?.substring(0, 50) || 'Work handoff'}`,
      content: handoffNotes || 'Handing off work',
      context: { taskId, deliverableId, completedWork, nextSteps },
      priority: 'high',
    })
    .select()
    .single();

  if (messageError) throw messageError;

  // Update task assignment if taskId provided
  if (taskId) {
    await supabase
      .from('agent_tasks')
      .update({ 
        assigned_agent_id: toAgentId,
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);
  }

  // Log activity
  await supabase.from('agent_activity_logs').insert({
    agent_id: fromAgentId,
    agent_name: fromAgentName,
    action: `Handed off task to ${toAgentName}`,
    status: 'completed',
    metadata: { messageId: message.id, taskId, toAgent: toAgentId },
  });

  return message;
}

async function submitReport(supabase: any, params: any) {
  const { userId, projectId, agentId, agentName, teamId, reportToAgentId, reportToAgentName, reportType, title, content, deliverablesCompleted, tasksInProgress, blockers, nextSteps, metrics } = params;

  const { data, error } = await supabase
    .from('progress_reports')
    .insert({
      user_id: userId,
      project_id: projectId,
      agent_id: agentId,
      agent_name: agentName,
      team_id: teamId,
      report_to_agent_id: reportToAgentId,
      report_to_agent_name: reportToAgentName,
      report_type: reportType || 'daily',
      title,
      content,
      deliverables_completed: deliverablesCompleted || [],
      tasks_in_progress: tasksInProgress || [],
      blockers: blockers || [],
      next_steps: nextSteps || [],
      metrics: metrics || {},
    })
    .select()
    .single();

  if (error) throw error;

  // Log activity
  await supabase.from('agent_activity_logs').insert({
    agent_id: agentId,
    agent_name: agentName,
    action: `Submitted ${reportType} report to ${reportToAgentName}`,
    status: 'completed',
    metadata: { reportId: data.id, reportType, reportTo: reportToAgentId },
  });

  // Send notification message to manager
  await supabase.from('agent_messages').insert({
    user_id: userId,
    project_id: projectId,
    from_agent_id: agentId,
    from_agent_name: agentName,
    to_agent_id: reportToAgentId,
    to_agent_name: reportToAgentName,
    team_id: teamId,
    message_type: 'status_update',
    subject: `Progress Report: ${title}`,
    content: `${agentName} has submitted a ${reportType} report. ${blockers?.length ? `⚠️ ${blockers.length} blocker(s) reported.` : ''}`,
    context: { reportId: data.id, reportType },
    priority: blockers?.length ? 'high' : 'normal',
  });

  return data;
}

async function broadcastToTeam(supabase: any, params: any) {
  const { userId, projectId, fromAgentId, fromAgentName, teamId, subject, content, messageType, priority } = params;

  const { data, error } = await supabase
    .from('agent_messages')
    .insert({
      user_id: userId,
      project_id: projectId,
      from_agent_id: fromAgentId,
      from_agent_name: fromAgentName,
      to_agent_id: null,
      to_agent_name: null,
      team_id: teamId,
      message_type: messageType || 'broadcast',
      subject,
      content,
      priority: priority || 'normal',
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

async function getMessages(supabase: any, params: any) {
  const { projectId, agentId, teamId, unreadOnly, limit } = params;

  let query = supabase
    .from('agent_messages')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit || 50);

  if (agentId) {
    query = query.or(`to_agent_id.eq.${agentId},to_agent_id.is.null`);
  }

  if (teamId) {
    query = query.eq('team_id', teamId);
  }

  if (unreadOnly) {
    query = query.is('read_at', null);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data;
}

async function markRead(supabase: any, params: any) {
  const { messageId } = params;

  const { data, error } = await supabase
    .from('agent_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('id', messageId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function replyToMessage(supabase: any, params: any) {
  const { userId, projectId, parentMessageId, fromAgentId, fromAgentName, content } = params;

  // Get parent message
  const { data: parentMessage, error: parentError } = await supabase
    .from('agent_messages')
    .select('*')
    .eq('id', parentMessageId)
    .single();

  if (parentError) throw parentError;

  // Create reply
  const { data, error } = await supabase
    .from('agent_messages')
    .insert({
      user_id: userId,
      project_id: projectId,
      from_agent_id: fromAgentId,
      from_agent_name: fromAgentName,
      to_agent_id: parentMessage.from_agent_id,
      to_agent_name: parentMessage.from_agent_name,
      team_id: parentMessage.team_id,
      message_type: 'answer',
      subject: `Re: ${parentMessage.subject || ''}`,
      content,
      parent_message_id: parentMessageId,
      priority: parentMessage.priority,
    })
    .select()
    .single();

  if (error) throw error;

  // Mark parent as replied
  await supabase
    .from('agent_messages')
    .update({ replied_at: new Date().toISOString() })
    .eq('id', parentMessageId);

  return data;
}
