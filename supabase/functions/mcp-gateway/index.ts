import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Available MCP servers and their endpoints
const MCP_ENDPOINTS: Record<string, string> = {
  'mcp-perplexity': 'mcp-perplexity',
  'mcp-twitter': 'mcp-twitter',
  'mcp-linkedin': 'mcp-linkedin',
  'mcp-facebook': 'mcp-facebook',
  'mcp-facebookads': 'mcp-facebookads',
  'mcp-googleads': 'mcp-googleads',
  'mcp-falai': 'mcp-falai',
  'mcp-vapi': 'mcp-vapi',
  'mcp-whatsapp': 'mcp-whatsapp',
  'mcp-github': 'mcp-github',
  'mcp-linear': 'mcp-linear',
  'mcp-stripe': 'mcp-stripe',
  'mcp-youtube': 'mcp-youtube',
  'mcp-canva': 'mcp-canva',
  'mcp-googlecalendar': 'mcp-googlecalendar',
  'mcp-googlemaps': 'mcp-googlemaps',
  'mcp-contentcore': 'mcp-contentcore',
  'mcp-artifacts': 'mcp-artifacts',
  // Modern React website generation MCPs
  'mcp-21st-magic': 'mcp-21st-magic',
  'mcp-shadcn': 'mcp-shadcn',
};

// Twitter tool to Perplexity fallback mapping
const TWITTER_TO_PERPLEXITY_FALLBACK: Record<string, { tool: string; transformArgs: (args: any) => any }> = {
  'analyze_sentiment': {
    tool: 'social_sentiment',
    transformArgs: (args) => ({ query: args.query, industry: args.industry }),
  },
  'get_trends': {
    tool: 'social_trends',
    transformArgs: (args) => ({ industry: args.industry, region: args.region }),
  },
  'search_tweets': {
    tool: 'community_research',
    transformArgs: (args) => ({ topic: args.query, question: args.query }),
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { userId, mcpServerId, tool, arguments: toolArgs, agentId, taskId, projectId } = await req.json();

    if (!userId || !mcpServerId || !tool) {
      return new Response(
        JSON.stringify({ error: 'userId, mcpServerId, and tool are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[mcp-gateway] Routing request: ${mcpServerId}.${tool} for user ${userId}, agent ${agentId}`);

    // Get credentials for this MCP server
    const credentialsResponse = await fetch(`${supabaseUrl}/functions/v1/get-mcp-credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ userId, mcpServerId }),
    });

    const credentialsResult = await credentialsResponse.json();

    if (!credentialsResult.success) {
      console.error(`[mcp-gateway] Failed to get credentials:`, credentialsResult);
      
      // Log failed MCP usage
      await supabase.from('agent_mcp_usage').insert({
        agent_id: agentId || 'system',
        mcp_server_id: mcpServerId,
        action: tool,
        task_id: taskId,
        success: false,
        latency_ms: Date.now() - startTime,
        request_payload: { tool, arguments: toolArgs },
        response_payload: { error: credentialsResult.error },
      });

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: credentialsResult.error,
          missingKeys: credentialsResult.missingKeys 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route to the specific MCP server function
    const mcpEndpoint = MCP_ENDPOINTS[mcpServerId];
    if (!mcpEndpoint) {
      return new Response(
        JSON.stringify({ error: `Unknown MCP server: ${mcpServerId}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call the specific MCP server function
    let mcpResponse = await fetch(`${supabaseUrl}/functions/v1/${mcpEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        tool,
        arguments: toolArgs,
        credentials: credentialsResult.credentials,
        userId,
        agentId,
        taskId,
        projectId,
      }),
    });

    let mcpResult = await mcpResponse.json();
    let usedFallback = false;
    let fallbackServer = '';

    // Smart Fallback: If Twitter rate limited (429), fallback to Perplexity social sentiment
    if (mcpServerId === 'mcp-twitter' && 
        (mcpResult.error?.includes('429') || mcpResult.error?.includes('rate limit') || mcpResult.error?.includes('Too Many Requests'))) {
      
      const fallbackConfig = TWITTER_TO_PERPLEXITY_FALLBACK[tool];
      
      if (fallbackConfig) {
        console.log(`[mcp-gateway] Twitter rate limited, falling back to Perplexity ${fallbackConfig.tool}`);
        
        // Get Perplexity credentials
        const perplexityCredResponse = await fetch(`${supabaseUrl}/functions/v1/get-mcp-credentials`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ userId, mcpServerId: 'mcp-perplexity' }),
        });

        const perplexityCredResult = await perplexityCredResponse.json();

        if (perplexityCredResult.success) {
          // Call Perplexity with transformed args
          const fallbackArgs = fallbackConfig.transformArgs(toolArgs);
          
          mcpResponse = await fetch(`${supabaseUrl}/functions/v1/mcp-perplexity`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              tool: fallbackConfig.tool,
              arguments: fallbackArgs,
              credentials: perplexityCredResult.credentials,
              userId,
              agentId,
              taskId,
              projectId,
            }),
          });

          mcpResult = await mcpResponse.json();
          usedFallback = true;
          fallbackServer = 'mcp-perplexity';
          
          console.log(`[mcp-gateway] Fallback to Perplexity successful`);
        } else {
          console.log(`[mcp-gateway] Perplexity fallback failed - no credentials`);
        }
      }
    }

    const latencyMs = Date.now() - startTime;

    // Log MCP usage
    await supabase.from('agent_mcp_usage').insert({
      agent_id: agentId || 'system',
      mcp_server_id: usedFallback ? fallbackServer : mcpServerId,
      action: tool,
      task_id: taskId,
      success: mcpResult.success !== false,
      latency_ms: latencyMs,
      request_payload: { tool, arguments: toolArgs, usedFallback, originalServer: usedFallback ? mcpServerId : undefined },
      response_payload: mcpResult,
    });

    // Update MCP server metrics
    await supabase.rpc('update_mcp_metrics', {
      p_server_id: usedFallback ? fallbackServer : mcpServerId,
      p_latency_ms: latencyMs,
      p_requests_increment: 1,
    });

    // Log agent activity
    if (agentId) {
      await supabase.from('agent_activity_logs').insert({
        agent_id: agentId,
        agent_name: agentId,
        action: `MCP Call: ${usedFallback ? `${mcpServerId}→${fallbackServer}` : mcpServerId}.${tool}`,
        status: mcpResult.success !== false ? 'completed' : 'failed',
        metadata: {
          mcp_server: usedFallback ? fallbackServer : mcpServerId,
          original_server: usedFallback ? mcpServerId : undefined,
          tool,
          latency_ms: latencyMs,
          success: mcpResult.success !== false,
          used_fallback: usedFallback,
        },
      });
    }

    console.log(`[mcp-gateway] Completed ${mcpServerId}.${tool} in ${latencyMs}ms - success: ${mcpResult.success !== false}${usedFallback ? ' (via fallback)' : ''}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: mcpResult,
        metadata: {
          mcpServer: usedFallback ? fallbackServer : mcpServerId,
          originalServer: usedFallback ? mcpServerId : undefined,
          tool,
          latencyMs,
          credentialSource: credentialsResult.source,
          usedFallback,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[mcp-gateway] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
