import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CEO_SYSTEM_PROMPT = `You are the CEO Agent of ShelVey - an advanced AI business strategist and executor. Your role is to:

1. **MARKET RESEARCH**: Conduct deep market analysis to identify high-profit opportunities in current market conditions.
2. **BUSINESS MODELING**: Create detailed, actionable business models with revenue projections.
3. **EXECUTION PLANNING**: Break down business building into step-by-step tasks.
4. **AGENT COORDINATION**: Delegate tasks to specialized agents (Marketing, Sales, Development, Content, etc.)
5. **REAL RESULTS**: Focus on generating REAL revenue through proven strategies.
6. **QUALITY ASSURANCE**: Review and approve all deliverables before they proceed to the next phase.

When the user starts a new business project:
- Ask clarifying questions about their interests, skills, and capital
- Research current market trends and opportunities
- Propose 2-3 high-potential business models with detailed analysis
- Once they choose, create a comprehensive execution plan
- Guide them step-by-step through building the business

**APPROVAL WORKFLOW:**
When reviewing deliverables (brand assets, websites, content):
- Analyze the deliverable for quality, brand consistency, and market fit
- Check if it aligns with the business strategy and target audience
- Provide specific, actionable feedback if improvements are needed
- Only approve when the deliverable meets professional standards
- After both CEO (you) and user approve, automatically trigger the next phase

You have access to these specialized agents (to be delegated tasks):
- Market Research Agent: Competitor analysis, market sizing, trend identification
- Brand Identity Agent: Logo design, color schemes, visual identity
- Content Builder Agent: Website copy, blog posts, social media content
- SEO Optimization Agent: Keyword research, on-page optimization
- Social Media Manager: Content scheduling, engagement strategies
- Sales Development Agent: Lead generation, outreach sequences
- Code Builder Agent: Website development, automation scripts

Always be specific, actionable, and focused on generating real revenue. Provide actual numbers, timelines, and metrics.`;

// Function to review a deliverable
async function reviewDeliverable(supabase: any, deliverableId: string, lovableApiKey: string): Promise<{ approved: boolean; feedback: string }> {
  // Fetch the deliverable
  const { data: deliverable, error } = await supabase
    .from('phase_deliverables')
    .select('*, business_phases(*)')
    .eq('id', deliverableId)
    .single();

  if (error || !deliverable) {
    throw new Error('Deliverable not found');
  }

  const reviewPrompt = `You are the CEO Agent reviewing a ${deliverable.deliverable_type} deliverable.

Deliverable Name: ${deliverable.name}
Description: ${deliverable.description || 'No description'}
Content: ${JSON.stringify(deliverable.generated_content || deliverable.content, null, 2)}

Please review this deliverable and provide:
1. A quality score (1-10)
2. Whether you approve it (yes/no)
3. Specific feedback for improvements if not approved

Respond in JSON format:
{
  "quality_score": <number>,
  "approved": <boolean>,
  "feedback": "<detailed feedback>",
  "improvements": ["<improvement 1>", "<improvement 2>"]
}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are a discerning CEO reviewing business deliverables. Be constructive but maintain high standards." },
        { role: "user", content: reviewPrompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to get AI review');
  }

  const aiResponse = await response.json();
  const reviewText = aiResponse.choices?.[0]?.message?.content || '';
  
  // Parse JSON from response
  try {
    const jsonMatch = reviewText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const review = JSON.parse(jsonMatch[0]);
      return {
        approved: review.approved && review.quality_score >= 7,
        feedback: review.feedback || 'Review complete',
      };
    }
  } catch {
    // Fallback parsing
  }

  return {
    approved: reviewText.toLowerCase().includes('approved') && !reviewText.toLowerCase().includes('not approved'),
    feedback: reviewText.slice(0, 500),
  };
}

// Function to check if both approvals are complete and trigger next phase
async function checkAndProceed(supabase: any, deliverableId: string, userId: string) {
  const { data: deliverable } = await supabase
    .from('phase_deliverables')
    .select('*, business_phases(*)')
    .eq('id', deliverableId)
    .single();

  if (!deliverable) return;

  // If both approved, update status and check phase completion
  if (deliverable.ceo_approved && deliverable.user_approved) {
    await supabase
      .from('phase_deliverables')
      .update({ status: 'approved' })
      .eq('id', deliverableId);

    // Check if all deliverables in this phase are approved
    const { data: phaseDeliverables } = await supabase
      .from('phase_deliverables')
      .select('*')
      .eq('phase_id', deliverable.phase_id);

    const allApproved = phaseDeliverables?.every((d: any) => d.status === 'approved');

    if (allApproved) {
      // Update phase status
      await supabase
        .from('business_phases')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', deliverable.phase_id);

      // Activate next phase
      const nextPhaseNumber = deliverable.business_phases.phase_number + 1;
      await supabase
        .from('business_phases')
        .update({ status: 'active', started_at: new Date().toISOString() })
        .eq('project_id', deliverable.business_phases.project_id)
        .eq('phase_number', nextPhaseNumber);

      console.log(`Phase ${deliverable.business_phases.phase_number} completed, activating phase ${nextPhaseNumber}`);
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, conversationId, projectId } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`CEO Agent chat for user ${user.id}, conversation: ${conversationId}`);

    // Call Lovable AI Gateway with streaming
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: CEO_SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add more credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log this as real agent activity
    await supabase.from("user_agent_activity").insert({
      user_id: user.id,
      project_id: projectId || null,
      agent_id: "ceo-agent",
      agent_name: "CEO Agent",
      action: "Processing business strategy request",
      status: "completed",
      metadata: { message_count: messages.length },
    });

    // Return streaming response
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error) {
    console.error("CEO Agent error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
