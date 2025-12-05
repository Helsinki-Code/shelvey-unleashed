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
      body: { userId, mcpServer: 'googlemaps' }
    });

    if (credError || !credData?.credentials?.GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps credentials not configured');
    }

    const apiKey = credData.credentials.GOOGLE_MAPS_API_KEY;
    let result: unknown;

    switch (action) {
      case 'geocode':
        const geocodeResponse = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(params.address)}&key=${apiKey}`
        );
        result = await geocodeResponse.json();
        break;

      case 'reverse_geocode':
        const reverseResponse = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${params.lat},${params.lng}&key=${apiKey}`
        );
        result = await reverseResponse.json();
        break;

      case 'places_search':
        const placesResponse = await fetch(
          `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(params.query)}&key=${apiKey}`
        );
        result = await placesResponse.json();
        break;

      case 'place_details':
        const detailsResponse = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${params.placeId}&fields=name,formatted_address,formatted_phone_number,opening_hours,rating,reviews,website&key=${apiKey}`
        );
        result = await detailsResponse.json();
        break;

      case 'nearby_search':
        const nearbyResponse = await fetch(
          `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${params.lat},${params.lng}&radius=${params.radius || 1000}&type=${params.type || ''}&key=${apiKey}`
        );
        result = await nearbyResponse.json();
        break;

      case 'directions':
        const directionsResponse = await fetch(
          `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(params.origin)}&destination=${encodeURIComponent(params.destination)}&mode=${params.mode || 'driving'}&key=${apiKey}`
        );
        result = await directionsResponse.json();
        break;

      case 'distance_matrix':
        const matrixResponse = await fetch(
          `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(params.origins)}&destinations=${encodeURIComponent(params.destinations)}&key=${apiKey}`
        );
        result = await matrixResponse.json();
        break;

      default:
        throw new Error(`Unknown Google Maps action: ${action}`);
    }

    const latency = Date.now() - startTime;

    await supabase.from('agent_mcp_usage').insert({
      agent_id: params?.agentId || 'system',
      mcp_server_id: 'mcp-googlemaps',
      action,
      request_payload: params,
      response_payload: result,
      success: true,
      latency_ms: latency
    });

    await supabase.rpc('update_mcp_metrics', {
      p_server_id: 'mcp-googlemaps',
      p_latency_ms: latency,
      p_requests_increment: 1
    });

    return new Response(JSON.stringify({ success: true, data: result, latency_ms: latency }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Google Maps MCP error:', errorMessage);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
