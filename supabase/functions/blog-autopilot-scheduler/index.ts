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

    console.log('Blog autopilot scheduler running...');

    const now = new Date().toISOString();

    // Get all active autopilot schedules that are due for execution
    const { data: schedules, error: schedulesError } = await supabase
      .from('blog_autopilot_schedules')
      .select('*, blog_projects(id, name, niche, platform, status, auto_generated, metadata)')
      .eq('enabled', true)
      .lt('next_run', now);

    if (schedulesError) {
      console.error('Error fetching autopilot schedules:', schedulesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch schedules' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!schedules || schedules.length === 0) {
      console.log('No autopilot schedules due for execution');
      return new Response(
        JSON.stringify({ message: 'No schedules due', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processedCount = 0;
    const results = [];

    for (const schedule of schedules) {
      try {
        console.log(`Processing autopilot for project: ${schedule.blog_project_id}`);

        // Rotate through phases 1-7
        let nextPhase = 1;
        if (schedule.last_run) {
          const hoursSinceLastRun = Math.floor(
            (Date.now() - new Date(schedule.last_run).getTime()) / (1000 * 60 * 60)
          );
          nextPhase = ((Math.floor(hoursSinceLastRun / schedule.frequency_hours)) % 7) + 1;
        }

        // Invoke blog-generator for this phase
        const genRes = await supabase.functions.invoke('blog-generator', {
          body: {
            projectId: schedule.blog_project_id,
            phase: nextPhase,
            isAutopilot: true,
            userId: schedule.user_id,
            scheduledExecution: true,
          },
        });

        results.push({
          projectId: schedule.blog_project_id,
          success: !genRes.error,
          phase: nextPhase,
          error: genRes.error ?? null,
        });

        // Schedule next run
        const nextRun = new Date(Date.now() + schedule.frequency_hours * 60 * 60 * 1000).toISOString();
        await supabase
          .from('blog_autopilot_schedules')
          .update({ last_run: now, next_run: nextRun, updated_at: now })
          .eq('id', schedule.id);

        // Optional: social distribution after phase 6+
        if (schedule.phases_config?.social_distribution && nextPhase >= 6) {
          await supabase.functions.invoke('social-distribution-executor', {
            body: { projectId: schedule.blog_project_id, userId: schedule.user_id, autopilotMode: true },
          });
        }

        processedCount++;
      } catch (err) {
        console.error(`Error processing schedule ${schedule.id}:`, err);
        results.push({ projectId: schedule.blog_project_id, success: false, error: String(err) });
      }
    }

    console.log(`Autopilot scheduler done. Processed: ${processedCount}`);

    return new Response(
      JSON.stringify({ success: true, processed: processedCount, results, timestamp: now }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Blog autopilot scheduler error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});