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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

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

    const { websiteId, feedback, feedbackFrom } = await req.json();

    // Get existing website
    const { data: website, error: websiteError } = await supabase
      .from('generated_websites')
      .select('*')
      .eq('id', websiteId)
      .eq('user_id', user.id)
      .single();

    if (websiteError || !website) {
      return new Response(JSON.stringify({ error: 'Website not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get branding deliverable if linked
    let branding = null;
    if (website.branding_deliverable_id) {
      const { data: brandingDeliverable } = await supabase
        .from('phase_deliverables')
        .select('generated_content')
        .eq('id', website.branding_deliverable_id)
        .single();
      
      branding = brandingDeliverable?.generated_content;
    }

    // Get project for context
    const { data: project } = await supabase
      .from('business_projects')
      .select('*')
      .eq('id', website.project_id)
      .single();

    // Build feedback history
    const feedbackHistory = [...(website.feedback_history || []), {
      from: feedbackFrom,
      feedback,
      timestamp: new Date().toISOString(),
      version: website.version,
    }];

    // Compile all feedback for the prompt
    const allFeedback = feedbackHistory.map(f => `[${f.from}]: ${f.feedback}`).join('\n');

    const systemPrompt = `You are an expert web developer creating a modern, responsive landing page.
You MUST return a valid JSON object with these exact keys: html, css, js

Requirements:
- Use Tailwind CSS via CDN
- Modern, premium design with animations
- Fully responsive
- Include all sections: hero, features, testimonials, CTA, footer
- Use the exact branding colors and styles provided
- Incorporate ALL feedback to improve the design

Return ONLY the JSON object, no markdown.`;

    const brandingContext = branding ? `
BRANDING TO USE:
- Primary Color: ${branding.colorPalette?.primary || '#10B981'}
- Secondary Color: ${branding.colorPalette?.secondary || '#059669'}
- Accent Color: ${branding.colorPalette?.accent || '#34D399'}
- Typography: ${branding.typography?.heading || 'Inter'} for headings, ${branding.typography?.body || 'Inter'} for body
- Brand Voice: ${branding.brandVoice || 'Professional and trustworthy'}
- Logo Concept: ${branding.logoDescription || 'Modern minimalist logo'}
` : '';

    const userPrompt = `Regenerate website for:
Business: ${website.name}
Industry: ${project?.industry || 'General'}
Description: ${project?.description || ''}

${brandingContext}

PREVIOUS VERSION HTML (for reference):
${website.html_content?.substring(0, 2000)}...

FEEDBACK TO INCORPORATE:
${allFeedback}

Create an improved version addressing all feedback while maintaining brand consistency.`;

    console.log(`Regenerating website ${websiteId} v${website.version + 1} with feedback`);

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
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

    // Parse response
    let websiteCode;
    try {
      const jsonMatch = generatedText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, generatedText];
      websiteCode = JSON.parse(jsonMatch[1].trim());
    } catch (parseError) {
      console.error('Failed to parse website JSON:', parseError);
      // Generate fallback
      websiteCode = generateFallbackHTML(website.name, branding, project);
    }

    // Update website with new version
    const { data: updatedWebsite, error: updateError } = await supabase
      .from('generated_websites')
      .update({
        html_content: websiteCode.html || websiteCode.rawContent,
        css_content: websiteCode.css || '',
        js_content: websiteCode.js || '',
        version: website.version + 1,
        feedback_history: feedbackHistory,
        ceo_approved: false,
        user_approved: false,
        status: 'draft',
        updated_at: new Date().toISOString(),
      })
      .eq('id', websiteId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log activity
    await supabase.from('user_agent_activity').insert({
      user_id: user.id,
      project_id: website.project_id,
      agent_id: 'website-regenerator',
      agent_name: 'Website Regenerator',
      action: `Regenerated website v${website.version + 1} with ${feedbackFrom} feedback`,
      status: 'completed',
      result: { websiteId, version: website.version + 1, feedbackFrom },
    });

    console.log(`Successfully regenerated website ${websiteId} to v${website.version + 1}`);

    return new Response(JSON.stringify({
      success: true,
      website: updatedWebsite,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in regenerate-website:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateFallbackHTML(businessName: string, branding: any, project: any) {
  const primaryColor = branding?.colorPalette?.primary || '#10B981';
  const secondaryColor = branding?.colorPalette?.secondary || '#059669';
  
  return {
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${businessName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    :root { --primary: ${primaryColor}; --secondary: ${secondaryColor}; }
  </style>
</head>
<body class="bg-gray-50">
  <header class="bg-white shadow-sm">
    <nav class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
      <h1 class="text-2xl font-bold" style="color: var(--primary)">${businessName}</h1>
      <a href="#contact" class="px-6 py-2 rounded-full text-white" style="background: var(--primary)">Get Started</a>
    </nav>
  </header>
  <main>
    <section class="py-20 text-center">
      <div class="max-w-4xl mx-auto px-4">
        <h2 class="text-5xl font-bold mb-6">${project?.description || 'Transform Your Business Today'}</h2>
        <p class="text-xl text-gray-600 mb-8">Professional solutions for ${project?.industry || 'your industry'}</p>
        <a href="#contact" class="inline-block px-8 py-3 rounded-full text-white text-lg" style="background: var(--primary)">Start Now</a>
      </div>
    </section>
  </main>
  <footer class="bg-gray-900 text-white py-8 text-center">
    <p>&copy; ${new Date().getFullYear()} ${businessName}. All rights reserved.</p>
  </footer>
</body>
</html>`,
    css: '',
    js: ''
  };
}
