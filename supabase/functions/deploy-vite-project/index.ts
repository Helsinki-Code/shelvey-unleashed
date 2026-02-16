import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeployRequest {
  projectId: string;
  projectName: string;
  files: {
    path: string;
    content: string;
    fileType: string;
  }[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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

    const { projectId, projectName, files }: DeployRequest = await req.json();

    if (!files || files.length === 0) {
      return new Response(JSON.stringify({ error: 'No files to deploy' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create a unique project name for Vercel
    const sanitizedName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 40);
    const vercelProjectName = `shelvey-${sanitizedName}-${projectId.slice(0, 8)}`;

    console.log(`Deploying ${vercelProjectName} to Vercel with ${files.length} files...`);

    // Convert files to Vercel deployment format
    const deploymentFiles = files.map(file => ({
      file: file.path,
      data: btoa(unescape(encodeURIComponent(file.content))),
      encoding: 'base64' as const,
    }));

    // Create deployment
    const deployResponse = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: vercelProjectName,
        files: deploymentFiles,
        projectSettings: {
          framework: 'vite',
          buildCommand: 'npm run build',
          outputDirectory: 'dist',
          installCommand: 'npm install',
          devCommand: 'npm run dev',
        },
        target: 'production',
      }),
    });

    if (!deployResponse.ok) {
      const errorText = await deployResponse.text();
      console.error('Vercel deployment error:', errorText);
      throw new Error(`Vercel deployment failed: ${deployResponse.status}`);
    }

    const deployData = await deployResponse.json();
    console.log('Deployment created:', deployData.id);

    // Wait for deployment to be ready (poll status)
    let deploymentStatus = 'BUILDING';
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes max

    while (deploymentStatus === 'BUILDING' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await fetch(`https://api.vercel.com/v13/deployments/${deployData.id}`, {
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
        },
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        deploymentStatus = statusData.readyState;
        console.log(`Deployment status: ${deploymentStatus}`);
        
        if (deploymentStatus === 'READY') {
          break;
        } else if (deploymentStatus === 'ERROR') {
          throw new Error('Deployment failed during build');
        }
      }
      
      attempts++;
    }

    if (deploymentStatus !== 'READY') {
      console.log('Deployment still building, returning preview URL');
    }

    const deploymentUrl = `https://${deployData.url}`;
    const productionUrl = deployData.alias?.[0] ? `https://${deployData.alias[0]}` : deploymentUrl;

    // Update (or create) database row with deployment info
    const supabase = createClient(supabaseUrl, supabaseKey);
    const appFile = files.find((f) => f.path === 'src/App.tsx' || f.path === 'App.tsx');
    const now = new Date().toISOString();

    const { data: existingWebsite } = await supabase
      .from('generated_websites')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingWebsite?.id) {
      await supabase
        .from('generated_websites')
        .update({
          deployed_url: productionUrl,
          status: 'deployed',
          hosting_type: 'vercel',
          updated_at: now,
        })
        .eq('id', existingWebsite.id);
    } else {
      await supabase
        .from('generated_websites')
        .insert({
          project_id: projectId,
          user_id: user.id,
          name: `${projectName} Website`,
          html_content: appFile?.content || '',
          status: 'deployed',
          deployed_url: productionUrl,
          hosting_type: 'vercel',
          created_at: now,
          updated_at: now,
        });
    }

    return new Response(JSON.stringify({
      success: true,
      deploymentId: deployData.id,
      deploymentUrl,
      productionUrl,
      status: deploymentStatus,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Deploy error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Deployment failed' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
