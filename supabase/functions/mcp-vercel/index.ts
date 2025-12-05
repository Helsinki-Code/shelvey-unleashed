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
    
    const apiKey = credentials?.VERCEL_API_KEY;
    
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Vercel API key required. Please configure your Vercel API credentials.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = 'https://api.vercel.com';
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    let result;

    switch (tool) {
      case 'get_projects': {
        const response = await fetch(`${baseUrl}/v9/projects`, { headers });
        result = await response.json();
        break;
      }

      case 'get_deployments': {
        const projectId = args?.project_id;
        const url = projectId 
          ? `${baseUrl}/v6/deployments?projectId=${projectId}`
          : `${baseUrl}/v6/deployments`;
        const response = await fetch(url, { headers });
        result = await response.json();
        break;
      }

      case 'create_deployment': {
        const response = await fetch(`${baseUrl}/v13/deployments`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: args.name,
            project: args.project_id,
            target: args.target || 'production',
            gitSource: args.git_source,
          }),
        });
        result = await response.json();
        break;
      }

      case 'get_domains': {
        const projectId = args?.project_id;
        const url = projectId
          ? `${baseUrl}/v9/projects/${projectId}/domains`
          : `${baseUrl}/v5/domains`;
        const response = await fetch(url, { headers });
        result = await response.json();
        break;
      }

      case 'add_domain': {
        const response = await fetch(`${baseUrl}/v9/projects/${args.project_id}/domains`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: args.domain,
          }),
        });
        result = await response.json();
        break;
      }

      case 'get_env_vars': {
        const response = await fetch(
          `${baseUrl}/v9/projects/${args.project_id}/env`,
          { headers }
        );
        result = await response.json();
        break;
      }

      case 'set_env_var': {
        const response = await fetch(`${baseUrl}/v10/projects/${args.project_id}/env`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            key: args.key,
            value: args.value,
            target: args.target || ['production', 'preview', 'development'],
            type: args.type || 'encrypted',
          }),
        });
        result = await response.json();
        break;
      }

      case 'get_logs': {
        const response = await fetch(
          `${baseUrl}/v2/deployments/${args.deployment_id}/events`,
          { headers }
        );
        result = await response.json();
        break;
      }

      case 'rollback': {
        const response = await fetch(`${baseUrl}/v13/deployments`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: args.project_name,
            deploymentId: args.deployment_id,
            target: 'production',
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
    console.error('Vercel MCP error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
