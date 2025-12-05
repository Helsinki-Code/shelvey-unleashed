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
    const { userId, tool, params, credentials } = await req.json();
    
    const accessToken = credentials?.GOOGLE_CALENDAR_ACCESS_TOKEN || credentials?.GOOGLE_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error('Google Calendar access token not configured');
    }

    console.log(`[MCP-GOOGLECALENDAR] Executing tool: ${tool} for user: ${userId}`);
    const startTime = Date.now();

    const baseUrl = 'https://www.googleapis.com/calendar/v3';
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    let result;
    const calendarId = params?.calendarId || 'primary';

    switch (tool) {
      case 'list_calendars':
        const calendarsRes = await fetch(`${baseUrl}/users/me/calendarList`, { headers });
        result = await calendarsRes.json();
        break;

      case 'list_events':
        const now = new Date().toISOString();
        const eventsUrl = new URL(`${baseUrl}/calendars/${encodeURIComponent(calendarId)}/events`);
        eventsUrl.searchParams.set('timeMin', params?.timeMin || now);
        if (params?.timeMax) eventsUrl.searchParams.set('timeMax', params.timeMax);
        eventsUrl.searchParams.set('maxResults', String(params?.maxResults || 10));
        eventsUrl.searchParams.set('singleEvents', 'true');
        eventsUrl.searchParams.set('orderBy', 'startTime');
        
        const eventsRes = await fetch(eventsUrl.toString(), { headers });
        result = await eventsRes.json();
        break;

      case 'create_event':
        const event = {
          summary: params?.summary,
          description: params?.description,
          location: params?.location,
          start: {
            dateTime: params?.startDateTime,
            timeZone: params?.timeZone || 'UTC',
          },
          end: {
            dateTime: params?.endDateTime,
            timeZone: params?.timeZone || 'UTC',
          },
          attendees: params?.attendees?.map((email: string) => ({ email })),
          reminders: params?.reminders || {
            useDefault: true,
          },
        };
        
        const createRes = await fetch(`${baseUrl}/calendars/${encodeURIComponent(calendarId)}/events`, {
          method: 'POST',
          headers,
          body: JSON.stringify(event),
        });
        result = await createRes.json();
        break;

      case 'update_event':
        const updateRes = await fetch(
          `${baseUrl}/calendars/${encodeURIComponent(calendarId)}/events/${params?.eventId}`,
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              summary: params?.summary,
              description: params?.description,
              location: params?.location,
              start: params?.startDateTime ? {
                dateTime: params.startDateTime,
                timeZone: params?.timeZone || 'UTC',
              } : undefined,
              end: params?.endDateTime ? {
                dateTime: params.endDateTime,
                timeZone: params?.timeZone || 'UTC',
              } : undefined,
            }),
          }
        );
        result = await updateRes.json();
        break;

      case 'delete_event':
        await fetch(
          `${baseUrl}/calendars/${encodeURIComponent(calendarId)}/events/${params?.eventId}`,
          {
            method: 'DELETE',
            headers,
          }
        );
        result = { success: true, message: 'Event deleted' };
        break;

      case 'get_freebusy':
        const freeBusyRes = await fetch(`${baseUrl}/freeBusy`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            timeMin: params?.timeMin,
            timeMax: params?.timeMax,
            items: [{ id: calendarId }],
          }),
        });
        result = await freeBusyRes.json();
        break;

      default:
        throw new Error(`Unknown Google Calendar tool: ${tool}`);
    }

    const latencyMs = Date.now() - startTime;
    console.log(`[MCP-GOOGLECALENDAR] Tool ${tool} completed in ${latencyMs}ms`);

    return new Response(JSON.stringify({
      success: true,
      data: result,
      latencyMs,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[MCP-GOOGLECALENDAR] Error:', errorMessage);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
