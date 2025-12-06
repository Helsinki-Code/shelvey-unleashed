import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ComputerUseTask {
  taskId: string;
  userId: string;
  agentId: string;
  objective: string;
  startUrl?: string;
  maxSteps?: number;
  actions?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, task } = await req.json() as { action: string; task: ComputerUseTask };

    console.log(`Computer Use Agent - Action: ${action}`, task);

    switch (action) {
      case 'start_session': {
        // Initialize a browser automation session
        const sessionId = crypto.randomUUID();
        
        // Get BrightData credentials for browser automation
        const credResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/get-mcp-credentials`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              userId: task.userId,
              mcpServerId: 'mcp-brightdata',
            }),
          }
        );

        const credentials = await credResponse.json();
        
        if (!credentials.success) {
          return new Response(JSON.stringify({
            success: false,
            error: 'BrightData credentials not configured',
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Log session start
        await supabase.from('agent_activity_logs').insert({
          agent_id: task.agentId,
          agent_name: 'Computer Use Agent',
          action: 'browser_session_started',
          status: 'active',
          metadata: {
            session_id: sessionId,
            objective: task.objective,
            start_url: task.startUrl,
          },
        });

        return new Response(JSON.stringify({
          success: true,
          sessionId,
          message: 'Browser automation session initialized',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'execute_step': {
        // Execute a browser action step
        const { sessionId, stepAction, selector, value, url } = await req.json();
        
        // Route through BrightData for browser automation
        const brightdataResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/mcp-brightdata`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              tool: stepAction === 'screenshot' ? 'take_screenshot' : 
                    stepAction === 'navigate' ? 'scrape_url' :
                    stepAction === 'extract' ? 'get_page_content' : 'navigate_page',
              arguments: {
                url: url,
                actions: stepAction === 'click' ? [{ type: 'click', selector }] :
                         stepAction === 'type' ? [{ type: 'type', selector, text: value }] :
                         stepAction === 'scroll' ? [{ type: 'scroll', direction: value }] : [],
              },
              credentials: { BRIGHTDATA_API_KEY: Deno.env.get('BRIGHTDATA_API_KEY') },
            }),
          }
        );

        const result = await brightdataResponse.json();

        // Log the step
        await supabase.from('agent_activity_logs').insert({
          agent_id: task.agentId,
          agent_name: 'Computer Use Agent',
          action: `browser_${stepAction}`,
          status: result.success ? 'completed' : 'failed',
          metadata: {
            session_id: sessionId,
            step_action: stepAction,
            selector,
            result: result.data,
          },
        });

        return new Response(JSON.stringify({
          success: result.success,
          data: result.data,
          screenshot: result.data?.screenshot,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'analyze_screen': {
        // Use AI to analyze screenshot and determine next action
        const { screenshot, objective, currentUrl, previousActions } = await req.json();

        const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
        
        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are a browser automation agent. Analyze the current screen state and determine the next action to achieve the objective.

Available actions:
- click(selector): Click an element
- type(selector, text): Type text into an input
- scroll(direction): Scroll up/down/left/right
- navigate(url): Navigate to a URL
- screenshot(): Take a screenshot
- extract(selector): Extract text content
- done(): Task completed

Return a JSON object with:
{
  "action": "action_name",
  "selector": "CSS selector if needed",
  "value": "value if needed",
  "reasoning": "why this action"
}`
              },
              {
                role: 'user',
                content: `Objective: ${objective}
Current URL: ${currentUrl}
Previous actions: ${JSON.stringify(previousActions || [])}
${screenshot ? 'Screenshot attached - analyze the page layout.' : 'No screenshot available.'}

What is the next action to take?`
              }
            ],
          }),
        });

        const aiResult = await aiResponse.json();
        const nextAction = aiResult.choices?.[0]?.message?.content;

        return new Response(JSON.stringify({
          success: true,
          nextAction: JSON.parse(nextAction || '{"action": "done", "reasoning": "Unable to determine next action"}'),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'run_automated_task': {
        // Full automated browser task execution
        const maxSteps = task.maxSteps || 20;
        const actions: any[] = [];
        let currentUrl = task.startUrl || 'https://google.com';
        let completed = false;

        for (let step = 0; step < maxSteps && !completed; step++) {
          // Take screenshot
          const screenshotResponse = await fetch(
            `${Deno.env.get('SUPABASE_URL')}/functions/v1/mcp-brightdata`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              },
              body: JSON.stringify({
                tool: 'take_screenshot',
                arguments: { url: currentUrl },
                credentials: { BRIGHTDATA_API_KEY: Deno.env.get('BRIGHTDATA_API_KEY') },
              }),
            }
          );

          const screenshotResult = await screenshotResponse.json();

          // Analyze and get next action
          const analyzeResponse = await fetch(req.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': req.headers.get('Authorization') || '',
            },
            body: JSON.stringify({
              action: 'analyze_screen',
              screenshot: screenshotResult.data?.screenshot,
              objective: task.objective,
              currentUrl,
              previousActions: actions,
            }),
          });

          const analyzeResult = await analyzeResponse.json();
          const nextAction = analyzeResult.nextAction;

          if (nextAction.action === 'done') {
            completed = true;
            break;
          }

          actions.push({
            step,
            ...nextAction,
            screenshot: screenshotResult.data?.screenshot,
            timestamp: new Date().toISOString(),
          });

          // Execute the action
          if (nextAction.action === 'navigate') {
            currentUrl = nextAction.value;
          }

          // Brief delay between actions
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Log completion
        await supabase.from('agent_activity_logs').insert({
          agent_id: task.agentId,
          agent_name: 'Computer Use Agent',
          action: 'automated_task_completed',
          status: completed ? 'completed' : 'max_steps_reached',
          metadata: {
            objective: task.objective,
            steps_taken: actions.length,
            final_url: currentUrl,
          },
        });

        return new Response(JSON.stringify({
          success: true,
          completed,
          actions,
          finalUrl: currentUrl,
          stepsTaken: actions.length,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({
          success: false,
          error: `Unknown action: ${action}`,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Computer Use Agent error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
