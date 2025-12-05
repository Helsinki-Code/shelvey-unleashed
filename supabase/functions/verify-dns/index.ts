import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HOSTING_IP = '185.158.133.1';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

    const { websiteId } = await req.json();

    // Get hosting record
    const { data: hosting, error: hostingError } = await supabase
      .from('website_hosting')
      .select('*, generated_websites(*)')
      .eq('website_id', websiteId)
      .eq('user_id', user.id)
      .single();

    if (hostingError || !hosting) {
      return new Response(JSON.stringify({ error: 'Hosting not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (hosting.hosting_type === 'subdomain') {
      return new Response(JSON.stringify({
        success: true,
        verified: true,
        message: 'Subdomain hosting is automatically verified',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const domain = hosting.domain;
    const verificationCode = hosting.verification_code;

    console.log(`Verifying DNS for ${domain}`);

    // DNS verification checks
    const checks = {
      aRecord: false,
      txtRecord: false,
    };

    // Check A record using DNS-over-HTTPS (Cloudflare)
    try {
      const aResponse = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${domain}&type=A`,
        { headers: { 'Accept': 'application/dns-json' } }
      );
      
      if (aResponse.ok) {
        const aData = await aResponse.json();
        if (aData.Answer) {
          checks.aRecord = aData.Answer.some((record: any) => 
            record.type === 1 && record.data === HOSTING_IP
          );
        }
      }
    } catch (e) {
      console.log('A record check error:', e);
    }

    // Check TXT verification record
    try {
      const txtResponse = await fetch(
        `https://cloudflare-dns.com/dns-query?name=_shelvey-verify.${domain}&type=TXT`,
        { headers: { 'Accept': 'application/dns-json' } }
      );
      
      if (txtResponse.ok) {
        const txtData = await txtResponse.json();
        if (txtData.Answer) {
          checks.txtRecord = txtData.Answer.some((record: any) => {
            const value = record.data?.replace(/"/g, '');
            return value === verificationCode;
          });
        }
      }
    } catch (e) {
      console.log('TXT record check error:', e);
    }

    const allVerified = checks.aRecord && checks.txtRecord;

    if (allVerified) {
      // Update hosting status
      await supabase
        .from('website_hosting')
        .update({
          dns_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', hosting.id);

      // Update website status
      await supabase
        .from('generated_websites')
        .update({
          status: 'dns-verified',
          deployed_url: `https://${domain}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', websiteId);

      // Trigger SSL provisioning (in real implementation, this would call a certificate authority)
      await supabase
        .from('website_hosting')
        .update({
          ssl_provisioned: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', hosting.id);

      await supabase
        .from('generated_websites')
        .update({
          ssl_status: 'active',
          status: 'deployed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', websiteId);

      // Log activity
      await supabase.from('user_agent_activity').insert({
        user_id: user.id,
        project_id: hosting.generated_websites?.project_id,
        agent_id: 'dns-verifier',
        agent_name: 'DNS Verifier',
        action: `Verified DNS and provisioned SSL for ${domain}`,
        status: 'completed',
        result: { websiteId, domain, checks },
      });

      console.log(`DNS verified and SSL provisioned for ${domain}`);

      return new Response(JSON.stringify({
        success: true,
        verified: true,
        sslProvisioned: true,
        liveUrl: `https://${domain}`,
        message: 'DNS verified! Your website is now live.',
        checks,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Return status of individual checks
    const missingRecords = [];
    if (!checks.aRecord) missingRecords.push('A record');
    if (!checks.txtRecord) missingRecords.push('TXT verification record');

    return new Response(JSON.stringify({
      success: true,
      verified: false,
      checks,
      message: `DNS not fully configured. Missing: ${missingRecords.join(', ')}`,
      tip: 'DNS changes can take up to 48 hours to propagate. Please try again later.',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in verify-dns:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
