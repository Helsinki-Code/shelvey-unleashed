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
    
    const accessToken = credentials?.INSTAGRAM_ACCESS_TOKEN;
    const businessId = credentials?.INSTAGRAM_BUSINESS_ID;
    
    if (!accessToken) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Instagram access token required. Please configure your Instagram Business API credentials.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = 'https://graph.facebook.com/v18.0';
    let result;

    switch (tool) {
      case 'get_profile': {
        const response = await fetch(
          `${baseUrl}/${businessId}?fields=id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url&access_token=${accessToken}`
        );
        result = await response.json();
        break;
      }

      case 'get_media': {
        const limit = args?.limit || 25;
        const response = await fetch(
          `${baseUrl}/${businessId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=${limit}&access_token=${accessToken}`
        );
        result = await response.json();
        break;
      }

      case 'publish_media': {
        // Step 1: Create container
        const containerResponse = await fetch(
          `${baseUrl}/${businessId}/media?image_url=${encodeURIComponent(args.image_url)}&caption=${encodeURIComponent(args.caption || '')}&access_token=${accessToken}`,
          { method: 'POST' }
        );
        const container = await containerResponse.json();
        
        if (container.id) {
          // Step 2: Publish container
          const publishResponse = await fetch(
            `${baseUrl}/${businessId}/media_publish?creation_id=${container.id}&access_token=${accessToken}`,
            { method: 'POST' }
          );
          result = await publishResponse.json();
        } else {
          result = container;
        }
        break;
      }

      case 'get_insights': {
        const metrics = args?.metrics || 'impressions,reach,profile_views';
        const period = args?.period || 'day';
        const response = await fetch(
          `${baseUrl}/${businessId}/insights?metric=${metrics}&period=${period}&access_token=${accessToken}`
        );
        result = await response.json();
        break;
      }

      case 'get_stories': {
        const response = await fetch(
          `${baseUrl}/${businessId}/stories?fields=id,media_type,media_url,timestamp&access_token=${accessToken}`
        );
        result = await response.json();
        break;
      }

      case 'get_comments': {
        const mediaId = args.media_id;
        const response = await fetch(
          `${baseUrl}/${mediaId}/comments?fields=id,text,username,timestamp,like_count&access_token=${accessToken}`
        );
        result = await response.json();
        break;
      }

      case 'reply_comment': {
        const response = await fetch(
          `${baseUrl}/${args.comment_id}/replies?message=${encodeURIComponent(args.message)}&access_token=${accessToken}`,
          { method: 'POST' }
        );
        result = await response.json();
        break;
      }

      case 'get_hashtag_search': {
        // First get hashtag ID
        const hashtagResponse = await fetch(
          `${baseUrl}/ig_hashtag_search?user_id=${businessId}&q=${encodeURIComponent(args.hashtag)}&access_token=${accessToken}`
        );
        const hashtagData = await hashtagResponse.json();
        
        if (hashtagData.data?.[0]?.id) {
          const hashtagId = hashtagData.data[0].id;
          const mediaResponse = await fetch(
            `${baseUrl}/${hashtagId}/top_media?user_id=${businessId}&fields=id,caption,media_type,permalink,like_count,comments_count&access_token=${accessToken}`
          );
          result = await mediaResponse.json();
        } else {
          result = hashtagData;
        }
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
    console.error('Instagram MCP error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
