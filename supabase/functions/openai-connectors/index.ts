import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ConnectorType = 'gmail' | 'drive' | 'calendar' | 'teams' | 'outlook' | 'sharepoint';
type ConnectorAction = 
  // Gmail actions
  | 'list_emails' | 'send_email' | 'search_emails' | 'get_email'
  // Drive actions  
  | 'list_files' | 'upload_file' | 'download_file' | 'search_files' | 'create_folder'
  // Calendar actions
  | 'list_events' | 'create_event' | 'update_event' | 'delete_event' | 'get_availability'
  // Teams/Outlook/SharePoint actions
  | 'send_message' | 'list_channels' | 'list_documents';

interface ConnectorRequest {
  userId: string;
  connector: ConnectorType;
  action: ConnectorAction;
  params?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, connector, action, params } = await req.json() as ConnectorRequest;
    
    console.log(`[OpenAI Connectors] ${connector}/${action} for user ${userId}`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openaiKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'OpenAI API key not configured' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Check if user has connected this connector
    const { data: oauthToken, error: tokenError } = await supabase
      .from('user_oauth_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('connector_type', connector)
      .single();
    
    if (tokenError || !oauthToken) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Connector '${connector}' not connected. Please connect via OAuth first.`,
        requiresAuth: true,
        connector
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Check token expiry and refresh if needed
    if (oauthToken.token_expiry && new Date(oauthToken.token_expiry) < new Date()) {
      console.log(`[OpenAI Connectors] Token expired, attempting refresh`);
      
      const refreshedToken = await refreshOAuthToken(oauthToken, supabase);
      if (!refreshedToken) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'OAuth token expired and refresh failed. Please reconnect.',
          requiresAuth: true,
          connector
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      oauthToken.access_token = refreshedToken;
    }
    
    // Determine provider and built-in connector ID
    const connectorConfig = getConnectorConfig(connector, oauthToken.provider);
    
    const startTime = Date.now();
    
    // Call OpenAI with built-in connector
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
            content: `You are a productivity assistant with access to the user's ${connector}. Execute the requested action and return structured results.`
          },
          {
            role: 'user',
            content: buildActionPrompt(connector, action, params)
          }
        ],
        tools: [
          {
            type: 'connector',
            connector_id: connectorConfig.connectorId,
            oauth_account_id: oauthToken.id, // Use stored token reference
          }
        ],
        tool_choice: 'auto',
        max_completion_tokens: 4096,
      }),
    });
    
    const latencyMs = Date.now() - startTime;
    const result = await response.json();
    
    console.log(`[OpenAI Connectors] Response received in ${latencyMs}ms`);
    
    // Log activity
    await supabase.from('user_agent_activity').insert({
      user_id: userId,
      agent_id: 'openai-connector',
      agent_name: `${connector} Connector`,
      action: action,
      metadata: { connector, params },
      result: result,
      status: result.error ? 'failed' : 'completed'
    });
    
    if (result.error) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: result.error.message || 'Connector action failed' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Extract and format results
    const content = result.choices?.[0]?.message?.content;
    const toolCalls = result.choices?.[0]?.message?.tool_calls || [];
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: {
        content,
        toolCalls,
        connector,
        action,
        latencyMs
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('[OpenAI Connectors] Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getConnectorConfig(connector: ConnectorType, provider: string) {
  const configs: Record<ConnectorType, { connectorId: string; scopes: string[] }> = {
    gmail: {
      connectorId: 'google_gmail',
      scopes: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send']
    },
    drive: {
      connectorId: 'google_drive',
      scopes: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/drive.file']
    },
    calendar: {
      connectorId: 'google_calendar',
      scopes: ['https://www.googleapis.com/auth/calendar']
    },
    teams: {
      connectorId: 'microsoft_teams',
      scopes: ['ChannelMessage.Send', 'Channel.ReadBasic.All']
    },
    outlook: {
      connectorId: 'microsoft_outlook',
      scopes: ['Mail.Read', 'Mail.Send']
    },
    sharepoint: {
      connectorId: 'microsoft_sharepoint',
      scopes: ['Sites.Read.All', 'Files.Read.All']
    }
  };
  
  return configs[connector];
}

function buildActionPrompt(connector: ConnectorType, action: ConnectorAction, params?: Record<string, unknown>): string {
  const prompts: Record<string, string> = {
    // Gmail
    'gmail:list_emails': `List the user's recent emails${params?.limit ? ` (limit: ${params.limit})` : ''}${params?.query ? ` matching: "${params.query}"` : ''}`,
    'gmail:send_email': `Send an email to ${params?.to} with subject "${params?.subject}" and body: ${params?.body}`,
    'gmail:search_emails': `Search emails for: "${params?.query}"`,
    'gmail:get_email': `Get the full content of email with ID: ${params?.emailId}`,
    
    // Drive
    'drive:list_files': `List files in ${params?.folderId ? `folder ${params.folderId}` : 'root directory'}${params?.limit ? ` (limit: ${params.limit})` : ''}`,
    'drive:upload_file': `Upload file "${params?.name}" to ${params?.folderId || 'root'}`,
    'drive:download_file': `Download file with ID: ${params?.fileId}`,
    'drive:search_files': `Search files for: "${params?.query}"`,
    'drive:create_folder': `Create folder named "${params?.name}" in ${params?.parentId || 'root'}`,
    
    // Calendar
    'calendar:list_events': `List calendar events${params?.timeMin ? ` from ${params.timeMin}` : ''}${params?.timeMax ? ` to ${params.timeMax}` : ''}`,
    'calendar:create_event': `Create calendar event: "${params?.title}" on ${params?.date} at ${params?.time}${params?.duration ? ` for ${params.duration}` : ''}`,
    'calendar:update_event': `Update event ${params?.eventId}: ${JSON.stringify(params?.updates)}`,
    'calendar:delete_event': `Delete calendar event with ID: ${params?.eventId}`,
    'calendar:get_availability': `Check availability for ${params?.date} between ${params?.startTime} and ${params?.endTime}`,
    
    // Teams
    'teams:send_message': `Send message to Teams channel ${params?.channelId}: "${params?.message}"`,
    'teams:list_channels': `List all Teams channels`,
    
    // Outlook
    'outlook:list_emails': `List recent Outlook emails${params?.limit ? ` (limit: ${params.limit})` : ''}`,
    'outlook:send_email': `Send email via Outlook to ${params?.to} with subject "${params?.subject}"`,
    
    // SharePoint
    'sharepoint:list_documents': `List documents in SharePoint${params?.siteId ? ` site ${params.siteId}` : ''}`,
  };
  
  const key = `${connector}:${action}`;
  return prompts[key] || `Execute ${action} on ${connector} with params: ${JSON.stringify(params)}`;
}

async function refreshOAuthToken(token: any, supabase: any): Promise<string | null> {
  try {
    if (!token.refresh_token) return null;
    
    const isGoogle = token.provider === 'google';
    const tokenUrl = isGoogle 
      ? 'https://oauth2.googleapis.com/token'
      : 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
    
    const clientId = isGoogle 
      ? Deno.env.get('GOOGLE_CLIENT_ID')
      : Deno.env.get('MICROSOFT_CLIENT_ID');
    const clientSecret = isGoogle
      ? Deno.env.get('GOOGLE_CLIENT_SECRET')
      : Deno.env.get('MICROSOFT_CLIENT_SECRET');
    
    if (!clientId || !clientSecret) return null;
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: token.refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    // Update stored token
    await supabase
      .from('user_oauth_tokens')
      .update({
        access_token: data.access_token,
        token_expiry: new Date(Date.now() + data.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', token.id);
    
    return data.access_token;
    
  } catch (error) {
    console.error('[Token Refresh] Error:', error);
    return null;
  }
}
