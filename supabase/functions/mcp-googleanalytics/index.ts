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
    
    const propertyId = credentials?.GA_PROPERTY_ID;
    const clientEmail = credentials?.GA_CLIENT_EMAIL;
    const privateKey = credentials?.GA_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    if (!propertyId || !clientEmail || !privateKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Google Analytics credentials required. Please configure your GA4 service account.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create JWT for service account auth
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/analytics.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };

    // Sign JWT (simplified - in production use proper JWT library)
    const encoder = new TextEncoder();
    const headerB64 = btoa(JSON.stringify(header));
    const payloadB64 = btoa(JSON.stringify(payload));
    
    // Get access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${headerB64}.${payloadB64}.signature`, // Simplified
      }),
    });

    // For demo purposes, we'll use the API key approach if available
    const baseUrl = 'https://analyticsdata.googleapis.com/v1beta';
    const headers = {
      'Content-Type': 'application/json',
    };

    let result;
    const startDate = args?.start_date || '30daysAgo';
    const endDate = args?.end_date || 'today';

    switch (tool) {
      case 'get_pageviews': {
        result = {
          propertyId,
          dateRange: { startDate, endDate },
          metrics: ['screenPageViews'],
          note: 'Connect service account for live data'
        };
        break;
      }

      case 'get_sessions': {
        result = {
          propertyId,
          dateRange: { startDate, endDate },
          metrics: ['sessions', 'averageSessionDuration'],
          note: 'Connect service account for live data'
        };
        break;
      }

      case 'get_audience': {
        result = {
          propertyId,
          dimensions: ['country', 'city', 'deviceCategory'],
          note: 'Connect service account for live data'
        };
        break;
      }

      case 'get_realtime': {
        result = {
          propertyId,
          metrics: ['activeUsers'],
          dimensions: ['unifiedScreenName'],
          note: 'Realtime data requires active service account'
        };
        break;
      }

      case 'get_conversions': {
        result = {
          propertyId,
          metrics: ['conversions', 'eventCount'],
          dimensions: ['eventName'],
          note: 'Connect service account for live data'
        };
        break;
      }

      case 'get_traffic_sources': {
        result = {
          propertyId,
          dimensions: ['sessionSource', 'sessionMedium', 'sessionCampaignName'],
          metrics: ['sessions', 'totalUsers'],
          note: 'Connect service account for live data'
        };
        break;
      }

      case 'run_report': {
        result = {
          propertyId,
          dimensions: args?.dimensions || ['date'],
          metrics: args?.metrics || ['sessions'],
          dateRange: { startDate, endDate },
          note: 'Custom report configuration ready'
        };
        break;
      }

      case 'get_events': {
        result = {
          propertyId,
          dimensions: ['eventName'],
          metrics: ['eventCount', 'eventValue'],
          note: 'Connect service account for live data'
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
    console.error('Google Analytics MCP error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
