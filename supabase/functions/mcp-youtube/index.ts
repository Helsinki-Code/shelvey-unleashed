import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { action, userId, params } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: credData, error: credError } = await supabase.functions.invoke('get-mcp-credentials', {
      body: { userId, mcpServer: 'youtube' }
    });

    if (credError || !credData?.credentials?.YOUTUBE_API_KEY) {
      throw new Error('YouTube credentials not configured');
    }

    const apiKey = credData.credentials.YOUTUBE_API_KEY;
    let result: unknown;

    switch (action) {
      case 'search_videos':
        const searchResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(params.query)}&type=video&maxResults=${params.maxResults || 10}&key=${apiKey}`
        );
        result = await searchResponse.json();
        break;

      case 'get_video_details':
        const videoResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${params.videoId}&key=${apiKey}`
        );
        result = await videoResponse.json();
        break;

      case 'get_channel_info':
        const channelResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${params.channelId}&key=${apiKey}`
        );
        result = await channelResponse.json();
        break;

      case 'get_playlist_items':
        const playlistResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${params.playlistId}&maxResults=${params.maxResults || 25}&key=${apiKey}`
        );
        result = await playlistResponse.json();
        break;

      case 'get_video_comments':
        const commentsResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${params.videoId}&maxResults=${params.maxResults || 20}&key=${apiKey}`
        );
        result = await commentsResponse.json();
        break;

      case 'get_trending':
        const trendingResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=${params.region || 'US'}&maxResults=${params.maxResults || 10}&key=${apiKey}`
        );
        result = await trendingResponse.json();
        break;

      default:
        throw new Error(`Unknown YouTube action: ${action}`);
    }

    const latency = Date.now() - startTime;

    await supabase.from('agent_mcp_usage').insert({
      agent_id: params?.agentId || 'system',
      mcp_server_id: 'mcp-youtube',
      action,
      request_payload: params,
      response_payload: result,
      success: true,
      latency_ms: latency
    });

    await supabase.rpc('update_mcp_metrics', {
      p_server_id: 'mcp-youtube',
      p_latency_ms: latency,
      p_requests_increment: 1
    });

    return new Response(JSON.stringify({ success: true, data: result, latency_ms: latency }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('YouTube MCP error:', errorMessage);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
