import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { topic, niche, platform, goals, projectId, userId } = await req.json();

    console.log(`Starting auto-build for project: ${projectId}, topic: ${topic}`);

    // Step 1: Generate website using existing v0 pipeline
    const websiteRes = await supabase.functions.invoke('v0-website-generator', {
      body: {
        businessDescription: `${topic} blog focused on ${niche}`,
        businessName: `${topic} Hub`,
        targetAudience: niche,
        goals: goals || `Build authority in ${topic} space`,
        userId,
      },
    });

    if (websiteRes.error) {
      console.error('Website generation failed:', websiteRes.error);
      return new Response(
        JSON.stringify({ error: 'Website generation failed', details: websiteRes.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const websiteData = websiteRes.data;

    // Step 2: Deploy the website to Vercel
    const deployRes = await supabase.functions.invoke('deploy-vite-project', {
      body: {
        projectName: `${topic.toLowerCase().replace(/\s+/g, '-')}-blog`,
        pages: websiteData?.pages ?? [],
        businessData: websiteData?.businessData ?? {},
        userId,
      },
    });

    const websiteUrl = deployRes.data?.url ?? null;

    // Step 3: Update blog project with deployed website URL
    await supabase
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
          auto_build_completed: true,
        },
      })
      .eq('id', projectId);

    // Step 4: Generate initial content strategy
    const strategyRes = await supabase.functions.invoke('content-strategy-generator', {
      body: { niche, topic, targetAudience: niche, platform, goals, projectId, userId },
    });

    // Step 5: Start first autopilot cycle (phase 1 – niche research)
    const autopilotRes = await supabase.functions.invoke('blog-generator', {
      body: { projectId, phase: 1, isAutopilot: true, userId },
    });

    return new Response(
      JSON.stringify({
        success: true,
        websiteUrl,
        projectId,
        contentStrategy: strategyRes.data ?? null,
        autopilotStarted: !autopilotRes.error,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Blog website builder error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});