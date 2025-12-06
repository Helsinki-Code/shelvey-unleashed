import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CLOUDFLARE_API_URL = 'https://api.cloudflare.com/client/v4';
const SHELVEY_DOMAIN = 'shelvey.pro';

interface DeployRequest {
  websiteId: string;
  subdomain: string; // e.g., "ecoglow" for ecoglow.shelvey.pro
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Cloudflare credentials from environment
    const cfApiToken = Deno.env.get('CLOUDFLARE_API_TOKEN');
    const cfZoneId = Deno.env.get('CLOUDFLARE_ZONE_ID');
    const cfAccountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');

    if (!cfApiToken || !cfZoneId) {
      console.error('[deploy-to-subdomain] Missing Cloudflare credentials');
      return new Response(
        JSON.stringify({ success: false, error: 'Cloudflare credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { websiteId, subdomain }: DeployRequest = await req.json();

    // Sanitize subdomain (lowercase, alphanumeric and hyphens only)
    const sanitizedSubdomain = subdomain
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (!sanitizedSubdomain || sanitizedSubdomain.length < 3) {
      return new Response(
        JSON.stringify({ success: false, error: 'Subdomain must be at least 3 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fullDomain = `${sanitizedSubdomain}.${SHELVEY_DOMAIN}`;
    console.log(`[deploy-to-subdomain] Deploying to: ${fullDomain}`);

    // Fetch the website content
    const { data: website, error: websiteError } = await supabase
      .from('generated_websites')
      .select('*')
      .eq('id', websiteId)
      .eq('user_id', user.id)
      .single();

    if (websiteError || !website) {
      return new Response(
        JSON.stringify({ success: false, error: 'Website not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Check if subdomain DNS record already exists
    const existingRecords = await cloudflareRequest(cfApiToken, 
      `${CLOUDFLARE_API_URL}/zones/${cfZoneId}/dns_records?name=${fullDomain}`
    );

    let dnsRecordId = null;

    if (existingRecords.result && existingRecords.result.length > 0) {
      // Check if it belongs to another user
      const existingRecord = existingRecords.result[0];
      
      // Check our database if this subdomain is taken by another user
      const { data: existingHosting } = await supabase
        .from('website_hosting')
        .select('user_id')
        .eq('subdomain', sanitizedSubdomain)
        .neq('user_id', user.id)
        .single();

      if (existingHosting) {
        return new Response(
          JSON.stringify({ success: false, error: 'Subdomain already taken by another user' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      dnsRecordId = existingRecord.id;
      console.log(`[deploy-to-subdomain] DNS record exists: ${dnsRecordId}`);
    } else {
      // Step 2: Create DNS record pointing to Cloudflare Pages or Workers
      // Using CNAME to point to Cloudflare Pages project
      const pagesProjectDomain = `shelvey-sites.pages.dev`; // Your Cloudflare Pages project
      
      const dnsRecord = await cloudflareRequest(cfApiToken,
        `${CLOUDFLARE_API_URL}/zones/${cfZoneId}/dns_records`,
        'POST',
        {
          type: 'CNAME',
          name: sanitizedSubdomain,
          content: pagesProjectDomain,
          ttl: 1, // Auto TTL
          proxied: true, // Enable Cloudflare proxy for SSL
        }
      );

      if (!dnsRecord.success) {
        console.error('[deploy-to-subdomain] DNS creation failed:', dnsRecord.errors);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create DNS record', details: dnsRecord.errors }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      dnsRecordId = dnsRecord.result.id;
      console.log(`[deploy-to-subdomain] DNS record created: ${dnsRecordId}`);
    }

    // Step 3: Deploy website content to Cloudflare KV or R2 for serving
    // For now, we'll store the content and serve via a Worker
    if (cfAccountId) {
      // Upload HTML content to R2 or KV
      await uploadToCloudflareStorage(cfApiToken, cfAccountId, sanitizedSubdomain, website.html_content);
    }

    // Step 4: Save hosting record to database
    const { data: hosting, error: hostingError } = await supabase
      .from('website_hosting')
      .upsert({
        website_id: websiteId,
        user_id: user.id,
        domain: fullDomain,
        subdomain: sanitizedSubdomain,
        hosting_type: 'subdomain',
        dns_verified: true,
        ssl_provisioned: true, // Cloudflare proxy provides automatic SSL
        a_record: null,
        cname_record: `shelvey-sites.pages.dev`,
        verification_code: dnsRecordId,
      }, {
        onConflict: 'website_id',
      })
      .select()
      .single();

    if (hostingError) {
      console.error('[deploy-to-subdomain] Hosting record error:', hostingError);
    }

    // Step 5: Update website status
    await supabase
      .from('generated_websites')
      .update({
        status: 'deployed',
        deployed_url: `https://${fullDomain}`,
        hosting_type: 'subdomain',
        domain_name: fullDomain,
      })
      .eq('id', websiteId);

    // Log activity
    await supabase.from('user_agent_activity').insert({
      user_id: user.id,
      agent_id: 'hosting-agent',
      agent_name: 'Hosting Agent',
      action: `Deployed website to ${fullDomain}`,
      status: 'completed',
      metadata: {
        websiteId,
        subdomain: sanitizedSubdomain,
        fullDomain,
        dnsRecordId,
      },
    });

    console.log(`[deploy-to-subdomain] Successfully deployed to: https://${fullDomain}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          url: `https://${fullDomain}`,
          subdomain: sanitizedSubdomain,
          domain: fullDomain,
          dnsRecordId,
          sslEnabled: true,
          hosting,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[deploy-to-subdomain] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function cloudflareRequest(apiToken: string, url: string, method = 'GET', body?: any) {
  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return await response.json();
}

async function uploadToCloudflareStorage(apiToken: string, accountId: string, subdomain: string, htmlContent: string) {
  // Upload to Cloudflare KV namespace for website storage
  // This requires a KV namespace to be set up: SHELVEY_WEBSITES_KV
  
  const kvNamespaceId = Deno.env.get('CLOUDFLARE_KV_NAMESPACE_ID');
  
  if (!kvNamespaceId) {
    console.log('[deploy-to-subdomain] KV namespace not configured, skipping storage upload');
    return;
  }

  try {
    const response = await fetch(
      `${CLOUDFLARE_API_URL}/accounts/${accountId}/storage/kv/namespaces/${kvNamespaceId}/values/${subdomain}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'text/html',
        },
        body: htmlContent,
      }
    );

    const result = await response.json();
    console.log(`[deploy-to-subdomain] KV upload result:`, result.success);
    return result;
  } catch (error) {
    console.error('[deploy-to-subdomain] KV upload error:', error);
  }
}
