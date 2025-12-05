import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHELVEY_DOMAIN = 'shelvey.pro';
const HOSTING_IP = '185.158.133.1';

function sanitizeSubdomain(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 63);
}

function generateVerificationCode(): string {
  return `shelvey-verify-${crypto.randomUUID().substring(0, 8)}`;
}

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

    const { websiteId, hostingType, customDomain } = await req.json();

    // Get website
    const { data: website, error: websiteError } = await supabase
      .from('generated_websites')
      .select('*')
      .eq('id', websiteId)
      .eq('user_id', user.id)
      .single();

    if (websiteError || !website) {
      return new Response(JSON.stringify({ error: 'Website not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if website is approved
    if (!website.ceo_approved || !website.user_approved) {
      return new Response(JSON.stringify({ 
        error: 'Website must be approved by both CEO and user before hosting' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let hostingConfig: any = {};

    if (hostingType === 'subdomain') {
      // Generate subdomain
      const subdomain = sanitizeSubdomain(website.name);
      const fullDomain = `${subdomain}.${SHELVEY_DOMAIN}`;

      // Check if subdomain is available
      const { data: existingHosting } = await supabase
        .from('website_hosting')
        .select('id')
        .eq('subdomain', subdomain)
        .neq('website_id', websiteId)
        .single();

      if (existingHosting) {
        // Add random suffix if taken
        const uniqueSubdomain = `${subdomain}-${Date.now().toString(36)}`;
        hostingConfig = {
          hosting_type: 'subdomain',
          domain: `${uniqueSubdomain}.${SHELVEY_DOMAIN}`,
          subdomain: uniqueSubdomain,
          dns_verified: true,
          ssl_provisioned: true,
          a_record: HOSTING_IP,
        };
      } else {
        hostingConfig = {
          hosting_type: 'subdomain',
          domain: fullDomain,
          subdomain,
          dns_verified: true,
          ssl_provisioned: true,
          a_record: HOSTING_IP,
        };
      }
    } else if (hostingType === 'custom') {
      if (!customDomain) {
        return new Response(JSON.stringify({ error: 'Custom domain is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const verificationCode = generateVerificationCode();
      
      hostingConfig = {
        hosting_type: 'custom',
        domain: customDomain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, ''),
        dns_verified: false,
        ssl_provisioned: false,
        a_record: HOSTING_IP,
        cname_record: `${sanitizeSubdomain(website.name)}.${SHELVEY_DOMAIN}`,
        txt_verification: `_shelvey-verify.${customDomain}`,
        verification_code: verificationCode,
      };
    } else {
      return new Response(JSON.stringify({ error: 'Invalid hosting type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Upsert hosting record
    const { data: hosting, error: hostingError } = await supabase
      .from('website_hosting')
      .upsert({
        website_id: websiteId,
        user_id: user.id,
        ...hostingConfig,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'website_id',
      })
      .select()
      .single();

    if (hostingError) throw hostingError;

    // Update website with hosting info
    const { error: updateError } = await supabase
      .from('generated_websites')
      .update({
        hosting_type: hostingType,
        custom_domain: hostingType === 'custom' ? customDomain : null,
        deployed_url: hostingType === 'subdomain' ? `https://${hostingConfig.domain}` : null,
        domain_name: hostingConfig.domain,
        dns_records: {
          a_record: { type: 'A', name: '@', value: HOSTING_IP },
          cname_record: hostingType === 'custom' ? { 
            type: 'CNAME', 
            name: 'www', 
            value: hostingConfig.cname_record 
          } : null,
          txt_record: hostingType === 'custom' ? { 
            type: 'TXT', 
            name: hostingConfig.txt_verification?.replace(`.${customDomain}`, ''), 
            value: hostingConfig.verification_code 
          } : null,
        },
        ssl_status: hostingType === 'subdomain' ? 'active' : 'pending',
        status: hostingType === 'subdomain' ? 'deployed' : 'pending-dns',
        updated_at: new Date().toISOString(),
      })
      .eq('id', websiteId);

    if (updateError) throw updateError;

    // Log activity
    await supabase.from('user_agent_activity').insert({
      user_id: user.id,
      project_id: website.project_id,
      agent_id: 'hosting-setup',
      agent_name: 'Hosting Setup',
      action: `Set up ${hostingType} hosting for ${website.name}`,
      status: 'completed',
      result: { 
        websiteId, 
        hostingType, 
        domain: hostingConfig.domain,
      },
    });

    // Build response with DNS instructions for custom domains
    const response: any = {
      success: true,
      hosting,
      domain: hostingConfig.domain,
      isLive: hostingType === 'subdomain',
    };

    if (hostingType === 'custom') {
      response.dnsRecords = [
        {
          type: 'A',
          name: '@',
          value: HOSTING_IP,
          description: 'Points your root domain to ShelVey servers',
        },
        {
          type: 'A',
          name: 'www',
          value: HOSTING_IP,
          description: 'Points www subdomain to ShelVey servers',
        },
        {
          type: 'TXT',
          name: '_shelvey-verify',
          value: hostingConfig.verification_code,
          description: 'Verifies domain ownership',
        },
      ];
      response.instructions = `
1. Log in to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)
2. Navigate to DNS settings for ${customDomain}
3. Add the following DNS records:
   - A Record: @ → ${HOSTING_IP}
   - A Record: www → ${HOSTING_IP}
   - TXT Record: _shelvey-verify → ${hostingConfig.verification_code}
4. Wait for DNS propagation (can take up to 48 hours)
5. Click "Verify DNS" once records are configured
`;
    }

    if (hostingType === 'subdomain') {
      response.liveUrl = `https://${hostingConfig.domain}`;
    }

    console.log(`Hosting configured for website ${websiteId}: ${hostingConfig.domain}`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in setup-hosting:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
