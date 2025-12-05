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
    
    const apiKey = credentials?.SERPAPI_KEY;
    
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'SerpAPI key required. Please configure your SerpAPI credentials.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = 'https://serpapi.com/search.json';

    let result;

    switch (tool) {
      case 'google_search': {
        const params = new URLSearchParams({
          api_key: apiKey,
          engine: 'google',
          q: args.query,
          num: args.num || '10',
          gl: args.country || 'us',
          hl: args.language || 'en',
        });
        const response = await fetch(`${baseUrl}?${params}`);
        result = await response.json();
        break;
      }

      case 'google_news': {
        const params = new URLSearchParams({
          api_key: apiKey,
          engine: 'google_news',
          q: args.query,
          gl: args.country || 'us',
          hl: args.language || 'en',
        });
        const response = await fetch(`${baseUrl}?${params}`);
        result = await response.json();
        break;
      }

      case 'google_images': {
        const params = new URLSearchParams({
          api_key: apiKey,
          engine: 'google_images',
          q: args.query,
          num: args.num || '10',
        });
        const response = await fetch(`${baseUrl}?${params}`);
        result = await response.json();
        break;
      }

      case 'google_shopping': {
        const params = new URLSearchParams({
          api_key: apiKey,
          engine: 'google_shopping',
          q: args.query,
          gl: args.country || 'us',
        });
        const response = await fetch(`${baseUrl}?${params}`);
        result = await response.json();
        break;
      }

      case 'google_trends': {
        const params = new URLSearchParams({
          api_key: apiKey,
          engine: 'google_trends',
          q: args.query,
          data_type: args.data_type || 'TIMESERIES',
        });
        const response = await fetch(`${baseUrl}?${params}`);
        result = await response.json();
        break;
      }

      case 'google_maps': {
        const params = new URLSearchParams({
          api_key: apiKey,
          engine: 'google_maps',
          q: args.query,
          ll: args.location,
          type: args.type || 'search',
        });
        const response = await fetch(`${baseUrl}?${params}`);
        result = await response.json();
        break;
      }

      case 'bing_search': {
        const params = new URLSearchParams({
          api_key: apiKey,
          engine: 'bing',
          q: args.query,
          count: args.count || '10',
        });
        const response = await fetch(`${baseUrl}?${params}`);
        result = await response.json();
        break;
      }

      case 'youtube_search': {
        const params = new URLSearchParams({
          api_key: apiKey,
          engine: 'youtube',
          search_query: args.query,
        });
        const response = await fetch(`${baseUrl}?${params}`);
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
    console.error('SerpAPI MCP error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
