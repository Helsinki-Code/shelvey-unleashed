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
    
    const apiToken = credentials?.CLOUDFLARE_API_TOKEN;
    const accountId = credentials?.CLOUDFLARE_ACCOUNT_ID;
    
    if (!apiToken) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Cloudflare API token required. Please configure your Cloudflare API credentials.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = 'https://api.cloudflare.com/client/v4';
    const headers = {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    };

    let result;

    switch (tool) {
      case 'get_zones': {
        const response = await fetch(`${baseUrl}/zones`, { headers });
        result = await response.json();
        break;
      }

      case 'get_dns_records': {
        const zoneId = args.zone_id;
        const response = await fetch(`${baseUrl}/zones/${zoneId}/dns_records`, { headers });
        result = await response.json();
        break;
      }

      case 'create_dns_record': {
        const response = await fetch(`${baseUrl}/zones/${args.zone_id}/dns_records`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            type: args.type,
            name: args.name,
            content: args.content,
            ttl: args.ttl || 1,
            proxied: args.proxied ?? true,
          }),
        });
        result = await response.json();
        break;
      }

      case 'purge_cache': {
        const response = await fetch(`${baseUrl}/zones/${args.zone_id}/purge_cache`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            purge_everything: args.purge_everything ?? true,
            files: args.files,
            tags: args.tags,
          }),
        });
        result = await response.json();
        break;
      }

      case 'get_analytics': {
        const response = await fetch(
          `${baseUrl}/zones/${args.zone_id}/analytics/dashboard?since=${args.since || '-1440'}&until=${args.until || '0'}`,
          { headers }
        );
        result = await response.json();
        break;
      }

      case 'get_workers': {
        if (!accountId) {
          result = { error: 'Account ID required for Workers API' };
          break;
        }
        const response = await fetch(`${baseUrl}/accounts/${accountId}/workers/scripts`, { headers });
        result = await response.json();
        break;
      }

      case 'deploy_worker': {
        if (!accountId) {
          result = { error: 'Account ID required for Workers API' };
          break;
        }
        const response = await fetch(
          `${baseUrl}/accounts/${accountId}/workers/scripts/${args.script_name}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${apiToken}`,
              'Content-Type': 'application/javascript',
            },
            body: args.script_content,
          }
        );
        result = await response.json();
        break;
      }

      case 'get_r2_buckets': {
        if (!accountId) {
          result = { error: 'Account ID required for R2 API' };
          break;
        }
        const response = await fetch(`${baseUrl}/accounts/${accountId}/r2/buckets`, { headers });
        result = await response.json();
        break;
      }

      case 'get_kv_namespaces': {
        if (!accountId) {
          result = { error: 'Account ID required for KV API' };
          break;
        }
        const response = await fetch(
          `${baseUrl}/accounts/${accountId}/storage/kv/namespaces`,
          { headers }
        );
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
    console.error('Cloudflare MCP error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
