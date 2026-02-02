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
    const { action, projectId, businessName, industry, targetAudience, brandVoice } = await req.json();
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    let prompt = '';
    let systemPrompt = `You are a content strategy expert for ${businessName || 'this business'} in the ${industry || 'general'} industry. Target audience: ${targetAudience || 'general consumers'}. Brand voice: ${brandVoice || 'professional and friendly'}.`;

    switch (action) {
      case 'research_niche':
        prompt = `You are a niche research expert. For the niche "${businessName || 'blog'}" (target audience: ${targetAudience || 'general'}), provide a comprehensive niche analysis:

1. Market Size & Opportunity
2. Target Audience Profile
3. Top 10 Keywords (with estimated search volume)
4. Top 5 Competitors
5. Content Gaps & Opportunities
6. Monetization Potential
7. Recommended Content Pillars

Return as JSON:
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
        prompt = `Create a comprehensive 90-day content strategy for ${businessName}. Include:
1. Content pillars (3-4 main themes)
2. Content mix (blog posts, social media, email, video)
3. Publishing frequency recommendations
4. Key messages and value propositions
5. Content goals and KPIs

Return as JSON with structure:
{
  "pillars": [{"name": string, "description": string, "topics": string[]}],
  "contentMix": {"blog": number, "social": number, "email": number, "video": number},
  "frequency": {"blog": string, "social": string, "email": string},
  "keyMessages": string[],
  "kpis": [{"metric": string, "target": string}]
}`;
        break;

      case 'suggest_topics':
        prompt = `Generate 20 content topic ideas for ${businessName}. For each topic, include:
- Title
- Content type (blog, social, video, email)
- Target keyword
- Estimated search volume (low/medium/high)
- Difficulty (easy/medium/hard)
- Content pillar it belongs to

Return as JSON array:
[{"title": string, "type": string, "keyword": string, "searchVolume": string, "difficulty": string, "pillar": string}]`;
        break;

      case 'create_calendar':
        const { duration = '30', pillars = [] } = await req.json();
        prompt = `Create a ${duration}-day content calendar for ${businessName}. 
Content pillars: ${pillars.join(', ') || 'education, product, community'}

For each day, suggest content with:
- Date (relative to start)
- Content type
- Topic/title
- Platform(s)
- Status (draft)

Return as JSON array:
[{"day": number, "type": string, "title": string, "platforms": string[], "pillar": string}]`;
        break;

      case 'analyze_competitors':
        const { competitors = [] } = await req.json();
        prompt = `Analyze content strategy for these competitors: ${competitors.join(', ') || 'top 3 competitors'}.
Include:
- Content types they use
- Posting frequency
- Top performing content themes
- Gaps and opportunities
- Recommendations for differentiation

Return as JSON:
{
  "competitors": [{"name": string, "contentTypes": string[], "frequency": string, "topThemes": string[]}],
  "gaps": string[],
  "opportunities": string[],
  "recommendations": string[]
}`;
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`Content strategy action: ${action} for project: ${projectId}`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
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
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Try to parse JSON from response
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };
    } catch {
      result = { raw: content };
    }

    return new Response(JSON.stringify({ 
      success: true, 
      action,
      result 
    }), {
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
