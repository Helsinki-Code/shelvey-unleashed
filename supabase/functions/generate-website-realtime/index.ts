import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebsiteGenerationRequest {
  projectId: string;
  businessName: string;
  industry: string;
  description: string;
  brandColors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
  typography?: {
    headingFont: string;
    bodyFont: string;
  };
  logoUrl?: string;
  sections?: string[];
  style?: 'modern' | 'minimal' | 'corporate' | 'creative';
  useBranding?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const request: WebsiteGenerationRequest = await req.json();
    const { projectId, businessName, industry, description, brandColors, typography, logoUrl, sections, style, useBranding } = request;

    console.log(`[generate-website-realtime] Starting generation for project: ${projectId}`);

    // Fetch approved branding from Phase 2 if useBranding is true
    let approvedBranding: any = null;
    if (useBranding && projectId) {
      const { data: phases } = await supabase
        .from('business_phases')
        .select('id')
        .eq('project_id', projectId)
        .eq('phase_number', 2)
        .single();

      if (phases) {
        const { data: brandDeliverables } = await supabase
          .from('phase_deliverables')
          .select('generated_content, deliverable_type')
          .eq('phase_id', phases.id)
          .eq('user_approved', true)
          .eq('ceo_approved', true);

        if (brandDeliverables) {
          approvedBranding = brandDeliverables.reduce((acc: any, d: any) => {
            if (d.deliverable_type === 'visual_identity') {
              acc.visualIdentity = d.generated_content;
            } else if (d.deliverable_type === 'brand_strategy') {
              acc.brandStrategy = d.generated_content;
            }
            return acc;
          }, {});
        }
      }
    }

    // Determine final colors and typography
    const finalColors = approvedBranding?.visualIdentity?.colors || brandColors || {
      primary: 'hsl(142, 76%, 36%)',
      secondary: 'hsl(142, 76%, 26%)',
      accent: 'hsl(142, 76%, 46%)',
    };

    const finalTypography = approvedBranding?.visualIdentity?.typography || typography || {
      headingFont: 'Inter',
      bodyFont: 'Inter',
    };

    // Generate website using OpenAI with streaming
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'OPENAI_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const websiteSections = sections || ['hero', 'features', 'pricing', 'testimonials', 'cta', 'footer'];
    
    const systemPrompt = `You are an expert React/TypeScript developer specializing in creating beautiful, modern landing pages. 
You use Tailwind CSS for styling and Framer Motion for animations.
You create responsive, accessible, and SEO-optimized websites.
Always use semantic HTML and follow best practices.

Brand Guidelines:
- Primary Color: ${finalColors.primary}
- Secondary Color: ${finalColors.secondary}
- Accent Color: ${finalColors.accent}
- Heading Font: ${finalTypography.headingFont}
- Body Font: ${finalTypography.bodyFont}
- Style: ${style || 'modern'}

Business Context:
- Business Name: ${businessName}
- Industry: ${industry}
- Description: ${description}

${approvedBranding?.brandStrategy?.voice ? `Brand Voice: ${approvedBranding.brandStrategy.voice}` : ''}
${approvedBranding?.brandStrategy?.tagline ? `Tagline: ${approvedBranding.brandStrategy.tagline}` : ''}`;

    const userPrompt = `Generate a complete, production-ready React landing page for "${businessName}".

Include these sections: ${websiteSections.join(', ')}

Requirements:
1. Use TypeScript with proper types
2. Use Tailwind CSS with the brand colors (use CSS variables like hsl(var(--primary)))
3. Add smooth Framer Motion animations
4. Make it fully responsive (mobile-first)
5. Include proper meta tags for SEO
6. Add micro-interactions for better UX
7. Use modern UI patterns (gradients, glassmorphism where appropriate)

Return a complete React component that can be rendered as a full page.
Include all necessary imports at the top.
The component should be named "LandingPage" and export default.

IMPORTANT: Return ONLY the React component code, no explanations.`;

    // Call OpenAI API
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
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 8000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[generate-website-realtime] AI Gateway error:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to generate website' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const generatedCode = aiData.choices?.[0]?.message?.content || '';

    // Extract React code from markdown if wrapped
    let cleanCode = generatedCode;
    const codeBlockMatch = generatedCode.match(/```(?:tsx?|jsx?|react)?\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      cleanCode = codeBlockMatch[1].trim();
    }

    // Generate HTML version for preview/hosting
    const htmlContent = generateHTMLFromReact(cleanCode, businessName, finalColors, finalTypography);

    // Save to database
    const { data: website, error: insertError } = await supabase
      .from('generated_websites')
      .insert({
        project_id: projectId,
        user_id: user.id,
        name: `${businessName} Website`,
        html_content: htmlContent,
        css_content: generateTailwindCSS(finalColors),
        js_content: cleanCode,
        status: 'generated',
        metadata: {
          businessName,
          industry,
          description,
          sections: websiteSections,
          style,
          brandColors: finalColors,
          typography: finalTypography,
          generatedAt: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error('[generate-website-realtime] Insert error:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save website' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log activity
    await supabase.from('user_agent_activity').insert({
      user_id: user.id,
      project_id: projectId,
      agent_id: 'website-builder-agent',
      agent_name: 'Website Builder Agent',
      action: 'Generated website in real-time',
      status: 'completed',
      metadata: {
        websiteId: website.id,
        sections: websiteSections,
      },
    });

    console.log(`[generate-website-realtime] Website generated successfully: ${website.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          websiteId: website.id,
          htmlContent,
          reactCode: cleanCode,
          cssContent: generateTailwindCSS(finalColors),
          metadata: website.metadata,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-website-realtime] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateHTMLFromReact(reactCode: string, businessName: string, colors: any, typography: any): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${businessName} - Your trusted partner for success">
  <meta name="keywords" content="${businessName}, business, services">
  <title>${businessName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=${typography.headingFont.replace(' ', '+')}:wght@400;500;600;700;800&family=${typography.bodyFont.replace(' ', '+')}:wght@300;400;500;600&display=swap" rel="stylesheet">
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: '${colors.primary}',
            secondary: '${colors.secondary}',
            accent: '${colors.accent}',
          },
          fontFamily: {
            heading: ['${typography.headingFont}', 'sans-serif'],
            body: ['${typography.bodyFont}', 'sans-serif'],
          },
        },
      },
    }
  </script>
  <style>
    :root {
      --primary: ${colors.primary};
      --secondary: ${colors.secondary};
      --accent: ${colors.accent};
    }
    body {
      font-family: '${typography.bodyFont}', sans-serif;
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: '${typography.headingFont}', sans-serif;
    }
  </style>
</head>
<body class="min-h-screen bg-white">
  <div id="root"></div>
  <script type="module">
    import React from 'https://esm.sh/react@18';
    import ReactDOM from 'https://esm.sh/react-dom@18/client';
    import { motion } from 'https://esm.sh/framer-motion@11';
    
    // Component code will be injected here
    ${reactCode}
    
    // Render the app
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(React.createElement(LandingPage || App || (() => React.createElement('div', null, 'Loading...'))));
  </script>
</body>
</html>`;
}

function generateTailwindCSS(colors: any): string {
  return `
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --primary: ${colors.primary};
  --secondary: ${colors.secondary};
  --accent: ${colors.accent};
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 142 76% 36%;
  --radius: 0.5rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
`;
}
