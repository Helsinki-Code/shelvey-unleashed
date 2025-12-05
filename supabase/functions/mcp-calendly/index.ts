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
    
    const apiKey = credentials?.CALENDLY_API_KEY;
    
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Calendly API key required. Please configure your Calendly API credentials.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = 'https://api.calendly.com';
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    // First get current user to get organization URI
    const userResponse = await fetch(`${baseUrl}/users/me`, { headers });
    const userData = await userResponse.json();
    const userUri = userData.resource?.uri;
    const organizationUri = userData.resource?.current_organization;

    let result;

    switch (tool) {
      case 'get_event_types': {
        const response = await fetch(
          `${baseUrl}/event_types?user=${userUri}`,
          { headers }
        );
        result = await response.json();
        break;
      }

      case 'get_scheduled_events': {
        const minStartTime = args?.min_start_time || new Date().toISOString();
        const response = await fetch(
          `${baseUrl}/scheduled_events?user=${userUri}&min_start_time=${minStartTime}`,
          { headers }
        );
        result = await response.json();
        break;
      }

      case 'get_invitees': {
        const eventUuid = args.event_uuid;
        const response = await fetch(
          `${baseUrl}/scheduled_events/${eventUuid}/invitees`,
          { headers }
        );
        result = await response.json();
        break;
      }

      case 'cancel_event': {
        const eventUuid = args.event_uuid;
        const response = await fetch(
          `${baseUrl}/scheduled_events/${eventUuid}/cancellation`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              reason: args.reason || 'Cancelled by system',
            }),
          }
        );
        result = await response.json();
        break;
      }

      case 'get_user': {
        result = userData;
        break;
      }

      case 'get_availability': {
        const response = await fetch(
          `${baseUrl}/user_availability_schedules?user=${userUri}`,
          { headers }
        );
        result = await response.json();
        break;
      }

      case 'create_single_use_link': {
        const response = await fetch(`${baseUrl}/scheduling_links`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            max_event_count: 1,
            owner: args.event_type_uri,
            owner_type: 'EventType',
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
    console.error('Calendly MCP error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
