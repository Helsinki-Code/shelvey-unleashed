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
    
    const apiKey = credentials?.BRIGHTDATA_API_KEY;
    
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'BrightData API key required. Please configure your BrightData API credentials.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    let result;

    switch (tool) {
      case 'web_search': {
        const response = await fetch('https://api.brightdata.com/serp/req', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query: args.query,
            country: args.country || 'us',
            search_engine: args.engine || 'google',
          }),
        });
        result = await response.json();
        break;
      }

      case 'scrape_url': {
        const response = await fetch('https://api.brightdata.com/request', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            url: args.url,
            format: args.format || 'json',
            render: args.render_js ?? true,
          }),
        });
        result = await response.json();
        break;
      }

      case 'crawl_site': {
        const response = await fetch('https://api.brightdata.com/datasets/trigger', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            url: args.url,
            max_pages: args.max_pages || 10,
            include_subdomains: args.include_subdomains ?? false,
          }),
        });
        result = await response.json();
        break;
      }

      case 'take_screenshot': {
        const response = await fetch('https://api.brightdata.com/request', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            url: args.url,
            format: 'png',
            full_page: args.full_page ?? false,
          }),
        });
        
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          result = { screenshot: `data:image/png;base64,${base64}` };
        } else {
          result = await response.json();
        }
        break;
      }

      case 'get_page_content': {
        const response = await fetch('https://api.brightdata.com/request', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            url: args.url,
            format: 'html',
            render: true,
          }),
        });
        const html = await response.text();
        result = { html, url: args.url };
        break;
      }

      case 'navigate_page': {
        result = {
          note: 'Interactive browsing requires Scraping Browser session',
          url: args.url,
          actions: args.actions,
        };
        break;
      }

      case 'extract_structured': {
        const response = await fetch('https://api.brightdata.com/request', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            url: args.url,
            format: 'json',
            render: true,
            data_type: args.data_type || 'auto',
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
    console.error('BrightData MCP error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
