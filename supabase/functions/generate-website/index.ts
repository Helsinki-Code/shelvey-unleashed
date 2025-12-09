import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { 
      businessName, 
      industry, 
      headline, 
      description, 
      features,
      ctaText,
      brandColors,
      projectId,
      useBranding,
      generateReact // New flag to generate React code
    } = await req.json();

    if (!businessName) {
      return new Response(JSON.stringify({ error: "Business name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch approved branding from Phase 2
    let approvedBranding: any = null;
    let brandingDeliverableId: string | null = null;

    if (projectId && useBranding !== false) {
      const { data: phase2 } = await supabase
        .from('business_phases')
        .select('id')
        .eq('project_id', projectId)
        .eq('phase_number', 2)
        .single();

      if (phase2) {
        const { data: brandingDeliverable } = await supabase
          .from('phase_deliverables')
          .select('*')
          .eq('phase_id', phase2.id)
          .in('deliverable_type', ['visual-identity', 'design'])
          .eq('ceo_approved', true)
          .eq('user_approved', true)
          .maybeSingle();

        if (brandingDeliverable?.generated_content) {
          approvedBranding = brandingDeliverable.generated_content;
          brandingDeliverableId = brandingDeliverable.id;
        }
      }
    }

    // Build colors
    const colors = approvedBranding?.colorPalette || brandColors || {};
    const primaryColor = colors.primary || '#10B981';
    const secondaryColor = colors.secondary || '#059669';
    const accentColor = colors.accent || '#34D399';
    const brandName = approvedBranding?.brandStrategy?.brandName || businessName;
    const tagline = approvedBranding?.brandStrategy?.taglines?.[0] || headline;
    const typography = approvedBranding?.typography || { heading: 'Inter', body: 'Inter' };

    console.log(`Generating ${generateReact ? 'React' : 'HTML'} website for:`, brandName);

    let websiteCode: any;

    if (generateReact) {
      // Generate React/TypeScript code
      websiteCode = await generateReactWebsite(openaiApiKey, {
        brandName,
        industry: industry || 'Technology',
        tagline: tagline || `Welcome to ${brandName}`,
        description: description || `${brandName} provides innovative solutions.`,
        features: features || ['Fast', 'Reliable', 'Secure', 'Scalable'],
        ctaText: ctaText || 'Get Started',
        colors: { primary: primaryColor, secondary: secondaryColor, accent: accentColor },
        typography,
      });
    } else {
      // Generate HTML (existing behavior)
      websiteCode = await generateHTMLWebsite(openaiApiKey, {
        brandName,
        industry: industry || 'Technology',
        tagline,
        description,
        features,
        ctaText,
        colors: { primary: primaryColor, secondary: secondaryColor, accent: accentColor },
        typography,
      });
    }

    // Save to database
    const { data: website, error: insertError } = await supabase
      .from('generated_websites')
      .insert({
        user_id: user.id,
        project_id: projectId,
        name: brandName,
        html_content: websiteCode.html || websiteCode.preview_html,
        css_content: websiteCode.css || "",
        js_content: websiteCode.js || "",
        branding_deliverable_id: brandingDeliverableId,
        metadata: {
          industry,
          headline: tagline,
          description,
          features,
          ctaText,
          brandColors: { primary: primaryColor, secondary: secondaryColor, accent: accentColor },
          typography,
          usedApprovedBranding: !!approvedBranding,
          isReact: !!generateReact,
          components: websiteCode.components,
          dependencies: websiteCode.dependencies,
          generatedAt: new Date().toISOString()
        },
        status: 'draft',
        version: 1,
        feedback_history: [],
        ceo_approved: false,
        user_approved: false
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save website" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log activity
    await supabase.from('agent_activity_logs').insert({
      agent_id: 'visual-design',
      agent_name: 'Visual Design Agent',
      action: `Generated ${generateReact ? 'React' : 'HTML'} website for ${brandName}`,
      status: 'completed',
      metadata: { websiteId: website.id, projectId, isReact: !!generateReact },
    });

    return new Response(JSON.stringify({
      success: true,
      website: {
        id: website.id,
        name: website.name,
        html: websiteCode.html || websiteCode.preview_html,
        css: websiteCode.css,
        js: websiteCode.js,
        components: websiteCode.components,
        dependencies: websiteCode.dependencies,
        status: website.status,
        usedApprovedBranding: !!approvedBranding,
        isReact: !!generateReact
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Generate website error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function generateReactWebsite(openaiApiKey: string, params: any): Promise<any> {
  const { brandName, industry, tagline, description, features, ctaText, colors, typography } = params;

  const prompt = `Generate a modern React landing page with TypeScript and Tailwind CSS.

BRAND DETAILS:
- Name: ${brandName}
- Industry: ${industry}
- Tagline: ${tagline}
- Description: ${description}
- Features: ${features?.join(', ')}
- CTA: ${ctaText}
- Primary Color: ${colors.primary}
- Secondary Color: ${colors.secondary}
- Accent Color: ${colors.accent}
- Heading Font: ${typography.heading}
- Body Font: ${typography.body}

Generate a complete React application with these components:
1. App.tsx - Main app with all sections
2. Hero section with gradient background
3. Features section with icons
4. Testimonials section
5. CTA section
6. Footer

Return JSON with this structure:
{
  "components": {
    "App.tsx": "// Full component code here",
    "components/Hero.tsx": "// Component code",
    "components/Features.tsx": "// Component code",
    "components/Testimonials.tsx": "// Component code",
    "components/CTA.tsx": "// Component code",
    "components/Footer.tsx": "// Component code"
  },
  "dependencies": ["framer-motion", "lucide-react"],
  "preview_html": "<!DOCTYPE html>... full preview HTML..."
}

Use these Tailwind classes for brand colors:
- Primary: Use inline style with ${colors.primary}
- Secondary: Use inline style with ${colors.secondary}
- Accent: Use inline style with ${colors.accent}

Include Framer Motion animations and Lucide icons.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a senior React developer. Generate production-ready React components with TypeScript, Tailwind CSS, and Framer Motion. Return ONLY valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate React code');
  }

  const result = await response.json();
  const content = result.choices[0]?.message?.content || '';

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No JSON found');
  } catch {
    // Fallback to simple React template
    return generateFallbackReact(params);
  }
}

async function generateHTMLWebsite(openaiApiKey: string, params: any): Promise<any> {
  const { brandName, industry, tagline, description, features, ctaText, colors, typography } = params;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: `Generate a complete HTML landing page with Tailwind CSS. Return ONLY valid JSON: {"html": "<!DOCTYPE html>...", "css": "", "js": ""}` 
        },
        { 
          role: 'user', 
          content: `Create landing page for ${brandName} (${industry}). Tagline: ${tagline}. Colors: primary ${colors.primary}, secondary ${colors.secondary}. Features: ${features?.join(', ')}. CTA: ${ctaText}` 
        }
      ],
    }),
  });

  if (!response.ok) {
    return { html: generateFallbackHTML(params), css: '', js: '' };
  }

  const result = await response.json();
  const content = result.choices[0]?.message?.content || '';

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Fallback
  }

  return { html: generateFallbackHTML(params), css: '', js: '' };
}

function generateFallbackReact(params: any): any {
  const { brandName, tagline, description, features, ctaText, colors } = params;
  
  const appCode = `import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Zap, Shield, Users } from 'lucide-react';

const App = () => {
  const primaryColor = '${colors.primary}';
  const secondaryColor = '${colors.secondary}';
  
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section 
        className="py-20 text-white text-center"
        style={{ background: \`linear-gradient(135deg, \${primaryColor}, \${secondaryColor})\` }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="container mx-auto px-6"
        >
          <h1 className="text-5xl font-bold mb-4">${brandName}</h1>
          <p className="text-xl mb-8 opacity-90">${tagline || description}</p>
          <button className="bg-white text-gray-900 px-8 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition">
            ${ctaText}
          </button>
        </motion.div>
      </section>
      
      {/* Features */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Us</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {${JSON.stringify(features || ['Fast', 'Reliable', 'Secure', 'Scalable'])}.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="text-center p-6 bg-white rounded-xl shadow-lg"
              >
                <div 
                  className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: primaryColor + '20' }}
                >
                  <CheckCircle style={{ color: primaryColor }} />
                </div>
                <h3 className="font-semibold">{feature}</h3>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA */}
      <section 
        className="py-20 text-white text-center"
        style={{ background: \`linear-gradient(135deg, \${primaryColor}, \${secondaryColor})\` }}
      >
        <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
        <button className="bg-white text-gray-900 px-8 py-3 rounded-lg font-semibold">
          ${ctaText}
        </button>
      </section>
      
      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 text-center">
        <p>&copy; ${new Date().getFullYear()} ${brandName}. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;`;

  return {
    components: {
      'App.tsx': appCode,
    },
    dependencies: ['framer-motion', 'lucide-react'],
    preview_html: generateFallbackHTML(params),
  };
}

function generateFallbackHTML(params: any): string {
  const { brandName, tagline, description, features, ctaText, colors, typography } = params;
  const primary = colors?.primary || '#10B981';
  const secondary = colors?.secondary || '#059669';
  const featureList = features || ['Fast', 'Reliable', 'Secure', 'Scalable'];
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${brandName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; }
    .gradient-bg { background: linear-gradient(135deg, ${primary}, ${secondary}); }
  </style>
</head>
<body>
  <header class="gradient-bg text-white py-20 text-center">
    <h1 class="text-5xl font-bold mb-4">${brandName}</h1>
    <p class="text-xl mb-8 opacity-90">${tagline || description || 'Welcome'}</p>
    <a href="#" class="bg-white text-gray-900 px-8 py-3 rounded-lg font-semibold">${ctaText || 'Get Started'}</a>
  </header>
  <section class="py-20 bg-gray-50">
    <div class="container mx-auto px-6">
      <h2 class="text-3xl font-bold text-center mb-12">Why Choose Us</h2>
      <div class="grid md:grid-cols-4 gap-8">
        ${featureList.map((f: string) => `
        <div class="text-center p-6 bg-white rounded-xl shadow-lg">
          <div class="w-12 h-12 mx-auto mb-4 rounded-full gradient-bg flex items-center justify-center">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h3 class="font-semibold">${f}</h3>
        </div>`).join('')}
      </div>
    </div>
  </section>
  <section class="gradient-bg py-20 text-white text-center">
    <h2 class="text-3xl font-bold mb-4">Ready to Get Started?</h2>
    <a href="#" class="bg-white text-gray-900 px-8 py-3 rounded-lg font-semibold">${ctaText || 'Start Free Trial'}</a>
  </section>
  <footer class="bg-gray-900 text-white py-8 text-center">
    <p>&copy; ${new Date().getFullYear()} ${brandName}. All rights reserved.</p>
  </footer>
</body>
</html>`;
}
