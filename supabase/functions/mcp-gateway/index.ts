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
    const mcpResponse = await fetch(`${supabaseUrl}/functions/v1/${mcpEndpoint}`, {
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

    const mcpResult = await mcpResponse.json();
    const latencyMs = Date.now() - startTime;

    // Log MCP usage
    await supabase.from('agent_mcp_usage').insert({
      agent_id: agentId || 'system',
      mcp_server_id: mcpServerId,
      action: tool,
      task_id: taskId,
      success: mcpResult.success !== false,
      latency_ms: latencyMs,
      request_payload: { tool, arguments: toolArgs },
      response_payload: mcpResult,
    });

    // Update MCP server metrics
    await supabase.rpc('update_mcp_metrics', {
      p_server_id: mcpServerId,
      p_latency_ms: latencyMs,
      p_requests_increment: 1,
    });

    // Log agent activity
    if (agentId) {
      await supabase.from('agent_activity_logs').insert({
        agent_id: agentId,
        agent_name: agentId,
        action: `MCP Call: ${mcpServerId}.${tool}`,
        status: mcpResult.success !== false ? 'completed' : 'failed',
        metadata: {
          mcp_server: mcpServerId,
          tool,
          latency_ms: latencyMs,
          success: mcpResult.success !== false,
        },
      });
    }

    console.log(`[mcp-gateway] Completed ${mcpServerId}.${tool} in ${latencyMs}ms - success: ${mcpResult.success !== false}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: mcpResult,
        metadata: {
          mcpServer: mcpServerId,
          tool,
          latencyMs,
          credentialSource: credentialsResult.source,
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
