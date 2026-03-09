import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, projectId, businessName, industry, targetAudience, brandVoice, niche, topic, platform, goals } = body;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const effectiveAction = action || 'research_niche';
    const effectiveName = businessName || topic || niche || 'blog';
    const effectiveAudience = targetAudience || niche || 'general consumers';

    let prompt = '';
    const systemPrompt = `You are a content strategy expert for ${effectiveName} in the ${industry || 'general'} industry. Target audience: ${effectiveAudience}. Brand voice: ${brandVoice || 'professional and friendly'}. Always return valid JSON.`;

    switch (effectiveAction) {
      case 'research_niche':
        prompt = `For the niche "${effectiveName}" (target audience: ${effectiveAudience}), provide a comprehensive niche analysis as JSON:
{
  "niche": string,
  "marketSize": {"estimate": string, "growth": string},
  "audience": {"demographics": string, "painPoints": string[], "desires": string[]},
  "keywords": [{"keyword": string, "volume": string, "difficulty": string}],
  "competitors": [{"name": string, "strengths": string[], "weaknesses": string[]}],
  "gaps": string[],
  "monetization": {"methods": string[], "potential": string},
  "pillars": [{"name": string, "description": string}]
}`;
        break;

      case 'generate_strategy':
        prompt = `Create a comprehensive 90-day content strategy for ${effectiveName}. Return as JSON:
{
  "pillars": [{"name": string, "description": string, "topics": string[]}],
  "contentMix": {"blog": number, "social": number, "email": number, "video": number},
  "frequency": {"blog": string, "social": string, "email": string},
  "keyMessages": string[],
  "kpis": [{"metric": string, "target": string}]
}`;
        break;

      case 'suggest_topics':
        prompt = `Generate 20 content topic ideas for ${effectiveName}. Return as JSON array:
[{"title": string, "type": string, "keyword": string, "searchVolume": string, "difficulty": string, "pillar": string}]`;
        break;

      case 'create_calendar':
        const duration = body.duration || '30';
        const pillars = body.pillars || [];
        prompt = `Create a ${duration}-day content calendar for ${effectiveName}. Content pillars: ${pillars.join(', ') || 'education, product, community'}. Return as JSON array:
[{"day": number, "type": string, "title": string, "platforms": string[], "pillar": string}]`;
        break;

      case 'analyze_competitors':
        const competitors = body.competitors || [];
        prompt = `Analyze content strategy for these competitors: ${competitors.join(', ') || 'top 3 competitors'}. Return as JSON:
{
  "competitors": [{"name": string, "contentTypes": string[], "frequency": string, "topThemes": string[]}],
  "gaps": string[],
  "opportunities": string[],
  "recommendations": string[]
}`;
        break;

      default:
        throw new Error(`Unknown action: ${effectiveAction}`);
    }

    console.log(`Content strategy action: ${effectiveAction} for project: ${projectId}`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded, please try again later.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ success: false, error: 'Payment required, please add AI credits.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };
    } catch {
      result = { raw: content };
    }

    return new Response(JSON.stringify({ success: true, action: effectiveAction, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Content strategy generator error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
