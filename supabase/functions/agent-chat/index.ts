import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const getAgentSystemPrompt = (agentName: string, agentRole: string, isManager: boolean, deliverables: any[], teamMembers?: string[]) => {
  const basePrompt = `You are ${agentName}, the ${agentRole} at ShelVey AI Corporation.

Your personality:
- Professional but approachable
- Expert in your domain
- Collaborative team player
- Transparent about your work process

`;

  if (isManager) {
    return basePrompt + `As a Team Manager, you have additional responsibilities:
- You oversee and coordinate your team's work
- You can explain any team member's deliverables and methodology
- You ensure quality standards are met before work goes to CEO review
- You're accountable for your team's performance

Team Members: ${teamMembers?.join(', ') || 'Various specialists'}

When discussing work:
- Reference specific deliverables and their status
- Explain team coordination and task assignments
- Provide consolidated views of phase progress
- Address any concerns about team performance

Available deliverables:
${JSON.stringify(deliverables.map(d => ({ name: d.name, status: d.status, type: d.deliverable_type })), null, 2)}
`;
  }

  return basePrompt + `When discussing your work:
- Reference specific deliverables you've worked on
- Explain your methodology and tools used
- Share your findings and insights
- Discuss recommendations and next steps
- Reference any screenshots or citations in your work

Your deliverables:
${JSON.stringify(deliverables.map(d => ({ name: d.name, status: d.status, type: d.deliverable_type })), null, 2)}
`;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { agentId, agentName, agentRole, isManager, projectId, phaseId, messages } = await req.json();

    if (!agentId || !agentName || !messages) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[AGENT-CHAT] User ${user.id} chatting with ${agentName} (${agentRole})`);

    // Fetch deliverables for context
    let deliverables: any[] = [];
    let teamMembers: string[] = [];

    if (phaseId) {
      const { data: deliverablesData } = await supabase
        .from('phase_deliverables')
        .select('*')
        .eq('phase_id', phaseId);

      if (isManager) {
        deliverables = deliverablesData || [];
      } else {
        deliverables = (deliverablesData || []).filter(d => d.assigned_agent_id === agentId);
      }
    }

    // If manager, get team members
    if (isManager && phaseId) {
      const { data: phase } = await supabase
        .from('business_phases')
        .select('team_id')
        .eq('id', phaseId)
        .single();

      if (phase?.team_id) {
        const { data: members } = await supabase
          .from('team_members')
          .select('agent_name')
          .eq('team_id', phase.team_id);
        
        teamMembers = members?.map(m => m.agent_name) || [];
      }
    }

    const systemPrompt = getAgentSystemPrompt(agentName, agentRole, isManager, deliverables, teamMembers);

    // Log this chat interaction
    await supabase.from('agent_activity_logs').insert({
      agent_id: agentId,
      agent_name: agentName,
      action: `User chat: ${messages[messages.length - 1]?.content?.slice(0, 100)}...`,
      status: 'in_progress',
      metadata: { userId: user.id, isManager, projectId, phaseId }
    });

    // Call OpenAI for streaming response
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log completion
    await supabase.from('agent_activity_logs').insert({
      agent_id: agentId,
      agent_name: agentName,
      action: `Completed user chat response`,
      status: 'completed',
      metadata: { userId: user.id }
    });

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Agent chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
