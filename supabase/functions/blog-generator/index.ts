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
    const { action, projectId, topic, keywords, businessName, industry, brandVoice, targetLength = 1500 } = await req.json();
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    let prompt = '';
    let systemPrompt = `You are a professional content writer for ${businessName || 'this business'} in the ${industry || 'general'} industry. Write in a ${brandVoice || 'professional and engaging'} tone. Focus on SEO best practices and reader engagement.`;

    switch (action) {
      case 'generate_outline':
        prompt = `Create a detailed blog post outline for: "${topic}"
Target keywords: ${keywords?.join(', ') || 'none specified'}

Include:
- Compelling title (with main keyword)
- Meta description (160 chars max)
- Introduction hook
- 5-7 main sections with subheadings
- Key points for each section
- Conclusion with CTA
- Suggested internal/external links

Return as JSON:
{
  "title": string,
  "metaDescription": string,
  "introduction": string,
  "sections": [{"heading": string, "subheadings": string[], "keyPoints": string[]}],
  "conclusion": string,
  "cta": string,
  "suggestedLinks": string[]
}`;
        break;

      case 'generate_article':
        const { outline } = await req.json();
        prompt = `Write a complete, SEO-optimized blog article of approximately ${targetLength} words.

Topic: "${topic}"
Target keywords: ${keywords?.join(', ') || 'none specified'}
${outline ? `Outline to follow: ${JSON.stringify(outline)}` : ''}

Requirements:
- Engaging introduction that hooks readers
- Use H2 and H3 headings appropriately
- Include keyword naturally (2-3% density)
- Add bullet points and lists where appropriate
- Include a strong call-to-action at the end
- Write in Markdown format

Return the full article in Markdown format.`;
        break;

      case 'optimize_seo':
        const { content } = await req.json();
        prompt = `Analyze and optimize this content for SEO:

${content}

Target keywords: ${keywords?.join(', ') || 'none specified'}

Provide:
1. Current SEO score (0-100)
2. Keyword density analysis
3. Readability score
4. Title tag optimization
5. Meta description suggestion
6. Heading structure analysis
7. Internal linking opportunities
8. Specific improvements needed

Return as JSON:
{
  "seoScore": number,
  "keywordDensity": {"keyword": string, "count": number, "percentage": number}[],
  "readabilityScore": number,
  "readabilityGrade": string,
  "titleOptimization": {"current": string, "suggested": string, "score": number},
  "metaDescription": string,
  "headingAnalysis": {"h1": number, "h2": number, "h3": number, "issues": string[]},
  "improvements": string[]
}`;
        break;

      case 'generate_meta':
        prompt = `Generate SEO metadata for a blog post about: "${topic}"
Target keywords: ${keywords?.join(', ') || 'none specified'}

Create:
1. SEO-optimized title (50-60 chars)
2. Meta description (150-160 chars)
3. URL slug
4. Open Graph title
5. Open Graph description
6. 5 relevant tags/categories

Return as JSON:
{
  "title": string,
  "metaDescription": string,
  "slug": string,
  "ogTitle": string,
  "ogDescription": string,
  "tags": string[]
}`;
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`Blog generator action: ${action} for project: ${projectId}`);

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
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // For article generation, return raw markdown
    if (action === 'generate_article') {
      return new Response(JSON.stringify({ 
        success: true, 
        action,
        result: { article: content }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
    console.error('Blog generator error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
