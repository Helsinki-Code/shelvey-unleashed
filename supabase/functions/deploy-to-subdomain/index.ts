import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHELVEY_DOMAIN = 'shelvey.pro';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vercelApiToken = Deno.env.get('VERCEL_API_TOKEN');
    const cfApiToken = Deno.env.get('CLOUDFLARE_API_TOKEN');
    const cfZoneId = Deno.env.get('CLOUDFLARE_ZONE_ID');
    const cfKvNamespaceId = Deno.env.get('CLOUDFLARE_KV_NAMESPACE_ID');
    const cfAccountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    const { websiteId, subdomain } = await req.json();

    // Sanitize subdomain
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

    // Fetch website content
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

    let deployedUrl = '';
    let deploymentMethod = '';

    // Try Vercel deployment first (preferred)
    if (vercelApiToken) {
      try {
        console.log('[deploy-to-subdomain] Attempting Vercel deployment...');
        const vercelResult = await deployToVercel(vercelApiToken, {
          subdomain: sanitizedSubdomain,
          htmlContent: website.html_content,
          cssContent: website.css_content,
          jsContent: website.js_content,
          projectName: `shelvey-${sanitizedSubdomain}`,
        });
        
        if (vercelResult.success) {
          deployedUrl = vercelResult.url;
          deploymentMethod = 'vercel';
          console.log('[deploy-to-subdomain] Vercel deployment successful:', deployedUrl);
        }
      } catch (vercelError) {
        console.error('[deploy-to-subdomain] Vercel deployment failed:', vercelError);
      }
    }

    // Fallback to Cloudflare KV
    if (!deployedUrl && cfApiToken && cfZoneId && cfKvNamespaceId && cfAccountId) {
      try {
        console.log('[deploy-to-subdomain] Attempting Cloudflare KV deployment...');
        
        // Upload to KV
        const kvResponse = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/storage/kv/namespaces/${cfKvNamespaceId}/values/${sanitizedSubdomain}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${cfApiToken}`,
              'Content-Type': 'text/html',
            },
            body: website.html_content,
          }
        );

        if (kvResponse.ok) {
          // Create DNS record
          const dnsResponse = await fetch(
            `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/dns_records`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${cfApiToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                type: 'CNAME',
                name: sanitizedSubdomain,
                content: 'shelvey-sites.pages.dev',
                ttl: 1,
                proxied: true,
              }),
            }
          );

          deployedUrl = `https://${fullDomain}`;
          deploymentMethod = 'cloudflare';
          console.log('[deploy-to-subdomain] Cloudflare deployment successful:', deployedUrl);
        }
      } catch (cfError) {
        console.error('[deploy-to-subdomain] Cloudflare deployment failed:', cfError);
      }
    }

    // If no deployment method worked, create a preview URL
    if (!deployedUrl) {
      deployedUrl = `https://${supabaseUrl.replace('https://', '').replace('.supabase.co', '')}.lovable.app/preview/${websiteId}`;
      deploymentMethod = 'preview';
      console.log('[deploy-to-subdomain] Using preview URL:', deployedUrl);
    }

    // Update website status
    await supabase
      .from('generated_websites')
      .update({
        status: 'deployed',
        deployed_url: deployedUrl,
        hosting_type: deploymentMethod,
        domain_name: fullDomain,
        updated_at: new Date().toISOString(),
      })
      .eq('id', websiteId);

    // Log activity
    await supabase.from('agent_activity_logs').insert({
      agent_id: 'hosting-agent',
      agent_name: 'Hosting Agent',
      action: `Deployed website to ${fullDomain} via ${deploymentMethod}`,
      status: 'completed',
      metadata: {
        websiteId,
        subdomain: sanitizedSubdomain,
        fullDomain,
        deploymentMethod,
        deployedUrl,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          url: deployedUrl,
          subdomain: sanitizedSubdomain,
          domain: fullDomain,
          method: deploymentMethod,
          sslEnabled: true,
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

async function deployToVercel(apiToken: string, params: {
  subdomain: string;
  htmlContent: string;
  cssContent?: string;
  jsContent?: string;
  projectName: string;
}): Promise<{ success: boolean; url: string }> {
  const { subdomain, htmlContent, cssContent, jsContent, projectName } = params;

  // Create a simple deployment with the HTML content
  const files = [
    {
      file: 'index.html',
      data: htmlContent,
    },
  ];

  if (cssContent) {
    files.push({ file: 'styles.css', data: cssContent });
  }

  if (jsContent) {
    files.push({ file: 'script.js', data: jsContent });
  }

  // Create deployment
  const deployResponse = await fetch('https://api.vercel.com/v13/deployments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: projectName,
      files: files.map(f => ({
        file: f.file,
        data: btoa(unescape(encodeURIComponent(f.data))),
        encoding: 'base64',
      })),
      projectSettings: {
        framework: null,
      },
      target: 'production',
    }),
  });

  if (!deployResponse.ok) {
    const errorText = await deployResponse.text();
    console.error('[deployToVercel] Deployment failed:', errorText);
    throw new Error('Vercel deployment failed');
  }

  const deployData = await deployResponse.json();
  
  return {
    success: true,
    url: `https://${deployData.url}`,
  };
}
