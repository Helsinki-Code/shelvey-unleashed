import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  projectId: string;
  phaseId: string;
  project: {
    name: string;
    industry: string;
    description: string;
  };
  phase1Data?: any;
  phase2Data?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const openaiKey = Deno.env.get('OPENAI_API_KEY');

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Helper to send SSE
  const sendSSE = (controller: ReadableStreamDefaultController, type: string, data: any) => {
    const message = `data: ${JSON.stringify({ type, ...data })}\n\n`;
    controller.enqueue(new TextEncoder().encode(message));
  };

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    const body: RequestBody = await req.json();
    const { projectId, phaseId, project, phase1Data, phase2Data } = body;

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          sendSSE(controller, 'progress', { progress: 5, message: 'Analyzing Phase 1 & 2 deliverables...' });

          // Build context from approved deliverables
          let context = `Business: ${project.name}\nIndustry: ${project.industry}\nDescription: ${project.description}\n\n`;
          
          if (phase1Data) {
            context += `MARKET RESEARCH:\n`;
            if (phase1Data.targetAudience) context += `Target Audience: ${JSON.stringify(phase1Data.targetAudience)}\n`;
            if (phase1Data.competitors) context += `Competitors: ${JSON.stringify(phase1Data.competitors)}\n`;
            if (phase1Data.uniqueValue) context += `Unique Value: ${phase1Data.uniqueValue}\n`;
          }

          if (phase2Data) {
            context += `\nBRAND ASSETS:\n`;
            if (phase2Data.colors) context += `Colors: ${JSON.stringify(phase2Data.colors)}\n`;
            if (phase2Data.typography) context += `Typography: ${JSON.stringify(phase2Data.typography)}\n`;
            if (phase2Data.brandVoice) context += `Brand Voice: ${phase2Data.brandVoice}\n`;
          }

          sendSSE(controller, 'progress', { progress: 15, message: 'Building comprehensive website blueprint...' });

          const systemPrompt = `You are an expert website architect and UX copywriter. Based on the business context and approved branding, generate COMPREHENSIVE and DETAILED website specifications.

MANDATORY REQUIREMENTS:
- Generate MINIMUM 5 pages (Home, About, Services/Features, Contact, Pricing or FAQ)
- Generate MINIMUM 12 components
- Each page must have at least 4 sections
- Hero section must have compelling, industry-specific headline (20+ words for subheadline)
- Features section must have at least 6 feature items with detailed descriptions (30+ words each)
- About section must have 100+ words of content
- Include at least 4 testimonials with realistic quotes (40+ words each)
- All copy must be specific to the business, NOT generic placeholder text

Your output must be a valid JSON object with this structure:
{
  "pages": [
    { "name": "Home", "route": "/", "sections": ["Hero", "Features", "Stats", "About Preview", "Testimonials", "CTA", "Footer"], "description": "Main landing page with compelling value proposition and social proof" },
    { "name": "About", "route": "/about", "sections": ["Hero", "Our Story", "Mission & Vision", "Team", "Values", "CTA"], "description": "Company story, team, and values" },
    { "name": "Services", "route": "/services", "sections": ["Hero", "Services Grid", "Process", "Pricing Preview", "FAQ", "CTA"], "description": "Detailed service offerings" },
    { "name": "Contact", "route": "/contact", "sections": ["Hero", "Contact Form", "Office Info", "Map", "FAQ"], "description": "Contact information and form" },
    { "name": "Pricing", "route": "/pricing", "sections": ["Hero", "Pricing Tiers", "Features Comparison", "FAQ", "CTA"], "description": "Pricing plans and comparison" }
  ],
  "globalStyles": {
    "primaryColor": "#hex",
    "secondaryColor": "#hex", 
    "accentColor": "#hex",
    "headingFont": "Font Name",
    "bodyFont": "Font Name",
    "borderRadius": "rounded-lg",
    "spacing": "comfortable"
  },
  "components": [
    { "name": "HeroSection", "type": "hero", "props": { "variant": "gradient", "hasVideo": false }, "description": "Full-width hero with gradient background, animated text reveal, and dual CTA buttons" },
    { "name": "FeatureGrid", "type": "features", "props": { "columns": 3, "hasIcons": true }, "description": "Grid of 6 feature cards with icons, hover animations, and detailed descriptions" },
    { "name": "StatsSection", "type": "stats", "props": { "animated": true }, "description": "Animated counter section showing key business metrics" },
    { "name": "TestimonialCarousel", "type": "testimonials", "props": { "autoplay": true }, "description": "Carousel of customer testimonials with photos and ratings" },
    { "name": "PricingTable", "type": "pricing", "props": { "tiers": 3, "highlighted": "middle" }, "description": "Three-tier pricing table with feature comparison" },
    { "name": "ContactForm", "type": "form", "props": { "fields": ["name", "email", "phone", "message"] }, "description": "Multi-field contact form with validation" },
    { "name": "TeamGrid", "type": "team", "props": { "columns": 4 }, "description": "Team member cards with photos and social links" },
    { "name": "FAQAccordion", "type": "faq", "props": { "animated": true }, "description": "Expandable FAQ section with smooth animations" },
    { "name": "CTABanner", "type": "cta", "props": { "variant": "gradient" }, "description": "Full-width call-to-action with compelling copy" },
    { "name": "ProcessTimeline", "type": "process", "props": { "steps": 4 }, "description": "Visual timeline showing how the service works" },
    { "name": "LogoCloud", "type": "social-proof", "props": {}, "description": "Grid of client/partner logos" },
    { "name": "Footer", "type": "footer", "props": { "columns": 4 }, "description": "Multi-column footer with navigation, social links, and newsletter signup" }
  ],
  "copyContent": {
    "hero": { "headline": "Compelling headline specific to the business", "subheadline": "Detailed value proposition explaining what makes this business unique and the benefits customers will receive (minimum 25 words)", "cta": "Get Started Today", "secondaryCta": "Learn More" },
    "features": { "title": "Why Choose Us", "subtitle": "Discover what sets us apart", "items": [
      { "title": "Feature 1", "description": "Detailed description of this feature and its benefits (30+ words)" },
      { "title": "Feature 2", "description": "Detailed description of this feature and its benefits (30+ words)" },
      { "title": "Feature 3", "description": "Detailed description of this feature and its benefits (30+ words)" },
      { "title": "Feature 4", "description": "Detailed description of this feature and its benefits (30+ words)" },
      { "title": "Feature 5", "description": "Detailed description of this feature and its benefits (30+ words)" },
      { "title": "Feature 6", "description": "Detailed description of this feature and its benefits (30+ words)" }
    ] },
    "about": { "title": "About Us", "subtitle": "Our Story", "content": "Comprehensive about content (100+ words) explaining company history, mission, values, and what drives the team. Include specifics about the industry expertise and commitment to customers." },
    "testimonials": { "title": "What Our Customers Say", "subtitle": "Real stories from real customers", "items": [
      { "quote": "Detailed testimonial quote (40+ words) describing specific experience and results", "author": "Customer Name", "role": "Job Title, Company Name", "rating": 5 },
      { "quote": "Another detailed testimonial (40+ words)", "author": "Customer Name", "role": "Job Title, Company Name", "rating": 5 },
      { "quote": "Third detailed testimonial (40+ words)", "author": "Customer Name", "role": "Job Title, Company Name", "rating": 5 },
      { "quote": "Fourth detailed testimonial (40+ words)", "author": "Customer Name", "role": "Job Title, Company Name", "rating": 5 }
    ] },
    "cta": { "title": "Ready to Get Started?", "description": "Compelling call-to-action description explaining the next steps and benefits of taking action now", "buttonText": "Start Your Journey" },
    "footer": { "tagline": "Company tagline", "copyright": "© 2024 Company Name. All rights reserved." },
    "stats": [
      { "value": "1000+", "label": "Happy Customers" },
      { "value": "50+", "label": "Team Members" },
      { "value": "10+", "label": "Years Experience" },
      { "value": "99%", "label": "Satisfaction Rate" }
    ]
  },
  "animations": [
    { "element": "hero", "type": "fade-in-up", "trigger": "on-load", "duration": "0.8s" },
    { "element": "features", "type": "stagger-fade", "trigger": "on-scroll", "delay": "0.1s" },
    { "element": "stats", "type": "count-up", "trigger": "on-scroll", "duration": "2s" },
    { "element": "testimonials", "type": "slide", "trigger": "auto", "interval": "5s" },
    { "element": "cta", "type": "pulse", "trigger": "on-hover" }
  ],
  "responsive": {
    "mobileFirst": true,
    "breakpoints": [{ "name": "sm", "width": "640px" }, { "name": "md", "width": "768px" }, { "name": "lg", "width": "1024px" }, { "name": "xl", "width": "1280px" }],
    "mobileNav": "hamburger"
  }
}

Guidelines:
1. Make the website UNIQUE, MODERN, and ATTRACTIVE - no generic templates
2. Use the brand colors and typography from Phase 2 if provided
3. Write compelling, conversion-focused copy specific to this business
4. Design for mobile-first responsive experience
5. Include smooth animations and micro-interactions
6. Create a clear user journey from landing to conversion
7. Ensure all copy matches the brand voice and industry
8. Include detailed social proof elements (testimonials with specific results)
9. Design accessible and SEO-friendly structure
10. Every piece of copy must be SPECIFIC and DETAILED - no placeholders like "Lorem ipsum"

IMPORTANT: Output ONLY the JSON object, no markdown code blocks or explanations.`;

          sendSSE(controller, 'progress', { progress: 25, message: 'Generating page structure...' });

          if (!openaiKey) {
            throw new Error('OpenAI API key not configured');
          }

          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: context }
              ],
              temperature: 0.8,
              max_tokens: 4000,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error('OpenAI error:', errorData);
            throw new Error(errorData.error?.message || 'OpenAI API failed');
          }

          sendSSE(controller, 'progress', { progress: 50, message: 'Crafting website copy...' });

          const data = await response.json();
          const content = data.choices[0]?.message?.content;

          if (!content) {
            throw new Error('No content generated');
          }

          sendSSE(controller, 'progress', { progress: 70, message: 'Defining component specifications...' });

          // Parse the JSON response
          let specs;
          try {
            // Clean potential markdown wrapping
            let cleanContent = content.trim();
            if (cleanContent.startsWith('```json')) {
              cleanContent = cleanContent.slice(7);
            }
            if (cleanContent.startsWith('```')) {
              cleanContent = cleanContent.slice(3);
            }
            if (cleanContent.endsWith('```')) {
              cleanContent = cleanContent.slice(0, -3);
            }
            specs = JSON.parse(cleanContent.trim());
          } catch (parseError) {
            console.error('Parse error:', parseError, 'Content:', content);
            throw new Error('Failed to parse specifications');
          }

          sendSSE(controller, 'progress', { progress: 85, message: 'Saving specifications...' });

          // Check for existing deliverable
          const { data: existing } = await supabase
            .from('phase_deliverables')
            .select('id')
            .eq('phase_id', phaseId)
            .eq('deliverable_type', 'website_specs')
            .maybeSingle();

          const deliverableData = {
            name: 'Website Specifications',
            description: 'Detailed website architecture, copy, and styling specifications',
            deliverable_type: 'website_specs',
            phase_id: phaseId,
            user_id: user.id,
            status: 'review',
            generated_content: {
              specs,
              generatedAt: new Date().toISOString(),
              context: {
                phase1Data,
                phase2Data
              }
            },
            ceo_approved: false,
            user_approved: false,
            version: existing ? 2 : 1,
            updated_at: new Date().toISOString()
          };

          if (existing) {
            await supabase
              .from('phase_deliverables')
              .update(deliverableData)
              .eq('id', existing.id);
          } else {
            await supabase
              .from('phase_deliverables')
              .insert(deliverableData);
          }

          // Log agent activity
          await supabase.from('agent_activity_logs').insert({
            agent_id: 'website-specs-agent',
            agent_name: 'Website Copy & Specs Agent',
            action: 'Generated website specifications',
            status: 'completed',
            metadata: {
              projectId,
              phaseId,
              pagesCount: specs.pages?.length || 0,
              componentsCount: specs.components?.length || 0
            }
          });

          sendSSE(controller, 'progress', { progress: 90, message: 'Triggering CEO review...' });

          // Auto-trigger CEO review for the deliverable
          const { data: createdDeliverable } = await supabase
            .from('phase_deliverables')
            .select('id')
            .eq('phase_id', phaseId)
            .eq('deliverable_type', 'website_specs')
            .maybeSingle();

          if (createdDeliverable) {
            // Auto-approve by CEO (simulated AI review)
            await supabase
              .from('phase_deliverables')
              .update({ ceo_approved: true })
              .eq('id', createdDeliverable.id);
          }

          sendSSE(controller, 'progress', { progress: 100, message: 'Website specifications complete!' });
          sendSSE(controller, 'complete', { specs });

        } catch (error) {
          console.error('Stream error:', error);
          sendSSE(controller, 'error', { message: error instanceof Error ? error.message : 'Generation failed' });
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Request error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
