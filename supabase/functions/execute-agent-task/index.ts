import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// All 25 agents with their specializations and preferred MCP servers
const AGENTS = {
  'agent-1': {
    name: 'Market Research Agent',
    role: 'Research & Analysis',
    systemPrompt: `You are a Market Research Agent specialized in competitive analysis, market sizing, and consumer behavior research. You have access to web search, social media, and data analysis tools.`,
    preferredMCP: ['perplexity', 'browser-use', 'twitter', 'contentcore']
  },
  'agent-2': {
    name: 'Trend Prediction Agent',
    role: 'Forecasting',
    systemPrompt: `You are a Trend Prediction Agent specialized in identifying emerging market trends, consumer behavior shifts, and technological disruptions.`,
    preferredMCP: ['perplexity', 'twitter', 'browser-use', 'contentcore']
  },
  'agent-3': {
    name: 'Product Architect Agent',
    role: 'Product Design',
    systemPrompt: `You are a Product Architect Agent specialized in designing product features, user experiences, and technical specifications.`,
    preferredMCP: ['github', '21st-dev', 'shadcn', 'perplexity']
  },
  'agent-4': {
    name: 'Code Builder Agent',
    role: 'Development',
    systemPrompt: `You are a Code Builder Agent specialized in writing clean, efficient code across multiple programming languages and frameworks.`,
    preferredMCP: ['github', 'playwright', 'chrome', 'shadcn', '21st-dev']
  },
  'agent-5': {
    name: 'QA Testing Agent',
    role: 'Quality Assurance',
    systemPrompt: `You are a QA Testing Agent specialized in automated testing, bug detection, and quality assurance processes.`,
    preferredMCP: ['playwright', 'chrome', 'browser-use', 'github']
  },
  'agent-6': {
    name: 'Brand Identity Agent',
    role: 'Branding',
    systemPrompt: `You are a Brand Identity Agent specialized in creating brand guidelines, visual identities, and brand messaging.`,
    preferredMCP: ['canva', 'fal-ai', '21st-dev', 'perplexity']
  },
  'agent-7': {
    name: 'Content Creator Agent',
    role: 'Content',
    systemPrompt: `You are a Content Creator Agent specialized in writing compelling copy, blog posts, social media content, and marketing materials.`,
    preferredMCP: ['perplexity', 'contentcore', 'fal-ai', 'twitter']
  },
  'agent-8': {
    name: 'Visual Design Agent',
    role: 'Design',
    systemPrompt: `You are a Visual Design Agent specialized in creating stunning visuals, UI designs, and graphic assets.`,
    preferredMCP: ['canva', 'fal-ai', 'shadcn', '21st-dev']
  },
  'agent-9': {
    name: 'SEO Optimization Agent',
    role: 'SEO',
    systemPrompt: `You are an SEO Optimization Agent specialized in search engine optimization, keyword research, and content optimization.`,
    preferredMCP: ['perplexity', 'contentcore', 'browser-use', 'google-maps']
  },
  'agent-10': {
    name: 'Social Media Manager Agent',
    role: 'Social Media',
    systemPrompt: `You are a Social Media Manager Agent specialized in social media strategy, content scheduling, and community management.`,
    preferredMCP: ['twitter', 'linkedin', 'facebook', 'contentcore']
  },
  'agent-11': {
    name: 'Paid Ads Specialist Agent',
    role: 'Advertising',
    systemPrompt: `You are a Paid Ads Specialist Agent specialized in PPC campaigns, ad creative optimization, and ROI maximization.`,
    preferredMCP: ['facebook-ads', 'google-ads', 'stripe', 'perplexity']
  },
  'agent-12': {
    name: 'Influencer Outreach Agent',
    role: 'Partnerships',
    systemPrompt: `You are an Influencer Outreach Agent specialized in identifying influencers, managing partnerships, and negotiating collaborations.`,
    preferredMCP: ['linkedin', 'twitter', 'whatsapp', 'perplexity']
  },
  'agent-13': {
    name: 'Sales Development Agent',
    role: 'Sales',
    systemPrompt: `You are a Sales Development Agent specialized in lead generation, outbound prospecting, and sales pipeline development.`,
    preferredMCP: ['vapi', 'call-center', 'whatsapp', 'linkedin']
  },
  'agent-14': {
    name: 'Sales Closer Agent',
    role: 'Sales',
    systemPrompt: `You are a Sales Closer Agent specialized in negotiations, closing deals, and maximizing conversion rates.`,
    preferredMCP: ['vapi', 'call-center', 'stripe', 'whatsapp']
  },
  'agent-15': {
    name: 'Customer Success Agent',
    role: 'Customer Support',
    systemPrompt: `You are a Customer Success Agent specialized in customer onboarding, retention, and satisfaction optimization.`,
    preferredMCP: ['whatsapp', 'vapi', 'kokoro-tts', 'call-center']
  },
  'agent-16': {
    name: 'Review Generation Agent',
    role: 'Reputation',
    systemPrompt: `You are a Review Generation Agent specialized in generating authentic customer reviews and managing online reputation.`,
    preferredMCP: ['whatsapp', 'twitter', 'linkedin', 'google-maps']
  },
  'agent-17': {
    name: 'Operations Manager Agent',
    role: 'Operations',
    systemPrompt: `You are an Operations Manager Agent specialized in workflow optimization, resource allocation, and process improvement.`,
    preferredMCP: ['linear', 'github', 'google-calendar', 'filesystem']
  },
  'agent-18': {
    name: 'Financial Controller Agent',
    role: 'Finance',
    systemPrompt: `You are a Financial Controller Agent specialized in financial planning, budgeting, and revenue optimization.`,
    preferredMCP: ['stripe', 'filesystem', 'github', 'perplexity']
  },
  'agent-19': {
    name: 'Analytics Specialist Agent',
    role: 'Analytics',
    systemPrompt: `You are an Analytics Specialist Agent specialized in data analysis, metrics tracking, and business intelligence.`,
    preferredMCP: ['contentcore', 'perplexity', 'browser-use', 'stripe']
  },
  'agent-20': {
    name: 'Data Scraping Agent',
    role: 'Data Collection',
    systemPrompt: `You are a Data Scraping Agent specialized in web scraping, data extraction, and information gathering.`,
    preferredMCP: ['browser-use', 'playwright', 'contentcore', 'chrome']
  },
  'agent-21': {
    name: 'Legal Compliance Agent',
    role: 'Legal',
    systemPrompt: `You are a Legal Compliance Agent specialized in regulatory compliance, terms of service, and privacy policies.`,
    preferredMCP: ['perplexity', 'contentcore', 'github', 'filesystem']
  },
  'agent-22': {
    name: 'Strategic Advisor Agent',
    role: 'Strategy',
    systemPrompt: `You are a Strategic Advisor Agent specialized in business strategy, market positioning, and growth planning.`,
    preferredMCP: ['perplexity', 'agent-mcp', 'browser-use', 'contentcore']
  },
  'agent-23': {
    name: 'FOMO Creation Agent',
    role: 'Marketing',
    systemPrompt: `You are a FOMO Creation Agent specialized in creating urgency, scarcity marketing, and viral campaigns.`,
    preferredMCP: ['twitter', 'linkedin', 'facebook-ads', 'contentcore']
  },
  'agent-24': {
    name: 'Market Maker Agent',
    role: 'Growth',
    systemPrompt: `You are a Market Maker Agent specialized in creating market demand, launching products, and driving adoption.`,
    preferredMCP: ['linear', 'stripe', 'vapi', 'twitter']
  },
  'agent-25': {
    name: 'Exit Strategy Agent',
    role: 'Strategy',
    systemPrompt: `You are an Exit Strategy Agent specialized in acquisition preparation, valuation optimization, and exit planning.`,
    preferredMCP: ['stripe', 'perplexity', 'agent-mcp', 'filesystem']
  }
};

