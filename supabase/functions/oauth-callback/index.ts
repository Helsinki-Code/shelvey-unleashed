import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ConnectorType = 'gmail' | 'drive' | 'calendar' | 'teams' | 'outlook' | 'sharepoint';

const CONNECTOR_SCOPES: Record<ConnectorType, { provider: 'google' | 'microsoft'; scopes: string[] }> = {
  gmail: {
    provider: 'google',
    scopes: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.modify']
  },
  drive: {
    provider: 'google',
    scopes: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/drive.file']
  },
  calendar: {
    provider: 'google',
    scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events']
  },
  teams: {
    provider: 'microsoft',
    scopes: ['ChannelMessage.Send', 'Channel.ReadBasic.All', 'Team.ReadBasic.All']
  },
  outlook: {
    provider: 'microsoft',
    scopes: ['Mail.Read', 'Mail.Send', 'Mail.ReadWrite']
  },
  sharepoint: {
    provider: 'microsoft',
    scopes: ['Sites.Read.All', 'Files.Read.All', 'Files.ReadWrite.All']
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  
  // Handle initial auth request (generate OAuth URL)
  if (req.method === 'POST') {
    try {
      const { userId, connector, redirectUri } = await req.json();
      
      if (!userId || !connector) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Missing userId or connector' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const connectorConfig = CONNECTOR_SCOPES[connector as ConnectorType];
      if (!connectorConfig) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: `Unknown connector: ${connector}` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const { provider, scopes } = connectorConfig;
      const stateData = JSON.stringify({ userId, connector, redirectUri });
      const encodedState = btoa(stateData);
      
      let authUrl: string;
      
      if (provider === 'google') {
        const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
        if (!clientId) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Google OAuth not configured' 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/oauth-callback`;
        
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
          client_id: clientId,
          redirect_uri: callbackUrl,
          response_type: 'code',
          scope: scopes.join(' '),
          access_type: 'offline',
          prompt: 'consent',
          state: encodedState,
        }).toString();
        
      } else {
        const clientId = Deno.env.get('MICROSOFT_CLIENT_ID');
        if (!clientId) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Microsoft OAuth not configured' 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/oauth-callback`;
        
        authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` + new URLSearchParams({
          client_id: clientId,
          redirect_uri: callbackUrl,
          response_type: 'code',
          scope: scopes.join(' ') + ' offline_access',
          state: encodedState,
        }).toString();
      }
      
      console.log(`[OAuth] Generated auth URL for ${connector} (${provider})`);
      
      return new Response(JSON.stringify({ 
        success: true, 
        authUrl,
        provider,
        connector
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      
    } catch (err) {
      console.error('[OAuth] Error generating auth URL:', err);
      return new Response(JSON.stringify({ 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
  
  // Handle OAuth callback
  if (error) {
    console.error('[OAuth Callback] Error:', error);
    return new Response(`
      <html>
        <body>
          <script>
            window.opener?.postMessage({ type: 'oauth_error', error: '${error}' }, '*');
            window.close();
          </script>
          <p>Authentication failed: ${error}. You can close this window.</p>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' },
    });
  }
  
  if (!code || !state) {
    return new Response('Missing code or state', { status: 400 });
  }
  
  try {
    const stateData = JSON.parse(atob(state));
    const { userId, connector, redirectUri } = stateData;
    
    const connectorConfig = CONNECTOR_SCOPES[connector as ConnectorType];
    const { provider } = connectorConfig;
    
    console.log(`[OAuth Callback] Processing ${connector} for user ${userId}`);
    
    // Exchange code for tokens
    let tokenData: any;
    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/oauth-callback`;
    
    if (provider === 'google') {
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
      
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: callbackUrl,
          grant_type: 'authorization_code',
        }),
      });
      
      tokenData = await tokenResponse.json();
      
    } else {
      const clientId = Deno.env.get('MICROSOFT_CLIENT_ID')!;
      const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET')!;
      
      const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: callbackUrl,
          grant_type: 'authorization_code',
        }),
      });
      
      tokenData = await tokenResponse.json();
    }
    
    if (tokenData.error) {
      console.error('[OAuth Callback] Token exchange error:', tokenData.error);
      return new Response(`
        <html>
          <body>
            <script>
              window.opener?.postMessage({ type: 'oauth_error', error: '${tokenData.error_description || tokenData.error}' }, '*');
              window.close();
            </script>
            <p>Authentication failed. You can close this window.</p>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' },
      });
    }
    
    // Store token in database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const tokenExpiry = tokenData.expires_in 
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;
    
    const { error: upsertError } = await supabase
      .from('user_oauth_tokens')
      .upsert({
        user_id: userId,
        provider,
        connector_type: connector,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expiry: tokenExpiry,
        scopes: connectorConfig.scopes,
        metadata: {
          token_type: tokenData.token_type,
          scope: tokenData.scope
        },
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,connector_type'
      });
    
    if (upsertError) {
      console.error('[OAuth Callback] Database error:', upsertError);
      throw upsertError;
    }
    
    console.log(`[OAuth Callback] Successfully stored ${connector} token for user ${userId}`);
    
    // Return success page that communicates with opener
    const finalRedirect = redirectUri || '/dashboard';
    
    return new Response(`
      <html>
        <body>
          <script>
            window.opener?.postMessage({ 
              type: 'oauth_success', 
              connector: '${connector}',
              provider: '${provider}'
            }, '*');
            setTimeout(() => {
              window.close();
            }, 1000);
          </script>
          <p>✅ Successfully connected ${connector}! This window will close automatically.</p>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' },
    });
    
  } catch (err) {
    console.error('[OAuth Callback] Error:', err);
    return new Response(`
      <html>
        <body>
          <script>
            window.opener?.postMessage({ type: 'oauth_error', error: 'Failed to complete authentication' }, '*');
            window.close();
          </script>
          <p>Authentication failed. You can close this window.</p>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' },
    });
  }
});
