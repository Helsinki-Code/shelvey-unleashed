import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  projectId: string;
  phaseId: string;
  project: {
    name: string;
    industry: string;
    description: string;
  };
  phase1Data?: any;
  phase2Data?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const openaiKey = Deno.env.get('OPENAI_API_KEY');

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Helper to send SSE
  const sendSSE = (controller: ReadableStreamDefaultController, type: string, data: any) => {
    const message = `data: ${JSON.stringify({ type, ...data })}\n\n`;
    controller.enqueue(new TextEncoder().encode(message));
  };

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    const body: RequestBody = await req.json();
    const { projectId, phaseId, project, phase1Data, phase2Data } = body;

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          sendSSE(controller, 'progress', { progress: 5, message: 'Analyzing Phase 1 & 2 deliverables...' });

          // Build context from approved deliverables
          let context = `Business: ${project.name}\nIndustry: ${project.industry}\nDescription: ${project.description}\n\n`;
          
          if (phase1Data) {
            context += `MARKET RESEARCH:\n`;
            if (phase1Data.targetAudience) context += `Target Audience: ${JSON.stringify(phase1Data.targetAudience)}\n`;
            if (phase1Data.competitors) context += `Competitors: ${JSON.stringify(phase1Data.competitors)}\n`;
            if (phase1Data.uniqueValue) context += `Unique Value: ${phase1Data.uniqueValue}\n`;
          }

          if (phase2Data) {
            context += `\nBRAND ASSETS:\n`;
            if (phase2Data.colors) context += `Colors: ${JSON.stringify(phase2Data.colors)}\n`;
            if (phase2Data.typography) context += `Typography: ${JSON.stringify(phase2Data.typography)}\n`;
            if (phase2Data.brandVoice) context += `Brand Voice: ${phase2Data.brandVoice}\n`;
          }

          sendSSE(controller, 'progress', { progress: 15, message: 'Building comprehensive website blueprint...' });

          const systemPrompt = `You are an expert website architect and UX copywriter. Based on the business context and approved branding, generate comprehensive website specifications.

Your output must be a valid JSON object with this structure:
{
  "pages": [
    { "name": "Home", "route": "/", "sections": ["Hero", "Features", "About", "Testimonials", "CTA", "Footer"], "description": "Main landing page..." }
  ],
  "globalStyles": {
    "primaryColor": "#hex",
    "secondaryColor": "#hex", 
    "accentColor": "#hex",
    "headingFont": "Font Name",
    "bodyFont": "Font Name",
    "borderRadius": "rounded-lg",
    "spacing": "comfortable"
  },
  "components": [
    { "name": "HeroSection", "type": "hero", "props": {}, "description": "..." }
  ],
  "copyContent": {
    "hero": { "headline": "...", "subheadline": "...", "cta": "Get Started" },
    "features": { "title": "...", "items": [{ "title": "...", "description": "..." }] },
    "about": { "title": "...", "content": "..." },
    "testimonials": { "title": "...", "items": [{ "quote": "...", "author": "...", "role": "..." }] },
    "cta": { "title": "...", "description": "...", "buttonText": "..." },
    "footer": { "tagline": "...", "copyright": "..." }
  },
  "animations": [
    { "element": "hero", "type": "fade-in", "trigger": "on-load" }
  ],
  "responsive": {
    "mobileFirst": true,
    "breakpoints": [{ "name": "sm", "width": "640px" }, { "name": "md", "width": "768px" }, { "name": "lg", "width": "1024px" }],
    "mobileNav": "hamburger"
  }
}

Guidelines:
1. Make the website UNIQUE, MODERN, and ATTRACTIVE
2. Use the brand colors and typography from Phase 2
3. Write compelling, conversion-focused copy
4. Design for mobile-first responsive experience
5. Include smooth animations and micro-interactions
6. Create a clear user journey from landing to conversion
7. Ensure all copy matches the brand voice
8. Include social proof elements (testimonials)
9. Design accessible and SEO-friendly structure

IMPORTANT: Output ONLY the JSON object, no markdown code blocks or explanations.`;

          sendSSE(controller, 'progress', { progress: 25, message: 'Generating page structure...' });

          if (!openaiKey) {
            throw new Error('OpenAI API key not configured');
          }

          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: context }
              ],
              temperature: 0.8,
              max_tokens: 4000,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error('OpenAI error:', errorData);
            throw new Error(errorData.error?.message || 'OpenAI API failed');
          }

          sendSSE(controller, 'progress', { progress: 50, message: 'Crafting website copy...' });

          const data = await response.json();
          const content = data.choices[0]?.message?.content;

          if (!content) {
            throw new Error('No content generated');
          }

          sendSSE(controller, 'progress', { progress: 70, message: 'Defining component specifications...' });

          // Parse the JSON response
          let specs;
          try {
            // Clean potential markdown wrapping
            let cleanContent = content.trim();
            if (cleanContent.startsWith('```json')) {
              cleanContent = cleanContent.slice(7);
            }
            if (cleanContent.startsWith('```')) {
              cleanContent = cleanContent.slice(3);
            }
            if (cleanContent.endsWith('```')) {
              cleanContent = cleanContent.slice(0, -3);
            }
            specs = JSON.parse(cleanContent.trim());
          } catch (parseError) {
            console.error('Parse error:', parseError, 'Content:', content);
            throw new Error('Failed to parse specifications');
          }

          sendSSE(controller, 'progress', { progress: 85, message: 'Saving specifications...' });

          // Check for existing deliverable
          const { data: existing } = await supabase
            .from('phase_deliverables')
            .select('id')
            .eq('phase_id', phaseId)
            .eq('deliverable_type', 'website_specs')
            .maybeSingle();

          const deliverableData = {
            name: 'Website Specifications',
            description: 'Detailed website architecture, copy, and styling specifications',
            deliverable_type: 'website_specs',
            phase_id: phaseId,
            user_id: user.id,
            status: 'pending_review',
            generated_content: {
              specs,
              generatedAt: new Date().toISOString(),
              context: {
                phase1Data,
                phase2Data
              }
            },
            ceo_approved: false,
            user_approved: false,
            version: existing ? 2 : 1,
            updated_at: new Date().toISOString()
          };

          if (existing) {
            await supabase
              .from('phase_deliverables')
              .update(deliverableData)
              .eq('id', existing.id);
          } else {
            await supabase
              .from('phase_deliverables')
              .insert(deliverableData);
          }

          // Log agent activity
          await supabase.from('agent_activity_logs').insert({
            agent_id: 'website-specs-agent',
            agent_name: 'Website Copy & Specs Agent',
            action: 'Generated website specifications',
            status: 'completed',
            metadata: {
              projectId,
              phaseId,
              pagesCount: specs.pages?.length || 0,
              componentsCount: specs.components?.length || 0
            }
          });

          sendSSE(controller, 'progress', { progress: 100, message: 'Website specifications complete!' });
          sendSSE(controller, 'complete', { specs });

        } catch (error) {
          console.error('Stream error:', error);
          sendSSE(controller, 'error', { message: error instanceof Error ? error.message : 'Generation failed' });
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Request error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
