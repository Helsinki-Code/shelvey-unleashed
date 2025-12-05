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
    
    const apiKey = credentials?.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Anthropic API key required. Please configure your Claude API credentials.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = 'https://api.anthropic.com/v1';
    const headers = {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    };

    let result;

    switch (tool) {
      case 'create_message': {
        const messages = args.messages || [{ role: 'user', content: args.prompt }];
        
        const response = await fetch(`${baseUrl}/messages`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: args.model || 'claude-sonnet-4-20250514',
            max_tokens: args.max_tokens || 1024,
            messages: messages,
            system: args.system,
          }),
        });
        result = await response.json();
        break;
      }

      case 'analyze_document': {
        const messages = [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: args.prompt || 'Please analyze this document and provide a summary.',
            },
          ],
        }];

        // If document content provided as text
        if (args.document_text) {
          messages[0].content.push({
            type: 'text',
            text: `Document content:\n${args.document_text}`,
          });
        }

        const response = await fetch(`${baseUrl}/messages`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: args.model || 'claude-sonnet-4-20250514',
            max_tokens: args.max_tokens || 2048,
            messages: messages,
          }),
        });
        result = await response.json();
        break;
      }

      case 'code_generation': {
        const response = await fetch(`${baseUrl}/messages`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: args.model || 'claude-sonnet-4-20250514',
            max_tokens: args.max_tokens || 4096,
            system: 'You are an expert programmer. Generate clean, well-documented code.',
            messages: [{
              role: 'user',
              content: args.prompt,
            }],
          }),
        });
        result = await response.json();
        break;
      }

      case 'summarize': {
        const response = await fetch(`${baseUrl}/messages`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: args.model || 'claude-sonnet-4-20250514',
            max_tokens: args.max_tokens || 1024,
            system: 'You are a skilled summarizer. Create clear, concise summaries.',
            messages: [{
              role: 'user',
              content: `Please summarize the following text:\n\n${args.text}`,
            }],
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
    console.error('Claude MCP error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