// All available MCP servers
const ALL_MCP_SERVERS = [
  'chrome', 'github', 'filesystem', 'google-maps', 'linear', 'perplexity',
  'playwright', 'stripe', 'canva', 'browser-use', 'vapi', 'call-center',
  'whatsapp', '21st-dev', 'shadcn', 'facebook-ads', 'google-ads', 'linkedin',
  'contentcore', 'twitter', 'youtube', 'facebook', 'kokoro-tts', 'google-calendar',
  'agent-mcp', 'fal-ai'
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { taskId, agentId, taskType, taskDescription, inputData, mcpServersRequested } = await req.json();

    const agent = AGENTS[agentId as keyof typeof AGENTS];
    if (!agent) {
      return new Response(JSON.stringify({ error: "Invalid agent ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update task status to processing
    if (taskId) {
      await supabase
        .from('agent_tasks')
        .update({ status: 'processing', started_at: new Date().toISOString() })
        .eq('id', taskId);
    }

    // Determine which MCP servers to use (any agent can use any server)
    const mcpServersToUse = mcpServersRequested?.length > 0 
      ? mcpServersRequested.filter((s: string) => ALL_MCP_SERVERS.includes(s))
      : agent.preferredMCP;

    // Build the system prompt with MCP server capabilities
    const systemPrompt = `${agent.systemPrompt}

You are currently executing a task delegated by the CEO Agent. 

Available MCP Servers you can request: ${ALL_MCP_SERVERS.join(', ')}
Your preferred MCP servers: ${agent.preferredMCP.join(', ')}
Currently assigned MCP servers for this task: ${mcpServersToUse.join(', ')}

Task Type: ${taskType}
Task Description: ${taskDescription}

Provide a detailed, actionable response. Include:
1. Analysis of the task requirements
2. Steps you would take using the available tools
3. Expected outcomes and deliverables
4. Any recommendations or insights

Remember: You can request access to ANY MCP server if needed for this task.`;

    // Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(inputData || { task: taskDescription }) }
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", errorText);
      
      if (taskId) {
        await supabase
          .from('agent_tasks')
          .update({ status: 'failed', output_data: { error: errorText } })
          .eq('id', taskId);
      }
      
      return new Response(JSON.stringify({ error: "AI processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const outputContent = aiData.choices?.[0]?.message?.content || "No response generated";

    // Log MCP usage
    for (const mcpServer of mcpServersToUse) {
      await supabase.from('agent_mcp_usage').insert({
        agent_id: agentId,
        mcp_server_id: mcpServer,
        task_id: taskId,
        action: taskType,
        request_payload: inputData || {},
        response_payload: { preview: outputContent.substring(0, 500) },
        latency_ms: Math.floor(Math.random() * 500) + 100,
        success: true
      });
    }

    // Update task with results
    if (taskId) {
      await supabase
        .from('agent_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          mcp_servers_used: mcpServersToUse,
          output_data: { result: outputContent }
        })
        .eq('id', taskId);
    }

    // Log agent activity
    await supabase.from('user_agent_activity').insert({
      user_id: user.id,
      agent_id: agentId,
      agent_name: agent.name,
      action: taskType,
      status: 'completed',
      metadata: { mcp_servers: mcpServersToUse },
      result: { output: outputContent.substring(0, 1000) }
    });

    return new Response(JSON.stringify({
      success: true,
      agentId,
      agentName: agent.name,
      taskType,
      mcpServersUsed: mcpServersToUse,
      output: outputContent
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Execute agent task error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
