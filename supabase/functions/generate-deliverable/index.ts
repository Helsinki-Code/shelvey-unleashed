import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DELIVERABLE_PROMPTS: Record<string, string> = {
  'market-analysis': `You are a senior market research analyst. Generate a comprehensive market analysis report including:
- Market size and growth projections
- Key competitors and their positioning
- Target customer segments with demographics
- Market trends and opportunities
- SWOT analysis
- Entry barriers and risks
Format as structured JSON with sections.`,

  'brand-strategy': `You are a brand strategist. Create a complete brand strategy including:
- Brand positioning statement
- Brand personality and voice
- Core values and mission
- Unique value proposition
- Brand messaging framework
- Taglines and slogans (3-5 options)
Format as structured JSON.`,

  'visual-identity': `You are a creative director. Define a visual identity system including:
- Primary color (hex code) - choose a professional, memorable color
- Secondary color (hex code) - complementary accent
- Accent color (hex code) - for CTAs and highlights
- Typography recommendations (font families)
- Logo concept description (detailed visual description)
- Design principles
Format as structured JSON with colorPalette, typography, logoDescription, and designPrinciples.`,

  'website-copy': `You are a senior copywriter. Create compelling website copy including:
- Hero headline and subheadline
- Value proposition statements
- Feature descriptions (3-5 features)
- About section content
- Call-to-action text variations
- SEO meta title and description
Format as structured JSON.`,

  'social-media-strategy': `You are a social media strategist. Create a social media strategy including:
- Platform recommendations with rationale
- Content pillars (3-5 themes)
- Posting schedule recommendations
- Sample posts for each platform (3 per platform)
- Hashtag strategy
- Engagement tactics
Format as structured JSON.`,

  'sales-funnel': `You are a sales strategist. Design a sales funnel including:
- Awareness stage tactics
- Interest stage content
- Decision stage offers
- Action stage CTAs
- Retention strategies
- Upsell/cross-sell opportunities
Format as structured JSON.`,

  'content-calendar': `You are a content marketing manager. Create a 30-day content calendar including:
- Daily content topics
- Content types (blog, video, social, email)
- Key themes per week
- Promotional content schedule
- Engagement content schedule
Format as structured JSON with weeks array containing daily content.`,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

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

    const { deliverableId, deliverableType, projectId, businessContext, previousFeedback } = await req.json();

    // Get project details for context
    const { data: project } = await supabase
      .from('business_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    const systemPrompt = DELIVERABLE_PROMPTS[deliverableType] || DELIVERABLE_PROMPTS['market-analysis'];

    // Build user prompt with optional CEO feedback for regeneration
    let userPrompt = `Generate deliverable for:
Business Name: ${project?.name || businessContext?.businessName || 'Untitled Business'}
Industry: ${project?.industry || businessContext?.industry || 'General'}
Target Market: ${project?.target_market || businessContext?.targetMarket || 'General consumers'}
Description: ${project?.description || businessContext?.description || 'A new business venture'}

Additional Context: ${JSON.stringify(businessContext || {})}`;

    // Add CEO feedback for regeneration if provided
    if (previousFeedback) {
      userPrompt += `

IMPORTANT - CEO FEEDBACK FOR REVISION:
The CEO Agent previously reviewed this deliverable and requested the following changes:

CEO Comment: ${previousFeedback.feedback || 'No specific comment'}
Quality Score: ${previousFeedback.quality_score || 'N/A'}/10

Improvements Required:
${(previousFeedback.improvements || []).map((imp: string, i: number) => `${i + 1}. ${imp}`).join('\n')}

Please regenerate this deliverable incorporating ALL the CEO's feedback. Make sure to address each improvement point specifically.`;
    }

    userPrompt += `

Please generate comprehensive, professional content that would be used by a real business. Return ONLY valid JSON.`;

    console.log(`Generating ${deliverableType} for project ${projectId}`);

    // Call Lovable AI Gateway
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const generatedText = aiData.choices?.[0]?.message?.content || '';

    // Parse the JSON response
    let generatedContent;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = generatedText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, generatedText];
      generatedContent = JSON.parse(jsonMatch[1].trim());
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      generatedContent = { rawContent: generatedText, parseError: true };
    }

    // Update the deliverable with generated content
    const { data: updatedDeliverable, error: updateError } = await supabase
      .from('phase_deliverables')
      .update({
        generated_content: generatedContent,
        status: 'review',
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliverableId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating deliverable:', updateError);
      throw updateError;
    }

    // Log activity
    await supabase.from('user_agent_activity').insert({
      user_id: user.id,
      project_id: projectId,
      agent_id: 'deliverable-generator',
      agent_name: 'Deliverable Generator',
      action: `Generated ${deliverableType} deliverable`,
      status: 'completed',
      result: { deliverableId, deliverableType },
    });

    console.log(`Successfully generated ${deliverableType} for deliverable ${deliverableId}`);

    return new Response(JSON.stringify({
      success: true,
      deliverable: updatedDeliverable,
      generatedContent,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in generate-deliverable:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
