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
    
    const accountSid = credentials?.TWILIO_ACCOUNT_SID;
    const authToken = credentials?.TWILIO_AUTH_TOKEN;
    const phoneNumber = credentials?.TWILIO_PHONE_NUMBER;
    
    if (!accountSid || !authToken) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Twilio credentials required. Please configure your Twilio Account SID and Auth Token.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}`;
    const authHeader = 'Basic ' + btoa(`${accountSid}:${authToken}`);
    const headers = {
      'Authorization': authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    let result;

    switch (tool) {
      case 'send_sms': {
        const body = new URLSearchParams({
          To: args.to,
          From: args.from || phoneNumber,
          Body: args.body,
        });
        const response = await fetch(`${baseUrl}/Messages.json`, {
          method: 'POST',
          headers,
          body: body.toString(),
        });
        result = await response.json();
        break;
      }

      case 'send_mms': {
        const body = new URLSearchParams({
          To: args.to,
          From: args.from || phoneNumber,
          Body: args.body || '',
          MediaUrl: args.media_url,
        });
        const response = await fetch(`${baseUrl}/Messages.json`, {
          method: 'POST',
          headers,
          body: body.toString(),
        });
        result = await response.json();
        break;
      }

      case 'make_call': {
        const body = new URLSearchParams({
          To: args.to,
          From: args.from || phoneNumber,
          Url: args.twiml_url || 'http://demo.twilio.com/docs/voice.xml',
        });
        const response = await fetch(`${baseUrl}/Calls.json`, {
          method: 'POST',
          headers,
          body: body.toString(),
        });
        result = await response.json();
        break;
      }

      case 'get_messages': {
        const limit = args?.limit || 20;
        const response = await fetch(
          `${baseUrl}/Messages.json?PageSize=${limit}`,
          { headers: { 'Authorization': authHeader } }
        );
        result = await response.json();
        break;
      }

      case 'get_calls': {
        const limit = args?.limit || 20;
        const response = await fetch(
          `${baseUrl}/Calls.json?PageSize=${limit}`,
          { headers: { 'Authorization': authHeader } }
        );
        result = await response.json();
        break;
      }

      case 'send_whatsapp': {
        const body = new URLSearchParams({
          To: `whatsapp:${args.to}`,
          From: `whatsapp:${args.from || phoneNumber}`,
          Body: args.body,
        });
        const response = await fetch(`${baseUrl}/Messages.json`, {
          method: 'POST',
          headers,
          body: body.toString(),
        });
        result = await response.json();
        break;
      }

      case 'get_phone_numbers': {
        const response = await fetch(
          `${baseUrl}/IncomingPhoneNumbers.json`,
          { headers: { 'Authorization': authHeader } }
        );
        result = await response.json();
        break;
      }

      case 'lookup_number': {
        const lookupUrl = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(args.phone_number)}`;
        const response = await fetch(lookupUrl, {
          headers: { 'Authorization': authHeader },
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
    console.error('Twilio MCP error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
