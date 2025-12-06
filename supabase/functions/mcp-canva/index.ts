import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { action, userId, params } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: credData, error: credError } = await supabase.functions.invoke('get-mcp-credentials', {
      body: { userId, mcpServerId: 'mcp-canva' }
    });

    if (credError || !credData?.credentials?.CANVA_CLIENT_ID || !credData?.credentials?.CANVA_CLIENT_SECRET) {
      throw new Error('Canva credentials not configured. Please add your Client ID and Client Secret from the Canva Developers portal.');
    }

    const clientId = credData.credentials.CANVA_CLIENT_ID;
    const clientSecret = credData.credentials.CANVA_CLIENT_SECRET;
    
    // For now, we'll use client credentials - in production, you'd implement OAuth flow
    // This is a placeholder that shows the credentials are configured
    const baseUrl = 'https://api.canva.com/rest/v1';
    
    // Canva requires OAuth 2.0 - for now we support a 'check_connection' action
    // and return info that OAuth flow is needed for other actions
    if (action === 'check_connection') {
      return new Response(JSON.stringify({ 
        success: true, 
        data: { 
          configured: true, 
          clientId: clientId.substring(0, 8) + '...',
          message: 'Canva credentials are configured. OAuth flow required for full API access.' 
        },
        latency_ms: Date.now() - startTime 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // For other actions, we need an access token from OAuth flow
    // This would require implementing the full OAuth 2.0 authorization code flow
    // For now, return an informative error
    console.log(`Canva action ${action} requested with Client ID: ${clientId.substring(0, 8)}...`);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Canva requires OAuth 2.0 authorization. Please complete the OAuth flow first.',
      data: {
        clientIdConfigured: true,
        clientSecretConfigured: true,
        action: action,
        message: 'To use Canva API, you need to complete the OAuth authorization flow. This will be implemented in a future update.'
      },
      latency_ms: Date.now() - startTime
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Canva MCP error:', errorMessage);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
