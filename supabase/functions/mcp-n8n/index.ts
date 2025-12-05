import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tool, arguments: args, credentials } = await req.json();
    
    const n8nHost = credentials?.N8N_HOST;
    const apiKey = credentials?.N8N_API_KEY;
    
    if (!n8nHost || !apiKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'n8n credentials required. Please configure your n8n host URL and API key.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = `${n8nHost.replace(/\/$/, '')}/api/v1`;
    const headers = {
      'X-N8N-API-KEY': apiKey,
      'Content-Type': 'application/json',
    };

    let result;

    switch (tool) {
      case 'list_workflows': {
        const response = await fetch(`${baseUrl}/workflows`, { headers });
        result = await response.json();
        break;
      }

      case 'get_workflow': {
        const response = await fetch(
          `${baseUrl}/workflows/${args.workflow_id}`,
          { headers }
        );
        result = await response.json();
        break;
      }

      case 'execute_workflow': {
        const response = await fetch(
          `${baseUrl}/workflows/${args.workflow_id}/execute`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              data: args.data || {},
            }),
          }
        );
        result = await response.json();
        break;
      }

      case 'get_executions': {
        const limit = args?.limit || 20;
        const workflowId = args?.workflow_id;
        const url = workflowId
          ? `${baseUrl}/executions?workflowId=${workflowId}&limit=${limit}`
          : `${baseUrl}/executions?limit=${limit}`;
        const response = await fetch(url, { headers });
        result = await response.json();
        break;
      }

      case 'activate_workflow': {
        const response = await fetch(
          `${baseUrl}/workflows/${args.workflow_id}/activate`,
          {
            method: 'POST',
            headers,
          }
        );
        result = await response.json();
        break;
      }

      case 'deactivate_workflow': {
        const response = await fetch(
          `${baseUrl}/workflows/${args.workflow_id}/deactivate`,
          {
            method: 'POST',
            headers,
          }
        );
        result = await response.json();
        break;
      }

      case 'create_workflow': {
        const response = await fetch(`${baseUrl}/workflows`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: args.name,
            nodes: args.nodes || [],
            connections: args.connections || {},
            settings: args.settings || {},
          }),
        });
        result = await response.json();
        break;
      }

      default:
        return new Response(JSON.stringify({ 
          success: false, 
          error: `Unknown tool: ${tool}` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('n8n MCP error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
