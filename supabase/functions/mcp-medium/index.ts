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
    
    const integrationToken = credentials?.MEDIUM_INTEGRATION_TOKEN;
    
    if (!integrationToken) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Medium integration token required. Please configure your Medium API credentials.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = 'https://api.medium.com/v1';
    const headers = {
      'Authorization': `Bearer ${integrationToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    let result;

    switch (tool) {
      case 'get_user': {
        const response = await fetch(`${baseUrl}/me`, { headers });
        result = await response.json();
        break;
      }

      case 'get_publications': {
        // First get user ID
        const userResponse = await fetch(`${baseUrl}/me`, { headers });
        const userData = await userResponse.json();
        const userId = userData.data?.id;
        
        if (userId) {
          const pubResponse = await fetch(
            `${baseUrl}/users/${userId}/publications`,
            { headers }
          );
          result = await pubResponse.json();
        } else {
          result = { error: 'Could not get user ID' };
        }
        break;
      }

      case 'create_post': {
        // First get user ID
        const userResponse = await fetch(`${baseUrl}/me`, { headers });
        const userData = await userResponse.json();
        const userId = userData.data?.id;
        
        if (!userId) {
          result = { error: 'Could not get user ID' };
          break;
        }

        const postData: any = {
          title: args.title,
          contentFormat: args.content_format || 'html',
          content: args.content,
          publishStatus: args.publish_status || 'draft',
        };

        if (args.tags) {
          postData.tags = args.tags;
        }
        if (args.canonical_url) {
          postData.canonicalUrl = args.canonical_url;
        }

        const response = await fetch(`${baseUrl}/users/${userId}/posts`, {
          method: 'POST',
          headers,
          body: JSON.stringify(postData),
        });
        result = await response.json();
        break;
      }

      case 'get_posts': {
        result = {
          note: 'Medium API does not support listing posts. Posts can only be created.',
          suggestion: 'Use BrightData MCP to scrape your Medium profile for post list.',
        };
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
    console.error('Medium MCP error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
