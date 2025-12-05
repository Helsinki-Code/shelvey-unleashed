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
    
    const apiKey = credentials?.GOOGLE_AI_API_KEY;
    
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Google AI API key required. Please configure your Gemini API credentials.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const model = args.model || 'gemini-2.0-flash';
    const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}`;

    let result;

    switch (tool) {
      case 'generate_content': {
        const response = await fetch(
          `${baseUrl}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: args.prompt }],
              }],
              generationConfig: {
                temperature: args.temperature ?? 0.7,
                maxOutputTokens: args.max_tokens || 1024,
              },
            }),
          }
        );
        result = await response.json();
        break;
      }

      case 'analyze_image': {
        if (!args.image_url && !args.image_base64) {
          result = { error: 'Either image_url or image_base64 is required' };
          break;
        }

        const contents: any = {
          parts: [
            { text: args.prompt || 'Describe this image in detail.' },
          ],
        };

        if (args.image_base64) {
          contents.parts.push({
            inline_data: {
              mime_type: args.mime_type || 'image/jpeg',
              data: args.image_base64,
            },
          });
        }

        const response = await fetch(
          `${baseUrl}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [contents],
            }),
          }
        );
        result = await response.json();
        break;
      }

      case 'generate_embeddings': {
        const embeddingModel = 'text-embedding-004';
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${embeddingModel}:embedContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: `models/${embeddingModel}`,
              content: {
                parts: [{ text: args.text }],
              },
            }),
          }
        );
        result = await response.json();
        break;
      }

      case 'code_execution': {
        const response = await fetch(
          `${baseUrl}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: args.prompt }],
              }],
              tools: [{
                codeExecution: {},
              }],
            }),
          }
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
    console.error('Gemini MCP error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
