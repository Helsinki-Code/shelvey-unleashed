import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WEBSITE_GENERATION_PROMPT = `You are an expert web developer. Generate a complete, modern, responsive landing page.

IMPORTANT: Return ONLY valid JSON with this exact structure (no markdown, no code blocks):
{
  "html": "<!DOCTYPE html>...",
  "css": "/* styles */",
  "js": "// scripts"
}

Requirements for the landing page:
1. Hero section with compelling headline and CTA button
2. Features/benefits section with icons
3. Testimonials section with placeholder quotes
4. Pricing/CTA section
5. Footer with contact info and social links

Technical requirements:
- Use Tailwind CSS via CDN
- Fully responsive (mobile-first)
- Modern gradient backgrounds
- Smooth animations and transitions
- SEO meta tags included
- Clean, semantic HTML5
- Accessibility best practices`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    
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
      projectId 
    } = await req.json();

    if (!businessName) {
      return new Response(JSON.stringify({ error: "Business name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the user prompt with business details
    const userPrompt = `Create a landing page for:

Business Name: ${businessName}
Industry: ${industry || 'Technology'}
Headline: ${headline || `Transform Your Business with ${businessName}`}
Description: ${description || `${businessName} provides innovative solutions for modern businesses.`}
Features: ${features?.join(', ') || 'Fast, Reliable, Secure, Scalable'}
CTA Text: ${ctaText || 'Get Started Today'}
Primary Color: ${brandColors?.primary || '#6366f1'}
Secondary Color: ${brandColors?.secondary || '#8b5cf6'}

Generate the complete landing page code now.`;

    console.log("Generating website for:", businessName);

    // Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: WEBSITE_GENERATION_PROMPT },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 8192,
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
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        websiteCode = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      // Fallback: create a basic website structure
      websiteCode = {
        html: generateFallbackHTML(businessName, headline, description, features, ctaText, brandColors),
        css: "",
        js: ""
      };
    }

    // Save to database
    const { data: website, error: insertError } = await supabase
      .from('generated_websites')
      .insert({
        user_id: user.id,
        project_id: projectId,
        name: businessName,
        html_content: websiteCode.html,
        css_content: websiteCode.css || "",
        js_content: websiteCode.js || "",
        metadata: {
          industry,
          headline,
          description,
          features,
          ctaText,
          brandColors,
          generatedAt: new Date().toISOString()
        },
        status: 'draft'
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
      agent_id: 'agent-8',
      agent_name: 'Visual Design Agent',
      action: 'generate_website',
      status: 'completed',
      metadata: { websiteId: website.id, businessName },
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
        status: website.status
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
  brandColors?: { primary?: string; secondary?: string }
): string {
  const primary = brandColors?.primary || '#6366f1';
  const secondary = brandColors?.secondary || '#8b5cf6';
  const featureList = features || ['Fast', 'Reliable', 'Secure', 'Scalable'];
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${businessName}</title>
  <meta name="description" content="${description || `${businessName} - Your trusted partner`}">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    :root { --primary: ${primary}; --secondary: ${secondary}; }
    .gradient-bg { background: linear-gradient(135deg, ${primary}, ${secondary}); }
  </style>
</head>
<body class="font-sans antialiased">
  <header class="gradient-bg text-white">
    <nav class="container mx-auto px-6 py-4 flex justify-between items-center">
      <div class="text-2xl font-bold">${businessName}</div>
      <div class="space-x-6 hidden md:flex">
        <a href="#features" class="hover:opacity-80">Features</a>
        <a href="#testimonials" class="hover:opacity-80">Testimonials</a>
        <a href="#pricing" class="hover:opacity-80">Pricing</a>
      </div>
    </nav>
    <div class="container mx-auto px-6 py-24 text-center">
      <h1 class="text-5xl font-bold mb-6">${headline || `Welcome to ${businessName}`}</h1>
      <p class="text-xl mb-8 opacity-90">${description || 'Innovative solutions for modern businesses'}</p>
      <a href="#" class="bg-white text-gray-900 px-8 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition">${ctaText || 'Get Started'}</a>
    </div>
  </header>
  
  <section id="features" class="py-20 bg-gray-50">
    <div class="container mx-auto px-6">
      <h2 class="text-3xl font-bold text-center mb-12">Why Choose Us</h2>
      <div class="grid md:grid-cols-4 gap-8">
        ${featureList.map(f => `
        <div class="text-center p-6 bg-white rounded-xl shadow-lg">
          <div class="w-12 h-12 mx-auto mb-4 rounded-full gradient-bg flex items-center justify-center">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h3 class="font-semibold text-lg">${f}</h3>
        </div>`).join('')}
      </div>
    </div>
  </section>
  
  <section id="testimonials" class="py-20">
    <div class="container mx-auto px-6">
      <h2 class="text-3xl font-bold text-center mb-12">What Our Clients Say</h2>
      <div class="grid md:grid-cols-3 gap-8">
        <div class="p-6 bg-gray-50 rounded-xl">
          <p class="italic mb-4">"Amazing service! Highly recommended."</p>
          <p class="font-semibold">- Happy Customer</p>
        </div>
        <div class="p-6 bg-gray-50 rounded-xl">
          <p class="italic mb-4">"Transformed our business completely."</p>
          <p class="font-semibold">- Business Owner</p>
        </div>
        <div class="p-6 bg-gray-50 rounded-xl">
          <p class="italic mb-4">"Best decision we ever made."</p>
          <p class="font-semibold">- CEO, Tech Corp</p>
        </div>
      </div>
    </div>
  </section>
  
  <section id="pricing" class="py-20 gradient-bg text-white">
    <div class="container mx-auto px-6 text-center">
      <h2 class="text-3xl font-bold mb-6">Ready to Get Started?</h2>
      <p class="text-xl mb-8 opacity-90">Join thousands of satisfied customers today.</p>
      <a href="#" class="bg-white text-gray-900 px-8 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition">${ctaText || 'Start Free Trial'}</a>
    </div>
  </section>
  
  <footer class="bg-gray-900 text-white py-12">
    <div class="container mx-auto px-6 text-center">
      <p class="text-2xl font-bold mb-4">${businessName}</p>
      <p class="opacity-60">© ${new Date().getFullYear()} ${businessName}. All rights reserved.</p>
    </div>
  </footer>
</body>
</html>`;
}
