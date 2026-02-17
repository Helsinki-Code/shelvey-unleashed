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

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const toBase64Utf8 = (input: string) => {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const vercelToken = Deno.env.get('VERCEL_API_TOKEN') || Deno.env.get('VERCEL_TOKEN');
    if (!vercelToken) {
      return jsonResponse({ 
        error: 'VERCEL_API_TOKEN not configured',
        message: 'Please add your Vercel API token in settings'
      }, 400);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      return jsonResponse({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }, 500);
    }
    const userSupabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    let payload: DeployRequest;
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON request body' }, 400);
    }

    const { projectId, projectName, files } = payload;

    if (!projectId || !projectName) {
      return jsonResponse({ error: 'projectId and projectName are required' }, 400);
    }

    if (!Array.isArray(files) || files.length === 0) {
      return jsonResponse({ error: 'No files to deploy' }, 400);
    }

    // Create a unique project name for Vercel
    const sanitizedName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 40);
    const vercelProjectName = `shelvey-${sanitizedName}-${projectId.slice(0, 8)}`;

    console.log(`Deploying ${vercelProjectName} to Vercel with ${files.length} files...`);

    // Convert files to Vercel deployment format
    const deploymentFiles = files.map(file => ({
      file: file.path,
      data: toBase64Utf8(file.content),
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
      return jsonResponse(
        {
          error: `Vercel deployment failed: ${deployResponse.status}`,
          details: errorText,
          statusCode: deployResponse.status,
        },
        502,
      );
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
          return jsonResponse(
            {
              error: 'Deployment failed during build',
              deploymentId: deployData.id,
            },
            502,
          );
        }
      }
      
      attempts++;
    }

    if (deploymentStatus !== 'READY') {
      console.log('Deployment still building, returning preview URL');
    }

    const deploymentUrl = `https://${deployData.url}`;
    const productionUrl = deployData.alias?.[0] ? `https://${deployData.alias[0]}` : deploymentUrl;

    // Update (or create) database row with deployment info (non-fatal if DB write fails)
    const supabase = createClient(supabaseUrl, supabaseKey);
    try {
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
    } catch (dbError) {
      console.error('Deployment succeeded but DB update failed:', dbError);
    }

    return jsonResponse({
      success: true,
      deploymentId: deployData.id,
      deploymentUrl,
      productionUrl,
      status: deploymentStatus,
    });

  } catch (error) {
    console.error('Deploy error:', error);
    return jsonResponse({
      error: error instanceof Error ? error.message : 'Deployment failed',
    }, 500);
  }
});
