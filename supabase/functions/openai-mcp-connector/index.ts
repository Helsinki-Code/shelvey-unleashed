import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MCPRequest {
  serverId: string;
  tool: string;
  arguments: Record<string, unknown>;
  userId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { serverId, tool, arguments: args, userId } = await req.json() as MCPRequest;
    
    console.log(`[OpenAI MCP Connector] Connecting to MCP server: ${serverId}, tool: ${tool}`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch MCP server info from registry
    const { data: mcpServer, error: serverError } = await supabase
      .from('mcp_server_registry')
      .select('*')
      .eq('server_id', serverId)
      .eq('enabled', true)
      .single();
    
    if (serverError || !mcpServer) {
      console.error(`[OpenAI MCP Connector] Server not found: ${serverId}`, serverError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `MCP server '${serverId}' not found or disabled` 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`[OpenAI MCP Connector] Found server: ${mcpServer.server_name} at ${mcpServer.server_url}`);
    
    // Check if auth is required and fetch credentials
    let credentials: Record<string, string> = {};
    
    if (mcpServer.requires_auth && userId) {
      // First check user's own API keys
      const { data: userKeys } = await supabase
        .from('user_api_keys')
        .select('key_name, encrypted_value')
        .eq('user_id', userId)
        .eq('is_configured', true);
      
      if (userKeys && userKeys.length > 0) {
        userKeys.forEach(key => {
          if (key.encrypted_value) {
            credentials[key.key_name] = key.encrypted_value;
          }
        });
      }
      
      // If user doesn't have keys, check if they're DFY plan
      if (Object.keys(credentials).length === 0) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_tier')
          .eq('id', userId)
          .single();
        
        if (profile?.subscription_tier === 'dfy') {
          // Get admin keys for DFY users
          const { data: adminKeys } = await supabase
            .from('admin_api_keys')
            .select('key_name, encrypted_value')
            .eq('is_configured', true);
          
          if (adminKeys) {
            adminKeys.forEach(key => {
              if (key.encrypted_value) {
                credentials[key.key_name] = key.encrypted_value;
              }
            });
          }
        }
      }
    }
    
    // Use OpenAI's native MCP support if available
    if (openaiKey) {
      const startTime = Date.now();
      
      try {
        // Call OpenAI with native MCP tool
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are an MCP (Model Context Protocol) orchestrator. Execute the requested tool on the specified MCP server and return the results.`
              },
              {
                role: 'user',
                content: `Execute tool '${tool}' on MCP server '${mcpServer.server_name}' (${mcpServer.server_url}) with arguments: ${JSON.stringify(args)}`
              }
            ],
            tools: [
              {
                type: 'mcp',
                server_label: mcpServer.server_id,
                server_url: mcpServer.server_url,
                ...(mcpServer.requires_auth && credentials && {
                  headers: {
                    'Authorization': `Bearer ${credentials[Object.keys(credentials)[0]] || ''}`
                  }
                })
              }
            ],
            tool_choice: 'auto',
            max_completion_tokens: 4096,
          }),
        });
        
        const latencyMs = Date.now() - startTime;
        const result = await response.json();
        
        console.log(`[OpenAI MCP Connector] Response received in ${latencyMs}ms`);
        
        // Log the MCP usage
        await supabase.from('agent_mcp_usage').insert({
          agent_id: 'openai-mcp-connector',
          mcp_server_id: serverId,
          action: tool,
          request_payload: args,
          response_payload: result,
          latency_ms: latencyMs,
          success: !result.error,
        });
        
        // Update MCP metrics
        await supabase.rpc('update_mcp_metrics', {
          p_server_id: serverId,
          p_latency_ms: latencyMs,
          p_requests_increment: 1
        });
        
        if (result.error) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: result.error.message || 'MCP execution failed' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        // Extract tool results from response
        const toolResults = result.choices?.[0]?.message?.tool_calls || [];
        const content = result.choices?.[0]?.message?.content;
        
        return new Response(JSON.stringify({ 
          success: true, 
          data: {
            content,
            toolResults,
            serverInfo: {
              id: mcpServer.server_id,
              name: mcpServer.server_name,
              url: mcpServer.server_url
            },
            latencyMs
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
        
      } catch (apiError) {
        console.error(`[OpenAI MCP Connector] API error:`, apiError);
        
        // Fallback to direct MCP call if OpenAI native fails
        return await directMCPCall(mcpServer, tool, args, credentials, supabase);
      }
    }
    
    // Direct MCP call if no OpenAI key
    return await directMCPCall(mcpServer, tool, args, credentials, supabase);
    
  } catch (error) {
    console.error('[OpenAI MCP Connector] Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function directMCPCall(
  mcpServer: any, 
  tool: string, 
  args: Record<string, unknown>,
  credentials: Record<string, string>,
  supabase: any
) {
  const startTime = Date.now();
  
  try {
    console.log(`[OpenAI MCP Connector] Direct call to ${mcpServer.server_url}`);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (mcpServer.requires_auth && Object.keys(credentials).length > 0) {
      const primaryKey = Object.values(credentials)[0];
      headers['Authorization'] = `Bearer ${primaryKey}`;
    }
    
    const response = await fetch(`${mcpServer.server_url}/tools/${tool}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(args),
    });
    
    const latencyMs = Date.now() - startTime;
    const result = await response.json();
    
    // Log usage
    await supabase.from('agent_mcp_usage').insert({
      agent_id: 'direct-mcp-connector',
      mcp_server_id: mcpServer.server_id,
      action: tool,
      request_payload: args,
      response_payload: result,
      latency_ms: latencyMs,
      success: response.ok,
    });
    
    // Update metrics
    await supabase.rpc('update_mcp_metrics', {
      p_server_id: mcpServer.server_id,
      p_latency_ms: latencyMs,
      p_requests_increment: 1
    });
    
    return new Response(JSON.stringify({ 
      success: response.ok, 
      data: result,
      latencyMs
    }), {
      status: response.ok ? 200 : 400,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('[Direct MCP] Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Direct MCP call failed' 
    }), {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    });
  }
}
