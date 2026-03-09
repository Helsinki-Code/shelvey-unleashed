import { supabase } from '@/integrations/supabase/client';

export async function POST(request: Request) {
  try {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const { topic, niche, platform, goals, projectId, userId } = await request.json();

    // Step 1: Generate website using existing pipeline
    console.log(`Starting website generation for project: ${projectId}`);
    
    // Call the v0-website-generator function
    const websiteResponse = await supabase.functions.invoke('v0-website-generator', {
      body: {
        businessDescription: `${topic} blog focused on ${niche}`,
        businessName: `${topic} Hub`,
        targetAudience: niche,
        goals: goals || `Build authority in ${topic} space`,
        userId: userId
      }
    });

    if (websiteResponse.error) {
      console.error('Website generation failed:', websiteResponse.error);
      return new Response(
        JSON.stringify({ error: 'Website generation failed' }), 
        { status: 500, headers: corsHeaders }
      );
    }

    const { websiteData } = websiteResponse.data;

    // Step 2: Deploy the website to Vercel
    console.log(`Deploying website for project: ${projectId}`);
    
    const deployResponse = await supabase.functions.invoke('deploy-vite-project', {
      body: {
        projectName: `${topic.toLowerCase().replace(/\s+/g, '-')}-blog`,
        pages: websiteData.pages,
        businessData: websiteData.businessData,
        userId: userId
      }
    });

    if (deployResponse.error) {
      console.error('Website deployment failed:', deployResponse.error);
      return new Response(
        JSON.stringify({ error: 'Website deployment failed' }), 
        { status: 500, headers: corsHeaders }
      );
    }

    const { url: websiteUrl } = deployResponse.data;

    // Step 3: Update blog project with website URL
    const { error: updateError } = await supabase
      .from('blog_projects')
      .update({ 
        website_url: websiteUrl,
        status: 'active',
        metadata: {
          topic,
          niche,
          platform,
          goals,
          website_deployed_at: new Date().toISOString(),
          auto_build_completed: true
        }
      })
      .eq('id', projectId);

    if (updateError) {
      console.error('Failed to update blog project:', updateError);
    }

    // Step 4: Initialize content strategy
    console.log(`Initializing content strategy for project: ${projectId}`);
    
    const strategyResponse = await supabase.functions.invoke('content-strategy-generator', {
      body: {
        niche: niche,
        topic: topic,
        targetAudience: niche,
        platform: platform,
        goals: goals,
        projectId: projectId,
        userId: userId
      }
    });

    let contentStrategy = null;
    if (!strategyResponse.error) {
      contentStrategy = strategyResponse.data;
    }

    // Step 5: Start first autopilot cycle
    console.log(`Starting autopilot cycle for project: ${projectId}`);
    
    const autopilotResponse = await supabase.functions.invoke('blog-generator', {
      body: {
        projectId: projectId,
        phase: 1, // Start with niche research
        isAutopilot: true,
        userId: userId
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        websiteUrl: websiteUrl,
        projectId: projectId,
        contentStrategy: contentStrategy,
        autopilotStarted: !autopilotResponse.error
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Blog website builder error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}