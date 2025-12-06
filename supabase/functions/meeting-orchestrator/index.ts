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
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, ...params } = await req.json();

    console.log(`[meeting-orchestrator] Action: ${action}`, params);

    let result;

    switch (action) {
      case 'schedule_standup':
        result = await scheduleStandup(supabase, params);
        break;
      case 'start_meeting':
        result = await startMeeting(supabase, params, openaiApiKey);
        break;
      case 'conduct_standup':
        result = await conductStandup(supabase, params, openaiApiKey);
        break;
      case 'end_meeting':
        result = await endMeeting(supabase, params, openaiApiKey);
        break;
      case 'get_meetings':
        result = await getMeetings(supabase, params);
        break;
      case 'add_action_item':
        result = await addActionItem(supabase, params);
        break;
      case 'schedule_review':
        result = await scheduleReview(supabase, params);
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
    console.error('[meeting-orchestrator] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function scheduleStandup(supabase: any, params: any) {
  const { userId, projectId, teamId, scheduledAt, attendees } = params;

  // Get team members if attendees not specified
  let meetingAttendees = attendees;
  if (!meetingAttendees && teamId) {
    const { data: teamMembers } = await supabase
      .from('team_members')
      .select('agent_id, agent_name, role')
      .eq('team_id', teamId);
    
    meetingAttendees = teamMembers?.map((m: any) => ({
      agentId: m.agent_id,
      agentName: m.agent_name,
      role: m.role,
    })) || [];
  }

  const { data, error } = await supabase
    .from('team_meetings')
    .insert({
      user_id: userId,
      project_id: projectId,
      team_id: teamId,
      meeting_type: 'standup',
      scheduled_at: scheduledAt || new Date().toISOString(),
      attendees: meetingAttendees,
      agenda: [
        { item: 'Review yesterday\'s progress', duration: '5 min' },
        { item: 'Today\'s priorities', duration: '5 min' },
        { item: 'Blockers and help needed', duration: '5 min' },
        { item: 'Action items', duration: '5 min' },
      ],
      status: 'scheduled',
    })
    .select()
    .single();

  if (error) throw error;

  // Log activity
  await supabase.from('agent_activity_logs').insert({
    agent_id: 'coo-agent',
    agent_name: 'COO Agent',
    action: `Scheduled team standup`,
    status: 'completed',
    metadata: { meetingId: data.id, teamId, attendeeCount: meetingAttendees?.length },
  });

  return data;
}

async function startMeeting(supabase: any, params: any, openaiApiKey: string | undefined) {
  const { meetingId } = params;

  const { data: meeting, error: meetingError } = await supabase
    .from('team_meetings')
    .update({ 
      started_at: new Date().toISOString(),
      status: 'in_progress',
    })
    .eq('id', meetingId)
    .select()
    .single();

  if (meetingError) throw meetingError;

  // Log activity
  await supabase.from('agent_activity_logs').insert({
    agent_id: 'coo-agent',
    agent_name: 'COO Agent',
    action: `Started ${meeting.meeting_type} meeting`,
    status: 'in_progress',
    metadata: { meetingId, meetingType: meeting.meeting_type },
  });

  return meeting;
}

async function conductStandup(supabase: any, params: any, openaiApiKey: string | undefined) {
  const { meetingId, projectId, teamId, userId } = params;

  // Get meeting details
  const { data: meeting, error: meetingError } = await supabase
    .from('team_meetings')
    .select('*')
    .eq('id', meetingId)
    .single();

  if (meetingError) throw meetingError;

  // Get recent progress reports from team members
  const { data: recentReports } = await supabase
    .from('progress_reports')
    .select('*')
    .eq('project_id', projectId)
    .eq('team_id', teamId)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  // Get pending tasks for team
  const { data: pendingTasks } = await supabase
    .from('agent_tasks')
    .select('*')
    .eq('project_id', projectId)
    .in('status', ['pending', 'processing'])
    .order('priority', { ascending: false });

  // Get any open escalations
  const { data: escalations } = await supabase
    .from('escalations')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'open');

  // Generate meeting minutes using AI
  let minutes = '';
  let actionItems: any[] = [];
  let decisions: any[] = [];

  if (openaiApiKey) {
    try {
      const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are the COO conducting a team standup meeting. Generate professional meeting minutes based on:
1. Recent progress reports from team members
2. Current pending tasks
3. Any escalations or blockers

Format the response as JSON:
{
  "minutes": "Formatted meeting minutes text",
  "actionItems": [{"assignee": "agent name", "task": "description", "dueBy": "timeframe"}],
  "decisions": [{"decision": "description", "rationale": "why"}],
  "summary": "Brief executive summary"
}`,
            },
            {
              role: 'user',
              content: JSON.stringify({
                attendees: meeting.attendees,
                recentReports,
                pendingTasks,
                escalations,
                agenda: meeting.agenda,
              }),
            },
          ],
        }),
      });

      if (aiResponse.ok) {
        const aiResult = await aiResponse.json();
        const content = aiResult.choices[0]?.message?.content || '';
        try {
          const parsed = JSON.parse(content);
          minutes = parsed.minutes || content;
          actionItems = parsed.actionItems || [];
          decisions = parsed.decisions || [];
        } catch {
          minutes = content;
        }
      }
    } catch (aiError) {
      console.error('AI meeting generation error:', aiError);
      minutes = `Standup meeting conducted with ${meeting.attendees?.length || 0} attendees. Review progress reports and tasks.`;
    }
  } else {
    minutes = `Team standup conducted.\n\nAttendees: ${meeting.attendees?.map((a: any) => a.agentName).join(', ') || 'Team'}\n\nProgress Reports: ${recentReports?.length || 0} submitted\nPending Tasks: ${pendingTasks?.length || 0}\nOpen Escalations: ${escalations?.length || 0}`;
  }

  // Update meeting with minutes
  const { data: updatedMeeting, error: updateError } = await supabase
    .from('team_meetings')
    .update({
      minutes,
      action_items: actionItems,
      decisions,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', meetingId)
    .select()
    .single();

  if (updateError) throw updateError;

  // Broadcast meeting summary to team
  await supabase.from('agent_messages').insert({
    user_id: userId,
    project_id: projectId,
    from_agent_id: 'coo-agent',
    from_agent_name: 'COO Agent',
    team_id: teamId,
    message_type: 'broadcast',
    subject: `Standup Summary - ${new Date().toLocaleDateString()}`,
    content: minutes,
    context: { meetingId, actionItems, decisions },
    priority: 'normal',
  });

  return updatedMeeting;
}

async function endMeeting(supabase: any, params: any, openaiApiKey: string | undefined) {
  const { meetingId, minutes, actionItems, decisions } = params;

  const { data, error } = await supabase
    .from('team_meetings')
    .update({
      completed_at: new Date().toISOString(),
      status: 'completed',
      minutes,
      action_items: actionItems || [],
      decisions: decisions || [],
    })
    .eq('id', meetingId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

async function getMeetings(supabase: any, params: any) {
  const { projectId, teamId, status, limit } = params;

  let query = supabase
    .from('team_meetings')
    .select('*')
    .order('scheduled_at', { ascending: false })
    .limit(limit || 20);

  if (projectId) query = query.eq('project_id', projectId);
  if (teamId) query = query.eq('team_id', teamId);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw error;

  return data;
}

async function addActionItem(supabase: any, params: any) {
  const { meetingId, actionItem } = params;

  const { data: meeting, error: meetingError } = await supabase
    .from('team_meetings')
    .select('action_items')
    .eq('id', meetingId)
    .single();

  if (meetingError) throw meetingError;

  const updatedItems = [...(meeting.action_items || []), actionItem];

  const { data, error } = await supabase
    .from('team_meetings')
    .update({ action_items: updatedItems })
    .eq('id', meetingId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

async function scheduleReview(supabase: any, params: any) {
  const { userId, projectId, teamId, scheduledAt, attendees, reviewType, deliverableIds } = params;

  const { data, error } = await supabase
    .from('team_meetings')
    .insert({
      user_id: userId,
      project_id: projectId,
      team_id: teamId,
      meeting_type: 'review',
      scheduled_at: scheduledAt,
      attendees,
      agenda: [
        { item: `${reviewType || 'Deliverable'} Review`, duration: '15 min' },
        { item: 'Quality Assessment', duration: '10 min' },
        { item: 'Feedback Discussion', duration: '10 min' },
        { item: 'Approval Decision', duration: '5 min' },
      ],
      status: 'scheduled',
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}
