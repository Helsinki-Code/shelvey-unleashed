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
    
    const apiKey = credentials?.OPENAI_API_KEY;
    
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'OpenAI API key required. Please configure your OpenAI API credentials.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = 'https://api.openai.com/v1';
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    let result;

    switch (tool) {
      case 'chat_completion': {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: args.model || 'gpt-4o-mini',
            messages: args.messages || [{ role: 'user', content: args.prompt }],
            temperature: args.temperature ?? 0.7,
            max_tokens: args.max_tokens || 1000,
          }),
        });
        result = await response.json();
        break;
      }

      case 'create_image': {
        const response = await fetch(`${baseUrl}/images/generations`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: args.model || 'dall-e-3',
            prompt: args.prompt,
            n: args.n || 1,
            size: args.size || '1024x1024',
            quality: args.quality || 'standard',
          }),
        });
        result = await response.json();
        break;
      }

      case 'create_embedding': {
        const response = await fetch(`${baseUrl}/embeddings`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: args.model || 'text-embedding-3-small',
            input: args.input,
          }),
        });
        result = await response.json();
        break;
      }

      case 'text_to_speech': {
        const response = await fetch(`${baseUrl}/audio/speech`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: args.model || 'tts-1',
            input: args.text,
            voice: args.voice || 'alloy',
          }),
        });
        
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          result = { audio: `data:audio/mp3;base64,${base64}` };
        } else {
          result = await response.json();
        }
        break;
      }

      case 'speech_to_text': {
        result = {
          note: 'Audio transcription requires file upload',
          endpoint: `${baseUrl}/audio/transcriptions`,
          model: 'whisper-1',
        };
        break;
      }

      case 'moderate_content': {
        const response = await fetch(`${baseUrl}/moderations`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            input: args.input,
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
    console.error('OpenAI MCP error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
