import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, projectId, userId, url, keywords, domain } = await req.json();
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let prompt = '';
    let systemPrompt = 'You are an expert SEO analyst. Provide actionable, data-driven insights for improving search engine rankings.';

    switch (action) {
      case 'analyze_site':
        prompt = `Perform a comprehensive SEO audit for: ${url || domain}

Analyze and provide scores for:
1. Technical SEO (site speed, mobile-friendly, HTTPS, sitemap)
2. On-Page SEO (title tags, meta descriptions, headings, content)
3. Off-Page SEO (backlinks estimate, domain authority)
4. Content Quality (uniqueness, depth, keyword optimization)
5. User Experience (navigation, readability, engagement)

Return as JSON:
{
  "overallScore": number,
  "technicalSeo": {"score": number, "issues": string[], "recommendations": string[]},
  "onPageSeo": {"score": number, "issues": string[], "recommendations": string[]},
  "offPageSeo": {"score": number, "issues": string[], "recommendations": string[]},
  "contentQuality": {"score": number, "issues": string[], "recommendations": string[]},
  "userExperience": {"score": number, "issues": string[], "recommendations": string[]},
  "priorityFixes": string[],
  "quickWins": string[]
}`;
        break;

      case 'track_keywords':
        prompt = `Analyze keyword rankings potential for these keywords: ${keywords?.join(', ')}
Domain: ${domain || 'new website'}

For each keyword provide:
- Estimated current position (or "not ranking")
- Search volume (low/medium/high/very high)
- Competition level (low/medium/high)
- Ranking difficulty (1-100)
- Recommended priority (high/medium/low)
- Content suggestions

Return as JSON array:
[{
  "keyword": string,
  "estimatedPosition": string,
  "searchVolume": string,
  "competition": string,
  "difficulty": number,
  "priority": string,
  "contentSuggestion": string
}]`;
        break;

      case 'competitor_analysis':
        const { competitors = [] } = await req.json();
        prompt = `Analyze SEO competitors for ${domain || 'this website'}:
Competitors: ${competitors.join(', ') || 'identify top 5 competitors'}

Provide:
1. Competitor overview (estimated traffic, domain authority)
2. Keyword overlap analysis
3. Content gap opportunities
4. Backlink comparison
5. Strengths and weaknesses

Return as JSON:
{
  "competitors": [{"name": string, "estimatedTraffic": string, "domainAuthority": number, "topKeywords": string[]}],
  "keywordOverlap": string[],
  "contentGaps": string[],
  "backlinkOpportunities": string[],
  "strategicRecommendations": string[]
}`;
        break;

      case 'generate_keywords':
        const { seed, count = 50 } = await req.json();
        prompt = `Generate ${count} keyword ideas related to: ${seed || keywords?.join(', ')}

For each keyword include:
- Keyword phrase
- Search intent (informational/transactional/navigational/commercial)
- Estimated monthly searches
- Competition level
- Content type recommendation (blog/landing/product/guide)

Return as JSON array:
[{
  "keyword": string,
  "intent": string,
  "monthlySearches": string,
  "competition": string,
  "contentType": string
}]`;
        break;

      case 'check_rankings':
        // Store rankings in database
        if (keywords && userId && projectId) {
          for (const keyword of keywords) {
            await supabase.from('seo_rankings').insert({
              project_id: projectId,
              user_id: userId,
              keyword: keyword,
              position: null, // Would be populated by actual ranking check
              url: domain,
              search_engine: 'google',
            });
          }
        }

        prompt = `Estimate current search engine rankings for:
Domain: ${domain}
Keywords: ${keywords?.join(', ')}

For each keyword, estimate:
- Current position (1-100 or "not ranking")
- Trend (up/down/stable)
- Featured snippet opportunity
- Local pack opportunity

Return as JSON array:
[{
  "keyword": string,
  "position": number | null,
  "trend": string,
  "featuredSnippet": boolean,
  "localPack": boolean
}]`;
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`SEO analyzer action: ${action} for project: ${projectId}`);

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
        temperature: 0.5,
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
    console.error('SEO analyzer error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
