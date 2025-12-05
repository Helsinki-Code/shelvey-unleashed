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
    
    const siteUrl = credentials?.WORDPRESS_URL;
    const username = credentials?.WORDPRESS_USERNAME;
    const appPassword = credentials?.WORDPRESS_APP_PASSWORD;
    
    if (!siteUrl || !username || !appPassword) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'WordPress credentials required. Please configure your WordPress site URL, username, and application password.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = `${siteUrl.replace(/\/$/, '')}/wp-json/wp/v2`;
    const authHeader = 'Basic ' + btoa(`${username}:${appPassword}`);
    const headers = {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    };

    let result;

    switch (tool) {
      case 'get_posts': {
        const perPage = args?.per_page || 10;
        const status = args?.status || 'publish';
        const response = await fetch(
          `${baseUrl}/posts?per_page=${perPage}&status=${status}`,
          { headers }
        );
        result = await response.json();
        break;
      }

      case 'create_post': {
        const response = await fetch(`${baseUrl}/posts`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            title: args.title,
            content: args.content,
            status: args.status || 'draft',
            excerpt: args.excerpt,
            categories: args.categories,
            tags: args.tags,
          }),
        });
        result = await response.json();
        break;
      }

      case 'update_post': {
        const response = await fetch(`${baseUrl}/posts/${args.post_id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            title: args.title,
            content: args.content,
            status: args.status,
            excerpt: args.excerpt,
          }),
        });
        result = await response.json();
        break;
      }

      case 'get_pages': {
        const perPage = args?.per_page || 10;
        const response = await fetch(
          `${baseUrl}/pages?per_page=${perPage}`,
          { headers }
        );
        result = await response.json();
        break;
      }

      case 'create_page': {
        const response = await fetch(`${baseUrl}/pages`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            title: args.title,
            content: args.content,
            status: args.status || 'draft',
            parent: args.parent_id,
          }),
        });
        result = await response.json();
        break;
      }

      case 'get_media': {
        const perPage = args?.per_page || 10;
        const response = await fetch(
          `${baseUrl}/media?per_page=${perPage}`,
          { headers }
        );
        result = await response.json();
        break;
      }

      case 'upload_media': {
        result = {
          note: 'Media upload requires multipart form data',
          suggested_endpoint: `${baseUrl}/media`,
          method: 'POST',
        };
        break;
      }

      case 'get_categories': {
        const response = await fetch(`${baseUrl}/categories`, { headers });
        result = await response.json();
        break;
      }

      case 'get_users': {
        const response = await fetch(`${baseUrl}/users`, { headers });
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
    console.error('WordPress MCP error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
