import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map of MCP server IDs to their required API key names
const MCP_KEY_MAPPING: Record<string, string[]> = {
  'mcp-perplexity': ['PERPLEXITY_API_KEY'],
  'mcp-twitter': ['TWITTER_BEARER_TOKEN', 'TWITTER_API_KEY', 'TWITTER_API_SECRET'],
  'mcp-linkedin': ['LINKEDIN_ACCESS_TOKEN'],
  'mcp-facebook': ['FACEBOOK_ACCESS_TOKEN', 'FACEBOOK_PAGE_ID'],
  'mcp-facebookads': ['FACEBOOK_ADS_TOKEN', 'FACEBOOK_AD_ACCOUNT_ID'],
  'mcp-googleads': ['GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_CUSTOMER_ID'],
  'mcp-falai': ['FAL_KEY'],
  'mcp-vapi': ['VAPI_TOKEN'],
  'mcp-whatsapp': ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_ID'],
  'mcp-github': ['GITHUB_TOKEN'],
  'mcp-linear': ['LINEAR_API_KEY'],
  'mcp-stripe': ['STRIPE_SECRET_KEY'],
  'mcp-youtube': ['YOUTUBE_API_KEY'],
  'mcp-canva': ['CANVA_API_KEY'],
  'mcp-googlecalendar': ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  'mcp-googlemaps': ['GOOGLE_MAPS_API_KEY'],
  'mcp-21stdev': ['21ST_DEV_API_KEY'],
  'mcp-contentcore': [],
  'mcp-kokorotts': ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'],
  'mcp-artifacts': ['ARTIFACTS_MMO_TOKEN'],
  // Modern React website generation MCPs
  'mcp-21st-magic': ['TWENTY_FIRST_API_KEY'],
  'mcp-shadcn': [], // No API key needed - uses GitHub public API
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, mcpServerId } = await req.json();

    if (!userId || !mcpServerId) {
      return new Response(
        JSON.stringify({ error: 'userId and mcpServerId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is super admin - they bypass ALL subscription checks
    const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', { _user_id: userId });
    
    if (isSuperAdmin) {
      console.log(`[get-mcp-credentials] Super Admin detected - bypassing subscription check for user ${userId}`);
      // Super admin uses admin API keys directly
      const requiredKeys = MCP_KEY_MAPPING[mcpServerId] || [];
      
      if (requiredKeys.length === 0) {
        return new Response(
          JSON.stringify({ success: true, credentials: {}, source: 'super_admin' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const credentials: Record<string, string> = {};
      for (const keyName of requiredKeys) {
        const { data: adminKey } = await supabase
          .from('admin_api_keys')
          .select('encrypted_value')
          .eq('key_name', keyName)
          .eq('is_configured', true)
          .single();

        if (adminKey?.encrypted_value) {
          credentials[keyName] = adminKey.encrypted_value;
        }
      }
      
      const missingKeys = requiredKeys.filter(key => !credentials[key]);
      if (missingKeys.length > 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Missing admin API keys',
            missingKeys,
            source: 'super_admin',
            message: 'Please configure these API keys in the Super Admin dashboard.'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: true, credentials, source: 'super_admin', tier: 'super_admin' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's subscription tier for non-super-admin users
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_status')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has active subscription
    if (profile.subscription_status !== 'active' && profile.subscription_status !== 'trial') {
      return new Response(
        JSON.stringify({ error: 'Active subscription required', subscriptionStatus: profile.subscription_status }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requiredKeys = MCP_KEY_MAPPING[mcpServerId] || [];
    const credentials: Record<string, string> = {};
    let source = 'none';

    if (requiredKeys.length === 0) {
      // No API keys needed for this MCP
      return new Response(
        JSON.stringify({ 
          success: true, 
          credentials: {}, 
          source: 'none',
          message: 'No API keys required for this MCP server'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DFY Plan: Use admin API keys
    if (profile.subscription_tier === 'dfy') {
      source = 'admin';
      
      for (const keyName of requiredKeys) {
        const { data: adminKey } = await supabase
          .from('admin_api_keys')
          .select('encrypted_value')
          .eq('key_name', keyName)
          .eq('is_configured', true)
          .single();

        if (adminKey?.encrypted_value) {
          credentials[keyName] = adminKey.encrypted_value;
        }
      }
    } 
    // DIY Plan: Use user's own API keys
    else {
      source = 'user';
      
      for (const keyName of requiredKeys) {
        const { data: userKey } = await supabase
          .from('user_api_keys')
          .select('encrypted_value')
          .eq('user_id', userId)
          .eq('key_name', keyName)
          .eq('is_configured', true)
          .single();

        if (userKey?.encrypted_value) {
          credentials[keyName] = userKey.encrypted_value;
        }
      }
    }

    // Check if all required keys are present
    const missingKeys = requiredKeys.filter(key => !credentials[key]);
    
    if (missingKeys.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing API keys',
          missingKeys,
          source,
          tier: profile.subscription_tier,
          message: profile.subscription_tier === 'dfy' 
            ? 'Admin has not configured required API keys. Please contact support.'
            : 'Please configure your API keys in the dashboard.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[get-mcp-credentials] Successfully retrieved ${Object.keys(credentials).length} keys for ${mcpServerId} from ${source} (tier: ${profile.subscription_tier})`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        credentials, 
        source,
        tier: profile.subscription_tier
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-mcp-credentials:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
