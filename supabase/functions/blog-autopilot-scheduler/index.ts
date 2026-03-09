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

    console.log('Blog autopilot scheduler running...');

    // Get all active autopilot schedules that are due for execution
    const { data: schedules, error: schedulesError } = await supabase
      .from('blog_autopilot_schedules')
      .select(`
        *,
        blog_projects (
          id, name, niche, platform, status, auto_generated, metadata
        )
      `)
      .eq('enabled', true)
      .lt('next_run', new Date().toISOString());

    if (schedulesError) {
      console.error('Error fetching autopilot schedules:', schedulesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch schedules' }), 
        { status: 500, headers: corsHeaders }
      );
    }

    if (!schedules || schedules.length === 0) {
      console.log('No autopilot schedules due for execution');
      return new Response(
        JSON.stringify({ message: 'No schedules due', processed: 0 }), 
        { status: 200, headers: corsHeaders }
      );
    }

    let processedCount = 0;
    const results = [];

    for (const schedule of schedules) {
      try {
        console.log(`Processing autopilot for project: ${schedule.blog_project_id}`);

        // Determine which phase to execute based on the last run
        let nextPhase = 1; // Default to niche research
        
        if (schedule.last_run) {
          // Simple rotation through phases 1-7
          const hoursSinceLastRun = Math.floor(
            (Date.now() - new Date(schedule.last_run).getTime()) / (1000 * 60 * 60)
          );
          nextPhase = ((Math.floor(hoursSinceLastRun / schedule.frequency_hours)) % 7) + 1;
        }

        // Execute the blog generation for this phase
        const generationResponse = await supabase.functions.invoke('blog-generator', {
          body: {
            projectId: schedule.blog_project_id,
            phase: nextPhase,
            isAutopilot: true,
            userId: schedule.user_id,
            scheduledExecution: true
          }
        });

        if (generationResponse.error) {
          console.error(`Error in blog generation for project ${schedule.blog_project_id}:`, generationResponse.error);
          results.push({
            projectId: schedule.blog_project_id,
            success: false,
            error: generationResponse.error
          });
        } else {
          results.push({
            projectId: schedule.blog_project_id,
            success: true,
            phase: nextPhase,
            data: generationResponse.data
          });
        }

        // Update the schedule for next run
        const nextRunTime = new Date(Date.now() + schedule.frequency_hours * 60 * 60 * 1000);
        
        const { error: updateError } = await supabase
          .from('blog_autopilot_schedules')
          .update({
            last_run: new Date().toISOString(),
            next_run: nextRunTime.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', schedule.id);

        if (updateError) {
          console.error(`Error updating schedule for project ${schedule.blog_project_id}:`, updateError);
        }

        processedCount++;

        // Optional: Trigger social distribution if enabled
        if (schedule.phases_config?.social_distribution && nextPhase >= 6) {
          const socialResponse = await supabase.functions.invoke('social-distribution-executor', {
            body: {
              projectId: schedule.blog_project_id,
              userId: schedule.user_id,
              autopilotMode: true
            }
          });

          if (socialResponse.error) {
            console.error(`Social distribution failed for project ${schedule.blog_project_id}:`, socialResponse.error);
          }
        }

      } catch (error) {
        console.error(`Error processing schedule for project ${schedule.blog_project_id}:`, error);
        results.push({
          projectId: schedule.blog_project_id,
          success: false,
          error: error.message
        });
      }
    }

    console.log(`Blog autopilot scheduler completed. Processed: ${processedCount} projects`);

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: processedCount,
        results: results,
        timestamp: new Date().toISOString()
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Blog autopilot scheduler error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}