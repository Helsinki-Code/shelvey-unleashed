import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeployRequest {
  websiteId: string;
  customDomain?: string;
}

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
        error: 'VERCEL_API_TOKEN not configured',
        message: 'Please add your Vercel API token in settings'
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

    const { websiteId, customDomain }: DeployRequest = await req.json();

    // Get website data
    const { data: website, error: websiteError } = await supabase
      .from('generated_websites')
      .select('*, business_projects(*)')
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

    console.log(`Deploying ${vercelProjectName} to Vercel...`);

    // Create the deployment files
    const htmlContent = website.html_content;
    const cssContent = website.css_content || '';
    const jsContent = website.js_content || '';

    // Create a full HTML file with embedded CSS/JS
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <style>${cssContent}</style>
</head>
<body>
${htmlContent}
<script>${jsContent}</script>
</body>
</html>`;

    // Step 1: Create or get existing project
    let vercelProjectId: string;
    
    // Check if project exists
    const projectCheckResponse = await fetch(
      `https://api.vercel.com/v9/projects/${vercelProjectName}`,
      {
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
        },
      }
    );

    if (projectCheckResponse.ok) {
      const existingProject = await projectCheckResponse.json();
      vercelProjectId = existingProject.id;
      console.log(`Using existing Vercel project: ${vercelProjectId}`);
    } else {
      // Create new project
      const createProjectResponse = await fetch(
        'https://api.vercel.com/v9/projects',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vercelToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: vercelProjectName,
            framework: null,
          }),
        }
      );

      if (!createProjectResponse.ok) {
        const error = await createProjectResponse.text();
        console.error('Failed to create Vercel project:', error);
        return new Response(JSON.stringify({ 
          error: 'Failed to create Vercel project',
          details: error 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const newProject = await createProjectResponse.json();
      vercelProjectId = newProject.id;
      console.log(`Created new Vercel project: ${vercelProjectId}`);
    }

    // Step 2: Create deployment
    const deploymentResponse = await fetch(
      'https://api.vercel.com/v13/deployments',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: vercelProjectName,
          files: [
            {
              file: 'index.html',
              data: btoa(unescape(encodeURIComponent(fullHtml))),
              encoding: 'base64',
            },
          ],
          projectSettings: {
            framework: null,
          },
          target: 'production',
        }),
      }
    );

    if (!deploymentResponse.ok) {
      const error = await deploymentResponse.text();
      console.error('Failed to deploy to Vercel:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to deploy to Vercel',
        details: error 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const deployment = await deploymentResponse.json();
    const deployedUrl = `https://${deployment.url}`;
    const productionUrl = `https://${vercelProjectName}.vercel.app`;

    console.log(`Deployed to Vercel: ${deployedUrl}`);

    // Step 3: Add custom domain if provided
    let customDomainResult = null;
    if (customDomain) {
      const addDomainResponse = await fetch(
        `https://api.vercel.com/v10/projects/${vercelProjectId}/domains`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vercelToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: customDomain,
          }),
        }
      );

      if (addDomainResponse.ok) {
        customDomainResult = await addDomainResponse.json();
        console.log(`Added custom domain: ${customDomain}`);
      } else {
        const domainError = await addDomainResponse.text();
        console.log(`Custom domain note: ${domainError}`);
        // Don't fail the deployment, just note it
        customDomainResult = { 
          warning: 'Domain may already be added or requires DNS configuration',
          details: domainError 
        };
      }
    }

    // Get DNS configuration for custom domain
    let dnsConfig = null;
    if (customDomain) {
      dnsConfig = {
        aRecord: {
          type: 'A',
          name: '@',
          value: '76.76.21.21',
        },
        cnameRecord: {
          type: 'CNAME',
          name: 'www',
          value: 'cname.vercel-dns.com',
        },
      };
    }

    // Update database
    await supabase
      .from('generated_websites')
      .update({
        deployed_url: customDomain ? `https://${customDomain}` : productionUrl,
        hosting_type: 'vercel',
        status: 'deployed',
        custom_domain: customDomain || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', websiteId);

    // Create/update hosting record
    const hostingData = {
      user_id: user.id,
      website_id: websiteId,
      hosting_type: 'vercel',
      domain: customDomain || `${vercelProjectName}.vercel.app`,
      subdomain: vercelProjectName,
      dns_verified: !customDomain, // Auto-verified for Vercel subdomains
      ssl_provisioned: true, // Vercel auto-provisions SSL
      a_record: dnsConfig?.aRecord?.value || null,
      cname_record: dnsConfig?.cnameRecord?.value || null,
    };

    await supabase
      .from('website_hosting')
      .upsert(hostingData, { onConflict: 'website_id' });

    // Log activity
    await supabase.from('user_agent_activity').insert({
      user_id: user.id,
      project_id: website.project_id,
      agent_id: 'vercel-deployer',
      agent_name: 'Vercel Deployer',
      action: `Deployed website to Vercel: ${productionUrl}`,
      status: 'completed',
      result: { 
        websiteId, 
        deploymentId: deployment.id,
        url: productionUrl,
        customDomain,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      deploymentId: deployment.id,
      deploymentUrl: deployedUrl,
      productionUrl,
      projectId: vercelProjectId,
      projectName: vercelProjectName,
      customDomain: customDomain || null,
      customDomainResult,
      dnsConfig,
      message: customDomain 
        ? `Deployed! Configure DNS for ${customDomain} to complete setup.`
        : `Website deployed to ${productionUrl}`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in deploy-to-vercel:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
