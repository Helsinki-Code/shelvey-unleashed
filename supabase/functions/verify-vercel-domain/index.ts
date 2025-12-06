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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vercelToken = Deno.env.get('VERCEL_API_TOKEN');

    if (!vercelToken) {
      return new Response(JSON.stringify({ 
        error: 'VERCEL_API_TOKEN not configured' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const userSupabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { websiteId, domain } = await req.json();

    // Get website and hosting data
    const { data: website, error: websiteError } = await supabase
      .from('generated_websites')
      .select('*, website_hosting(*), business_projects(*)')
      .eq('id', websiteId)
      .eq('user_id', user.id)
      .single();

    if (websiteError || !website) {
      return new Response(JSON.stringify({ error: 'Website not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const projectName = website.business_projects?.name || website.name;
    const sanitizedName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 50);
    const vercelProjectName = `shelvey-${sanitizedName}-${websiteId.slice(0, 8)}`;

    console.log(`Verifying domain ${domain} for project ${vercelProjectName}`);

    // Check domain status on Vercel
    const domainCheckResponse = await fetch(
      `https://api.vercel.com/v9/projects/${vercelProjectName}/domains/${domain}`,
      {
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
        },
      }
    );

    if (!domainCheckResponse.ok) {
      return new Response(JSON.stringify({
        success: false,
        verified: false,
        message: 'Domain not found on Vercel project. Please add it first.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const domainData = await domainCheckResponse.json();
    const isVerified = domainData.verified === true;
    const isConfigured = domainData.configured === true || domainData.verification?.length === 0;

    console.log(`Domain status - verified: ${isVerified}, configured: ${isConfigured}`);

    if (isVerified && isConfigured) {
      // Update database
      await supabase
        .from('website_hosting')
        .update({
          dns_verified: true,
          ssl_provisioned: true,
          updated_at: new Date().toISOString(),
        })
        .eq('website_id', websiteId);

      await supabase
        .from('generated_websites')
        .update({
          deployed_url: `https://${domain}`,
          ssl_status: 'active',
          status: 'deployed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', websiteId);

      return new Response(JSON.stringify({
        success: true,
        verified: true,
        configured: true,
        liveUrl: `https://${domain}`,
        message: 'Domain verified and live!',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Return verification requirements
    const verificationRecords = domainData.verification || [];
    
    return new Response(JSON.stringify({
      success: true,
      verified: isVerified,
      configured: isConfigured,
      verificationRecords,
      dnsConfig: {
        aRecord: {
          type: 'A',
          name: '@',
          value: '76.76.21.21',
          description: 'Points your domain to Vercel',
        },
        cnameRecord: {
          type: 'CNAME', 
          name: 'www',
          value: 'cname.vercel-dns.com',
          description: 'Points www subdomain to Vercel',
        },
      },
      message: isVerified 
        ? 'Domain verified but DNS not fully propagated. Please wait.'
        : 'Please configure DNS records and try again.',
      tip: 'DNS changes can take up to 48 hours to propagate.',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in verify-vercel-domain:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
