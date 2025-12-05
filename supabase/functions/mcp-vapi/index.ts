import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VAPI_API_URL = 'https://api.vapi.ai';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tool, arguments: args, credentials } = await req.json();

    const token = credentials?.VAPI_TOKEN;
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'VAPI_TOKEN not provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;

    switch (tool) {
      case 'create_assistant':
        result = await createAssistant(token, args);
        break;
      case 'get_assistants':
        result = await getAssistants(token, args);
        break;
      case 'create_call':
        result = await createCall(token, args);
        break;
      case 'get_calls':
        result = await getCalls(token, args);
        break;
      case 'get_call':
        result = await getCall(token, args);
        break;
      case 'end_call':
        result = await endCall(token, args);
        break;
      case 'create_phone_number':
        result = await createPhoneNumber(token, args);
        break;
      case 'get_phone_numbers':
        result = await getPhoneNumbers(token, args);
        break;
      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown tool: ${tool}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[mcp-vapi] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function callVapi(token: string, endpoint: string, method = 'GET', body?: any) {
  const response = await fetch(`${VAPI_API_URL}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vapi API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

async function createAssistant(token: string, args: any) {
  const { name, firstMessage, systemPrompt, model, voice, endCallMessage, interruptionsEnabled } = args;

  const result = await callVapi(token, '/assistant', 'POST', {
    name,
    firstMessage: firstMessage || `Hello! I'm ${name}. How can I help you today?`,
    model: {
      provider: model?.provider || 'openai',
      model: model?.model || 'gpt-4',
      systemPrompt: systemPrompt || 'You are a helpful AI assistant.',
    },
    voice: {
      provider: voice?.provider || 'elevenlabs',
      voiceId: voice?.voiceId || 'rachel',
    },
    endCallMessage: endCallMessage || 'Thank you for calling. Goodbye!',
    interruptionsEnabled: interruptionsEnabled !== false,
  });

  return { assistant: result };
}

async function getAssistants(token: string, args: any) {
  const result = await callVapi(token, '/assistant');
  return { assistants: result };
}

async function createCall(token: string, args: any) {
  const { assistantId, phoneNumber, customer, metadata } = args;

  const callBody: any = {
    assistantId,
  };

  if (phoneNumber) {
    callBody.phoneNumberId = phoneNumber;
    callBody.customer = customer || {};
  }

  if (metadata) {
    callBody.metadata = metadata;
  }

  const result = await callVapi(token, '/call/phone', 'POST', callBody);

  return { call: result };
}

async function getCalls(token: string, args: any) {
  const { limit } = args;
  const params = new URLSearchParams();
  if (limit) params.append('limit', String(limit));

  const result = await callVapi(token, `/call${params.toString() ? `?${params.toString()}` : ''}`);
  return { calls: result };
}

async function getCall(token: string, args: any) {
  const { callId } = args;
  const result = await callVapi(token, `/call/${callId}`);
  return { call: result };
}

async function endCall(token: string, args: any) {
  const { callId } = args;
  const result = await callVapi(token, `/call/${callId}/stop`, 'POST');
  return { result };
}

async function createPhoneNumber(token: string, args: any) {
  const { areaCode, assistantId, name } = args;

  const result = await callVapi(token, '/phone-number', 'POST', {
    provider: 'twilio',
    number: {
      areaCode: areaCode || '415',
    },
    assistantId,
    name,
  });

  return { phoneNumber: result };
}

async function getPhoneNumbers(token: string, args: any) {
  const result = await callVapi(token, '/phone-number');
  return { phoneNumbers: result };
}
