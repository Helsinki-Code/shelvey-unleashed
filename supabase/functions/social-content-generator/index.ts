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
    const { 
      action, 
      projectId, 
      userId,
      businessName, 
      industry, 
      brandVoice,
      platforms = ['instagram', 'twitter', 'linkedin'],
      topic,
      count = 10,
      contentType = 'post'
    } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let prompt = '';
    let systemPrompt = `You are a social media content expert for ${businessName || 'this brand'} in the ${industry || 'general'} industry. Create engaging, platform-optimized content with a ${brandVoice || 'professional yet approachable'} voice.`;

    switch (action) {
      case 'generate_batch':
        prompt = `Create ${count} unique social media posts about "${topic}" for these platforms: ${platforms.join(', ')}.

For each post include:
- Platform-specific caption (respect character limits: Twitter 280, Instagram 2200, LinkedIn 3000)
- Relevant hashtags (5-10 for Instagram, 3-5 for Twitter, 3-5 for LinkedIn)
- Suggested image description for AI generation
- Best posting time suggestion
- Content type (${contentType})

Return as JSON array:
[{
  "platform": string,
  "caption": string,
  "hashtags": string[],
  "imagePrompt": string,
  "bestTime": string,
  "contentType": string,
  "engagementTip": string
}]`;
        break;

      case 'generate_carousel':
        const { slides = 5 } = await req.json();
        prompt = `Create an Instagram carousel with ${slides} slides about "${topic}".

For each slide include:
- Headline text (short, impactful)
- Body text (brief explanation)
- Visual description for AI image generation
- Call-to-action for last slide

Return as JSON:
{
  "title": string,
  "description": string,
  "slides": [{"headline": string, "body": string, "visualPrompt": string}],
  "caption": string,
  "hashtags": string[],
  "cta": string
}`;
        break;

      case 'generate_hashtags':
        prompt = `Generate optimized hashtags for ${platforms.join(', ')} about "${topic}" for a ${industry} business.

Include:
- 10 high-volume hashtags (1M+ posts)
- 10 medium-volume hashtags (100K-1M posts)
- 10 niche hashtags (10K-100K posts)
- 5 branded/unique hashtag suggestions

Return as JSON:
{
  "highVolume": string[],
  "mediumVolume": string[],
  "niche": string[],
  "branded": string[],
  "recommendedCombination": string[]
}`;
        break;

      case 'generate_captions':
        const { imageDescription, mood = 'engaging' } = await req.json();
        prompt = `Generate 5 caption variations for a social media post.
Image: ${imageDescription || topic}
Mood: ${mood}
Platforms: ${platforms.join(', ')}

For each caption include:
- The caption text
- Suitable platforms
- Hashtag suggestions
- CTA variation

Return as JSON array:
[{
  "caption": string,
  "platforms": string[],
  "hashtags": string[],
  "cta": string,
  "tone": string
}]`;
        break;

      case 'plan_week':
        prompt = `Create a 7-day social media content plan for ${businessName || 'this brand'}.
Platforms: ${platforms.join(', ')}
Main topic/theme: ${topic || 'brand awareness'}

For each day include:
- Platform
- Content type (post/story/reel/carousel)
- Topic/theme
- Best posting time
- Caption draft
- Hashtags

Return as JSON:
{
  "weekTheme": string,
  "days": [{
    "day": number,
    "dayName": string,
    "posts": [{
      "platform": string,
      "contentType": string,
      "topic": string,
      "postTime": string,
      "caption": string,
      "hashtags": string[]
    }]
  }]
}`;
        break;

      case 'save_content':
        const { content } = await req.json();
        if (userId && projectId && content) {
          const inserts = content.map((item: any) => ({
            project_id: projectId,
            user_id: userId,
            platform: item.platform,
            content_type: item.contentType || 'post',
            caption: item.caption,
            hashtags: item.hashtags || [],
            status: 'draft',
            metadata: {
              imagePrompt: item.imagePrompt,
              bestTime: item.bestTime,
              engagementTip: item.engagementTip
            }
          }));

          const { data, error } = await supabase
            .from('social_content_library')
            .insert(inserts)
            .select();

          if (error) throw error;

          return new Response(JSON.stringify({ 
            success: true, 
            action,
            result: { saved: data.length, items: data }
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`Social content generator action: ${action} for project: ${projectId}`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
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
    console.error('Social content generator error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
