import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Agent voice configurations
const AGENT_VOICE_CONFIGS: Record<string, { voice: string; instructions: string }> = {
  'ceo': {
    voice: 'alloy',
    instructions: `You are ARIA, the CEO Agent of ShelVey - an autonomous AI business building platform. You are strategic, visionary, and decisive. You help users:
- Discuss and refine their business ideas
- Delegate tasks to specialized teams
- Make strategic decisions
- Review and approve deliverables
- Guide the entire business building process from conception to revenue

Speak confidently and professionally. Ask clarifying questions when needed. Provide actionable insights and recommendations.`
  },
  'sales': {
    voice: 'echo',
    instructions: `You are the Sales Development Agent at ShelVey. You are persuasive, enthusiastic, and customer-focused. You help with:
- Lead qualification and outreach
- Sales pitch development
- Customer objection handling
- Deal closing strategies
- CRM management and pipeline optimization

Be engaging, listen actively, and always focus on customer value and pain points.`
  },
  'support': {
    voice: 'nova',
    instructions: `You are the Customer Success Agent at ShelVey. You are helpful, patient, and solution-oriented. You assist with:
- Customer onboarding
- Technical support
- Feature guidance
- Issue resolution
- Feedback collection

Always be empathetic, acknowledge concerns, and provide clear step-by-step guidance.`
  },
  'research': {
    voice: 'fable',
    instructions: `You are the Market Research Agent at ShelVey. You are analytical, thorough, and data-driven. You help with:
- Market analysis and trends
- Competitor research
- Customer persona development
- Industry insights
- Opportunity identification

Present findings clearly with supporting data and actionable recommendations.`
  },
  'content': {
    voice: 'onyx',
    instructions: `You are the Content Creator Agent at ShelVey. You are creative, engaging, and brand-aware. You help with:
- Blog posts and articles
- Social media content
- Email campaigns
- Video scripts
- Brand messaging

Focus on storytelling, audience engagement, and maintaining consistent brand voice.`
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agentId, userId, customInstructions } = await req.json();
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({
        success: false,
        error: 'OpenAI API key not configured',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get agent configuration
    const agentConfig = AGENT_VOICE_CONFIGS[agentId] || AGENT_VOICE_CONFIGS['ceo'];
    const instructions = customInstructions || agentConfig.instructions;

    console.log(`Creating voice session for agent: ${agentId}, voice: ${agentConfig.voice}`);

    // Request ephemeral token from OpenAI Realtime API
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: agentConfig.voice,
        instructions: instructions,
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: {
          model: "whisper-1"
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 1000
        },
        tools: [
          {
            type: "function",
            name: "delegate_task",
            description: "Delegate a task to a specialized agent team",
            parameters: {
              type: "object",
              properties: {
                taskDescription: { type: "string", description: "Description of the task" },
                targetAgent: { type: "string", description: "Target agent or team ID" },
                priority: { type: "string", enum: ["low", "medium", "high", "urgent"] }
              },
              required: ["taskDescription", "targetAgent"]
            }
          },
          {
            type: "function",
            name: "search_knowledge",
            description: "Search the knowledge base for relevant information",
            parameters: {
              type: "object",
              properties: {
                query: { type: "string", description: "Search query" }
              },
              required: ["query"]
            }
          },
          {
            type: "function",
            name: "get_project_status",
            description: "Get the current status of a business project",
            parameters: {
              type: "object",
              properties: {
                projectId: { type: "string", description: "Project ID" }
              },
              required: ["projectId"]
            }
          }
        ],
        tool_choice: "auto",
        temperature: 0.8,
        max_response_output_tokens: "inf"
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI session creation failed:", response.status, errorText);
      return new Response(JSON.stringify({
        success: false,
        error: `Failed to create voice session: ${response.status}`,
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sessionData = await response.json();
    console.log("Voice session created:", sessionData.id);

    return new Response(JSON.stringify({
      success: true,
      ...sessionData,
      agentConfig: {
        voice: agentConfig.voice,
        agentId,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Voice session error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
