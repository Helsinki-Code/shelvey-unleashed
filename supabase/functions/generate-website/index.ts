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
      useBranding // Flag to pull from Phase 2 approved branding
    } = await req.json();

    if (!businessName) {
      return new Response(JSON.stringify({ error: "Business name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try to fetch approved branding from Phase 2 deliverables
    let approvedBranding: any = null;
    let brandingDeliverableId: string | null = null;

    if (projectId && useBranding !== false) {
      console.log("Looking for approved branding in project:", projectId);
      
      // First find the Phase 2 (Branding) phase
      const { data: phase2 } = await supabase
        .from('business_phases')
        .select('id')
        .eq('project_id', projectId)
        .eq('phase_number', 2)
        .single();

      if (phase2) {
        // Get approved visual-identity deliverable
        const { data: brandingDeliverable } = await supabase
          .from('phase_deliverables')
          .select('*')
          .eq('phase_id', phase2.id)
          .eq('deliverable_type', 'visual-identity')
          .eq('ceo_approved', true)
          .eq('user_approved', true)
          .single();

        if (brandingDeliverable?.generated_content) {
          approvedBranding = brandingDeliverable.generated_content;
          brandingDeliverableId = brandingDeliverable.id;
          console.log("Found approved branding:", approvedBranding);
        }

        // Also try to get brand strategy for messaging
        const { data: strategyDeliverable } = await supabase
          .from('phase_deliverables')
          .select('*')
          .eq('phase_id', phase2.id)
          .eq('deliverable_type', 'brand-strategy')
          .eq('ceo_approved', true)
          .eq('user_approved', true)
          .single();

        if (strategyDeliverable?.generated_content) {
          approvedBranding = {
            ...approvedBranding,
            brandStrategy: strategyDeliverable.generated_content
          };
        }
      }
    }

    // Build colors from approved branding or fallback to provided
    const colors = approvedBranding?.colorPalette || brandColors || {};
    const primaryColor = colors.primary || '#10B981';
    const secondaryColor = colors.secondary || '#059669';
    const accentColor = colors.accent || '#34D399';

    // Build brand elements
    const brandName = approvedBranding?.brandStrategy?.brandName || businessName;
    const brandVoice = approvedBranding?.brandStrategy?.brandVoice || 'Professional and trustworthy';
    const tagline = approvedBranding?.brandStrategy?.taglines?.[0] || headline;
    const typography = approvedBranding?.typography || { heading: 'Inter', body: 'Inter' };
    const logoDescription = approvedBranding?.logoDescription || '';

    // Build website generation prompt with branding
    const WEBSITE_GENERATION_PROMPT = `You are an expert web developer. Generate a complete, modern, responsive landing page.

IMPORTANT: Return ONLY valid JSON with this exact structure (no markdown, no code blocks):
{
  "html": "<!DOCTYPE html>...",
  "css": "/* additional styles */",
  "js": "// scripts"
}

BRANDING REQUIREMENTS (MUST USE EXACTLY):
- Primary Color: ${primaryColor}
- Secondary Color: ${secondaryColor}
- Accent Color: ${accentColor}
- Brand Name: ${brandName}
- Heading Font: ${typography.heading}
- Body Font: ${typography.body}
- Brand Voice: ${brandVoice}
${logoDescription ? `- Logo Style: ${logoDescription}` : ''}

Requirements for the landing page:
1. Hero section with compelling headline and CTA button
2. Features/benefits section with icons
3. Testimonials section with placeholder quotes
4. Pricing/CTA section
5. Footer with contact info and social links

Technical requirements:
- Use Tailwind CSS via CDN
- Import Google Fonts for: ${typography.heading}, ${typography.body}
- Use the EXACT brand colors specified above
- Fully responsive (mobile-first)
- Modern gradient backgrounds using brand colors
- Smooth animations and transitions
- SEO meta tags included
- Clean, semantic HTML5
- Accessibility best practices`;

    const userPrompt = `Create a landing page for:

Business Name: ${brandName}
Industry: ${industry || 'Technology'}
Headline: ${tagline || `Transform Your Business with ${brandName}`}
Description: ${description || `${brandName} provides innovative solutions for modern businesses.`}
Features: ${features?.join(', ') || 'Fast, Reliable, Secure, Scalable'}
CTA Text: ${ctaText || 'Get Started Today'}

${approvedBranding ? `
APPROVED BRANDING TO USE:
- Logo Concept: ${logoDescription}
- Brand Positioning: ${approvedBranding?.brandStrategy?.positioning || ''}
- Value Proposition: ${approvedBranding?.brandStrategy?.valueProposition || ''}
- Design Principles: ${approvedBranding?.designPrinciples?.join(', ') || ''}
` : ''}

Generate the complete landing page code now using ONLY the specified brand colors and fonts.`;

    console.log("Generating website for:", brandName, "with branding:", !!approvedBranding);

    // Call OpenAI API
    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: WEBSITE_GENERATION_PROMPT },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "Website generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    console.log("AI Response received, parsing...");

    // Parse the JSON response
    let websiteCode;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        websiteCode = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      websiteCode = {
        html: generateFallbackHTML(brandName, tagline, description, features, ctaText, { primary: primaryColor, secondary: secondaryColor, accent: accentColor }, typography),
        css: "",
        js: ""
      };
    }

    // Save to database with branding linkage
    const { data: website, error: insertError } = await supabase
      .from('generated_websites')
      .insert({
        user_id: user.id,
        project_id: projectId,
        name: brandName,
        html_content: websiteCode.html,
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

    // Log agent activity
    await supabase.from('user_agent_activity').insert({
      user_id: user.id,
      project_id: projectId,
      agent_id: 'agent-8',
      agent_name: 'Visual Design Agent',
      action: 'generate_website',
      status: 'completed',
      metadata: { 
        websiteId: website.id, 
        businessName: brandName,
        usedApprovedBranding: !!approvedBranding 
      },
      result: { success: true }
    });

    return new Response(JSON.stringify({
      success: true,
      website: {
        id: website.id,
        name: website.name,
        html: websiteCode.html,
        css: websiteCode.css,
        js: websiteCode.js,
        status: website.status,
        usedApprovedBranding: !!approvedBranding
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

function generateFallbackHTML(
  businessName: string,
  headline?: string,
  description?: string,
  features?: string[],
  ctaText?: string,
  brandColors?: { primary?: string; secondary?: string; accent?: string },
  typography?: { heading?: string; body?: string }
): string {
  const primary = brandColors?.primary || '#10B981';
  const secondary = brandColors?.secondary || '#059669';
  const accent = brandColors?.accent || '#34D399';
  const headingFont = typography?.heading || 'Inter';
  const bodyFont = typography?.body || 'Inter';
  const featureList = features || ['Fast', 'Reliable', 'Secure', 'Scalable'];
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${businessName}</title>
  <meta name="description" content="${description || `${businessName} - Your trusted partner`}">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=${headingFont.replace(' ', '+')}:wght@400;600;700&family=${bodyFont.replace(' ', '+')}:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root { 
      --primary: ${primary}; 
      --secondary: ${secondary}; 
      --accent: ${accent};
    }
    body { font-family: '${bodyFont}', sans-serif; }
    h1, h2, h3, h4, h5, h6 { font-family: '${headingFont}', sans-serif; }
    .gradient-bg { background: linear-gradient(135deg, ${primary}, ${secondary}); }
    .gradient-text { background: linear-gradient(135deg, ${primary}, ${accent}); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  </style>
</head>
<body class="antialiased">
  <header class="gradient-bg text-white">
    <nav class="container mx-auto px-6 py-4 flex justify-between items-center">
      <div class="text-2xl font-bold">${businessName}</div>
      <div class="space-x-6 hidden md:flex">
        <a href="#features" class="hover:opacity-80 transition">Features</a>
        <a href="#testimonials" class="hover:opacity-80 transition">Testimonials</a>
        <a href="#pricing" class="hover:opacity-80 transition">Pricing</a>
      </div>
      <a href="#" class="hidden md:inline-block bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition">${ctaText || 'Get Started'}</a>
    </nav>
    <div class="container mx-auto px-6 py-24 text-center">
      <h1 class="text-5xl md:text-6xl font-bold mb-6">${headline || `Welcome to ${businessName}`}</h1>
      <p class="text-xl mb-8 opacity-90 max-w-2xl mx-auto">${description || 'Innovative solutions for modern businesses'}</p>
      <a href="#" class="inline-block bg-white text-gray-900 px-8 py-4 rounded-xl font-semibold hover:bg-opacity-90 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1">${ctaText || 'Get Started'}</a>
    </div>
  </header>
  
  <section id="features" class="py-20 bg-gray-50">
    <div class="container mx-auto px-6">
      <h2 class="text-4xl font-bold text-center mb-4">Why Choose Us</h2>
      <p class="text-center text-gray-600 mb-12 max-w-2xl mx-auto">Everything you need to succeed</p>
      <div class="grid md:grid-cols-4 gap-8">
        ${featureList.map(f => `
        <div class="text-center p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition">
          <div class="w-14 h-14 mx-auto mb-4 rounded-full gradient-bg flex items-center justify-center">
            <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h3 class="font-semibold text-lg mb-2">${f}</h3>
          <p class="text-gray-600 text-sm">Excellence in every detail</p>
        </div>`).join('')}
      </div>
    </div>
  </section>
  
  <section id="testimonials" class="py-20">
    <div class="container mx-auto px-6">
      <h2 class="text-4xl font-bold text-center mb-12">What Our Clients Say</h2>
      <div class="grid md:grid-cols-3 gap-8">
        <div class="p-8 bg-gray-50 rounded-2xl">
          <div class="flex items-center gap-1 mb-4" style="color: ${accent}">★★★★★</div>
          <p class="italic mb-4 text-gray-700">"Amazing service! Highly recommended."</p>
          <p class="font-semibold">- Happy Customer</p>
        </div>
        <div class="p-8 bg-gray-50 rounded-2xl">
          <div class="flex items-center gap-1 mb-4" style="color: ${accent}">★★★★★</div>
          <p class="italic mb-4 text-gray-700">"Transformed our business completely."</p>
          <p class="font-semibold">- Business Owner</p>
        </div>
        <div class="p-8 bg-gray-50 rounded-2xl">
          <div class="flex items-center gap-1 mb-4" style="color: ${accent}">★★★★★</div>
          <p class="italic mb-4 text-gray-700">"Best decision we ever made."</p>
          <p class="font-semibold">- CEO, Tech Corp</p>
        </div>
      </div>
    </div>
  </section>
  
  <section id="pricing" class="py-20 gradient-bg text-white">
    <div class="container mx-auto px-6 text-center">
      <h2 class="text-4xl font-bold mb-6">Ready to Get Started?</h2>
      <p class="text-xl mb-8 opacity-90 max-w-2xl mx-auto">Join thousands of satisfied customers today.</p>
      <a href="#" class="inline-block bg-white text-gray-900 px-8 py-4 rounded-xl font-semibold hover:bg-opacity-90 transition shadow-lg">${ctaText || 'Start Free Trial'}</a>
    </div>
  </section>
  
  <footer class="bg-gray-900 text-white py-12">
    <div class="container mx-auto px-6">
      <div class="flex flex-col md:flex-row justify-between items-center">
        <p class="text-2xl font-bold mb-4 md:mb-0">${businessName}</p>
        <div class="flex gap-6">
          <a href="#" class="hover:opacity-80">Privacy</a>
          <a href="#" class="hover:opacity-80">Terms</a>
          <a href="#" class="hover:opacity-80">Contact</a>
        </div>
      </div>
      <p class="text-center mt-8 opacity-60">© ${new Date().getFullYear()} ${businessName}. All rights reserved.</p>
    </div>
  </footer>
</body>
</html>`;
}
