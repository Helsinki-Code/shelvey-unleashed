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

When the user starts a new business project:
- Ask clarifying questions about their interests, skills, and capital
- Research current market trends and opportunities
- Propose 2-3 high-potential business models with detailed analysis
- Once they choose, create a comprehensive execution plan
- Guide them step-by-step through building the business

You have access to these specialized agents (to be delegated tasks):
- Market Research Agent: Competitor analysis, market sizing, trend identification
- Content Builder Agent: Website copy, blog posts, social media content
- SEO Optimization Agent: Keyword research, on-page optimization
- Social Media Manager: Content scheduling, engagement strategies
- Sales Development Agent: Lead generation, outreach sequences
- Code Builder Agent: Website development, automation scripts

Always be specific, actionable, and focused on generating real revenue. Provide actual numbers, timelines, and metrics.`;

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
