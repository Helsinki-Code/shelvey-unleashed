import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Real MCP server health check endpoints
const MCP_ENDPOINTS: Record<string, string> = {
  'mcp-github': 'https://api.github.com/rate_limit',
  'mcp-google-maps': 'https://maps.googleapis.com/maps/api/geocode/json',
  'mcp-stripe': 'https://api.stripe.com/v1/balance',
  'mcp-linear': 'https://api.linear.app/graphql',
  'mcp-perplexity': 'https://api.perplexity.ai/chat/completions',
  'mcp-canva': 'https://api.canva.com/rest/v1/users/me',
  'mcp-vapi': 'https://api.vapi.ai/health',
  'mcp-whatsapp': 'https://graph.facebook.com/v18.0',
  'mcp-facebook-ads': 'https://graph.facebook.com/v18.0/me',
  'mcp-google-ads': 'https://googleads.googleapis.com/v14/customers',
  'mcp-linkedin': 'https://api.linkedin.com/v2/me',
  'mcp-twitter': 'https://api.twitter.com/2/users/me',
  'mcp-youtube': 'https://www.googleapis.com/youtube/v3/channels',
  'mcp-google-calendar': 'https://www.googleapis.com/calendar/v3/users/me/calendarList',
  'mcp-fal-ai': 'https://fal.run',
};

// Check if a server has its API key configured
async function isServerConfigured(supabase: any, serverId: string): Promise<boolean> {
  const { data: server } = await supabase
    .from('mcp_server_status')
    .select('status')
    .eq('server_id', serverId)
    .single();
  
  return server?.status === 'connected' || server?.status === 'syncing';
}

// Perform real health check
async function healthCheck(endpoint: string, apiKey?: string): Promise<{ latency: number; success: boolean }> {
  const start = Date.now();
  
  try {
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(endpoint, { 
      method: 'HEAD',
      headers,
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    const latency = Date.now() - start;
    
    // Consider 2xx, 3xx, and even 401/403 as "server is reachable"
    return { latency, success: response.status < 500 };
  } catch (error) {
    return { latency: Date.now() - start, success: false };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Starting REAL MCP health checks...");

    const { data: servers, error: fetchError } = await supabase
      .from("mcp_server_status")
      .select("*");

    if (fetchError) throw fetchError;
    if (!servers || servers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No servers to check" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = [];

    for (const server of servers) {
      // Skip servers that require API keys (not configured)
      if (server.status === 'requires-key') {
        results.push({ server_id: server.server_id, status: 'skipped', reason: 'requires-key' });
        continue;
      }

      const endpoint = MCP_ENDPOINTS[server.server_id];
      
      if (!endpoint) {
        // For servers without external endpoints (like filesystem, chrome, playwright)
        // These run locally and don't need health checks
        results.push({ server_id: server.server_id, status: 'local', reason: 'no-external-endpoint' });
        continue;
      }

      // Perform real health check
      const { latency, success } = await healthCheck(endpoint);

      if (success) {
        // Update with REAL latency
        const { error: updateError } = await supabase
          .from("mcp_server_status")
          .update({
            latency_ms: latency,
            last_ping: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("server_id", server.server_id);

        if (updateError) {
          console.error(`Error updating ${server.server_id}:`, updateError);
        }

        results.push({ server_id: server.server_id, latency, status: 'checked' });
      } else {
        results.push({ server_id: server.server_id, status: 'unreachable' });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Health check error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
