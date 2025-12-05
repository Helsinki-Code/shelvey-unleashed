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
    
    const accessToken = credentials?.TIKTOK_ACCESS_TOKEN;
    const openId = credentials?.TIKTOK_OPEN_ID;
    
    if (!accessToken) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'TikTok access token required. Please configure your TikTok API credentials.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = 'https://open.tiktokapis.com/v2';
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    let result;

    switch (tool) {
      case 'get_profile': {
        const response = await fetch(
          `${baseUrl}/user/info/?fields=open_id,union_id,avatar_url,display_name,bio_description,profile_deep_link,is_verified,follower_count,following_count,likes_count,video_count`,
          { headers }
        );
        result = await response.json();
        break;
      }

      case 'get_videos': {
        const maxCount = args?.max_count || 20;
        const response = await fetch(`${baseUrl}/video/list/`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            max_count: maxCount,
            cursor: args?.cursor,
          }),
        });
        result = await response.json();
        break;
      }

      case 'get_analytics': {
        const response = await fetch(`${baseUrl}/video/query/`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            filters: {
              video_ids: args.video_ids,
            },
            fields: ['id', 'title', 'video_description', 'duration', 'cover_image_url', 'embed_link', 'like_count', 'comment_count', 'share_count', 'view_count'],
          }),
        });
        result = await response.json();
        break;
      }

      case 'get_followers': {
        result = {
          note: 'Follower list API requires additional permissions',
          open_id: openId,
          tool: 'get_followers'
        };
        break;
      }

      case 'get_trending': {
        result = {
          note: 'Trending API requires TikTok Research API access',
          tool: 'get_trending',
          suggestion: 'Use Perplexity MCP for trending topic research'
        };
        break;
      }

      case 'get_comments': {
        const videoId = args.video_id;
        const maxCount = args?.max_count || 50;
        const response = await fetch(`${baseUrl}/video/comment/list/`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            video_id: videoId,
            max_count: maxCount,
            cursor: args?.cursor,
          }),
        });
        result = await response.json();
        break;
      }

      case 'search_videos': {
        result = {
          note: 'Video search requires TikTok Research API access',
          hashtag: args?.hashtag,
          suggestion: 'Use BrightData MCP for TikTok scraping'
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
    console.error('TikTok MCP error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
