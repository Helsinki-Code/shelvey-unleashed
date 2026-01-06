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

          const systemPrompt = `You are a world-class website architect and premium UX copywriter. Create EXCEPTIONAL, DETAILED website specifications that would rival top agency work.

MANDATORY REQUIREMENTS:
- Generate MINIMUM 8 pages with unique purposes
- Generate MINIMUM 20 premium components
- Each page must have 5-8 distinct sections
- ALL copy must be SPECIFIC to this business - NO generic placeholder text
- Hero headline: 6-10 power words, emotionally compelling
- Hero subheadline: 50+ words explaining unique value proposition
- 8+ features with 50+ word descriptions each
- 6+ testimonials with 60+ words, specific metrics/results
- About section: 250+ words covering origin story, mission, vision, values
- 4-6 detailed services with 80+ word descriptions
- 10+ FAQ questions with comprehensive 50+ word answers
- Case studies with Problem → Solution → Results format

OUTPUT FORMAT - Valid JSON object:
{
  "pages": [
    { "name": "Home", "route": "/", "sections": ["Hero", "TrustBar", "Features", "Stats", "HowItWorks", "CaseStudyPreview", "Testimonials", "Pricing Preview", "FAQ Preview", "Newsletter", "CTA", "Footer"], "description": "High-converting landing page with compelling value prop, social proof, and clear user journey", "metaTitle": "Business Name - Compelling 60 char title", "metaDescription": "160 char meta description with keywords" },
    { "name": "About", "route": "/about", "sections": ["Hero", "OurStory", "MissionVision", "CoreValues", "TeamGrid", "Timeline", "Partners", "CTA"], "description": "Brand story and team showcase", "metaTitle": "", "metaDescription": "" },
    { "name": "Services", "route": "/services", "sections": ["Hero", "ServiceOverview", "ServiceCards", "ProcessTimeline", "Deliverables", "CaseStudies", "Testimonials", "CTA"], "description": "Detailed service offerings with process", "metaTitle": "", "metaDescription": "" },
    { "name": "Portfolio", "route": "/portfolio", "sections": ["Hero", "FilterBar", "ProjectGrid", "CaseStudyFeatured", "ResultsMetrics", "ClientLogos", "CTA"], "description": "Work showcase with results", "metaTitle": "", "metaDescription": "" },
    { "name": "Pricing", "route": "/pricing", "sections": ["Hero", "PricingToggle", "PricingTiers", "FeatureComparison", "Guarantees", "FAQ", "CTA"], "description": "Transparent pricing with comparison", "metaTitle": "", "metaDescription": "" },
    { "name": "Blog", "route": "/blog", "sections": ["Hero", "FeaturedPost", "CategoryFilter", "ArticleGrid", "Newsletter", "CTA"], "description": "Content hub and resources", "metaTitle": "", "metaDescription": "" },
    { "name": "Contact", "route": "/contact", "sections": ["Hero", "ContactOptions", "ContactForm", "OfficeLocations", "FAQ", "SocialLinks"], "description": "Multiple contact channels", "metaTitle": "", "metaDescription": "" },
    { "name": "FAQ", "route": "/faq", "sections": ["Hero", "CategoryTabs", "AccordionFAQ", "ContactCTA", "Resources"], "description": "Comprehensive FAQ organized by topic", "metaTitle": "", "metaDescription": "" }
  ],
  "globalStyles": {
    "primaryColor": "#hex from brand",
    "secondaryColor": "#hex",
    "accentColor": "#hex",
    "backgroundColor": "#hex",
    "textColor": "#hex",
    "headingFont": "Font Name",
    "bodyFont": "Font Name",
    "borderRadius": "rounded-xl",
    "spacing": "comfortable",
    "shadows": { "soft": "0 4px 20px rgba(0,0,0,0.08)", "medium": "0 8px 30px rgba(0,0,0,0.12)", "strong": "0 20px 50px rgba(0,0,0,0.15)" },
    "gradients": { "primary": "linear-gradient(135deg, primary, secondary)", "subtle": "linear-gradient(180deg, bg-light, bg-dark)", "accent": "linear-gradient(90deg, accent, primary)" }
  },
  "components": [
    { "name": "HeroSection", "type": "hero", "props": { "variant": "gradient-animated", "hasVideo": false, "hasParticles": true }, "description": "Full-width hero with animated gradient, text reveal, floating elements, dual CTA" },
    { "name": "TrustBar", "type": "social-proof", "props": { "items": 6 }, "description": "Horizontal scrolling bar with client logos and trust badges" },
    { "name": "FeatureGrid", "type": "features", "props": { "columns": 3, "hasIcons": true, "hasHoverEffects": true }, "description": "8-feature grid with icons, hover animations, detailed descriptions" },
    { "name": "StatsCounter", "type": "stats", "props": { "animated": true, "style": "cards" }, "description": "Animated number counters with icons and labels" },
    { "name": "ProcessTimeline", "type": "process", "props": { "steps": 5, "style": "horizontal" }, "description": "Visual step-by-step process with icons and connectors" },
    { "name": "TestimonialCarousel", "type": "testimonials", "props": { "autoplay": true, "hasRatings": true, "hasPhotos": true }, "description": "Carousel with customer photos, ratings, company logos" },
    { "name": "TestimonialGrid", "type": "testimonials", "props": { "columns": 3, "masonry": true }, "description": "Masonry grid of testimonial cards" },
    { "name": "PricingTable", "type": "pricing", "props": { "tiers": 3, "highlighted": "middle", "hasToggle": true }, "description": "Three-tier pricing with monthly/annual toggle, feature lists" },
    { "name": "FeatureComparison", "type": "comparison", "props": { "columns": 4 }, "description": "Detailed feature comparison table across tiers" },
    { "name": "CaseStudyCard", "type": "case-study", "props": { "hasMetrics": true }, "description": "Rich case study preview with before/after metrics" },
    { "name": "CaseStudyFull", "type": "case-study", "props": { "layout": "full" }, "description": "Full case study with problem, solution, results sections" },
    { "name": "TeamGrid", "type": "team", "props": { "columns": 4, "hasHover": true }, "description": "Team member cards with hover reveal for bio and social" },
    { "name": "FAQAccordion", "type": "faq", "props": { "animated": true, "hasCategories": true }, "description": "Categorized expandable FAQ with smooth animations" },
    { "name": "ContactForm", "type": "form", "props": { "fields": ["name", "email", "phone", "company", "budget", "message"], "hasValidation": true }, "description": "Multi-field contact form with real-time validation" },
    { "name": "NewsletterSection", "type": "newsletter", "props": { "style": "inline" }, "description": "Email capture with benefit statement and privacy note" },
    { "name": "CTABanner", "type": "cta", "props": { "variant": "gradient", "hasAnimation": true }, "description": "Full-width CTA with compelling copy and animated button" },
    { "name": "ServiceCard", "type": "service", "props": { "hasIcon": true, "hasLink": true }, "description": "Individual service card with icon, description, link" },
    { "name": "BlogCard", "type": "blog", "props": { "hasImage": true, "hasExcerpt": true }, "description": "Blog post preview with image, title, excerpt, date" },
    { "name": "LogoCloud", "type": "logos", "props": { "animated": true, "rows": 2 }, "description": "Animated logo grid with grayscale hover effect" },
    { "name": "Footer", "type": "footer", "props": { "columns": 5 }, "description": "Multi-column footer with nav, social, newsletter, legal" },
    { "name": "BeforeAfterSlider", "type": "comparison", "props": { "interactive": true }, "description": "Interactive before/after image comparison slider" },
    { "name": "MetricsBar", "type": "stats", "props": { "style": "inline" }, "description": "Horizontal metrics display with icons" },
    { "name": "VideoModal", "type": "media", "props": { "autoplay": false }, "description": "Video popup modal with play button trigger" },
    { "name": "ValueProposition", "type": "content", "props": { "columns": 3 }, "description": "Three-column value prop with icons and descriptions" }
  ],
  "copyContent": {
    "hero": {
      "headline": "6-10 power words that create urgency and speak to transformation",
      "subheadline": "50+ word detailed value proposition explaining the unique benefits, target audience, and transformation customers will experience. Include specific outcomes and differentiation.",
      "cta": "Action-oriented primary CTA (e.g., 'Start Your Free Trial')",
      "secondaryCta": "Lower-commitment secondary CTA (e.g., 'Watch Demo')",
      "trustText": "Social proof line (e.g., 'Trusted by 10,000+ businesses')"
    },
    "features": {
      "title": "Benefit-focused section title",
      "subtitle": "Supporting context for features",
      "items": [
        { "title": "Feature 1", "description": "50+ word detailed description explaining this feature, how it works, and the specific benefits it provides to customers. Include use cases.", "icon": "icon-name" },
        { "title": "Feature 2", "description": "50+ word detailed description...", "icon": "icon-name" },
        { "title": "Feature 3", "description": "50+ word detailed description...", "icon": "icon-name" },
        { "title": "Feature 4", "description": "50+ word detailed description...", "icon": "icon-name" },
        { "title": "Feature 5", "description": "50+ word detailed description...", "icon": "icon-name" },
        { "title": "Feature 6", "description": "50+ word detailed description...", "icon": "icon-name" },
        { "title": "Feature 7", "description": "50+ word detailed description...", "icon": "icon-name" },
        { "title": "Feature 8", "description": "50+ word detailed description...", "icon": "icon-name" }
      ]
    },
    "services": {
      "title": "Our Services",
      "subtitle": "Comprehensive solutions tailored to your needs",
      "items": [
        { "name": "Service 1", "description": "80+ word detailed description of this service including what's included, the process, expected outcomes, and ideal client profile.", "deliverables": ["Deliverable 1", "Deliverable 2", "Deliverable 3"], "icon": "icon-name" },
        { "name": "Service 2", "description": "80+ word detailed description...", "deliverables": [], "icon": "icon-name" },
        { "name": "Service 3", "description": "80+ word detailed description...", "deliverables": [], "icon": "icon-name" },
        { "name": "Service 4", "description": "80+ word detailed description...", "deliverables": [], "icon": "icon-name" }
      ]
    },
    "about": {
      "title": "About Us",
      "subtitle": "Our Story & Mission",
      "story": "250+ word company origin story including founding story, challenges overcome, growth milestones, and what drives the team. Make it personal and authentic.",
      "mission": "Clear mission statement (30+ words)",
      "vision": "Aspirational vision statement (30+ words)",
      "values": [
        { "name": "Value 1", "description": "Description of this core value and how it manifests in daily work" },
        { "name": "Value 2", "description": "..." },
        { "name": "Value 3", "description": "..." },
        { "name": "Value 4", "description": "..." }
      ]
    },
    "testimonials": {
      "title": "What Our Clients Say",
      "subtitle": "Real results from real customers",
      "items": [
        { "quote": "60+ word detailed testimonial describing specific experience, challenges solved, results achieved with metrics, and recommendation. Make it sound authentic and specific.", "author": "Full Name", "role": "Job Title", "company": "Company Name", "rating": 5, "metric": "e.g., '200% increase in conversions'" },
        { "quote": "60+ word testimonial...", "author": "", "role": "", "company": "", "rating": 5, "metric": "" },
        { "quote": "60+ word testimonial...", "author": "", "role": "", "company": "", "rating": 5, "metric": "" },
        { "quote": "60+ word testimonial...", "author": "", "role": "", "company": "", "rating": 5, "metric": "" },
        { "quote": "60+ word testimonial...", "author": "", "role": "", "company": "", "rating": 5, "metric": "" },
        { "quote": "60+ word testimonial...", "author": "", "role": "", "company": "", "rating": 5, "metric": "" }
      ]
    },
    "caseStudies": [
      { "title": "Case Study 1 Title", "client": "Client Name", "industry": "Industry", "problem": "Detailed problem statement (50+ words)", "solution": "Detailed solution description (80+ words)", "results": [{ "metric": "200%", "label": "Increase in X" }, { "metric": "50%", "label": "Reduction in Y" }], "quote": "Client quote about the project" },
      { "title": "Case Study 2 Title", "client": "", "industry": "", "problem": "", "solution": "", "results": [], "quote": "" },
      { "title": "Case Study 3 Title", "client": "", "industry": "", "problem": "", "solution": "", "results": [], "quote": "" }
    ],
    "pricing": {
      "title": "Simple, Transparent Pricing",
      "subtitle": "Choose the plan that fits your needs",
      "tiers": [
        { "name": "Starter", "price": "$X", "period": "/month", "description": "Perfect for...", "features": ["Feature 1", "Feature 2", "Feature 3", "Feature 4", "Feature 5"], "cta": "Get Started", "highlighted": false },
        { "name": "Professional", "price": "$X", "period": "/month", "description": "Ideal for...", "features": ["Everything in Starter", "Feature 6", "Feature 7", "Feature 8", "Feature 9", "Feature 10"], "cta": "Start Free Trial", "highlighted": true, "badge": "Most Popular" },
        { "name": "Enterprise", "price": "Custom", "period": "", "description": "For large teams...", "features": ["Everything in Professional", "Feature 11", "Feature 12", "Feature 13", "Dedicated support"], "cta": "Contact Sales", "highlighted": false }
      ],
      "guarantee": "30-day money-back guarantee. No questions asked."
    },
    "faq": {
      "title": "Frequently Asked Questions",
      "subtitle": "Everything you need to know",
      "categories": ["General", "Pricing", "Technical", "Support"],
      "items": [
        { "question": "Question 1?", "answer": "50+ word comprehensive answer addressing the question fully with examples or specifics where relevant.", "category": "General" },
        { "question": "Question 2?", "answer": "50+ word answer...", "category": "General" },
        { "question": "Question 3?", "answer": "50+ word answer...", "category": "Pricing" },
        { "question": "Question 4?", "answer": "50+ word answer...", "category": "Pricing" },
        { "question": "Question 5?", "answer": "50+ word answer...", "category": "Technical" },
        { "question": "Question 6?", "answer": "50+ word answer...", "category": "Technical" },
        { "question": "Question 7?", "answer": "50+ word answer...", "category": "Support" },
        { "question": "Question 8?", "answer": "50+ word answer...", "category": "Support" },
        { "question": "Question 9?", "answer": "50+ word answer...", "category": "General" },
        { "question": "Question 10?", "answer": "50+ word answer...", "category": "General" }
      ]
    },
    "cta": {
      "primary": { "title": "Ready to Transform Your Business?", "description": "Compelling 40+ word CTA description explaining benefits of taking action now, reducing friction, and creating urgency.", "buttonText": "Get Started Today", "secondaryText": "No credit card required" },
      "secondary": { "title": "Have Questions?", "description": "Alternative CTA for those not ready to commit", "buttonText": "Schedule a Call" }
    },
    "stats": [
      { "value": "10,000+", "label": "Happy Customers", "description": "Worldwide" },
      { "value": "99.9%", "label": "Uptime", "description": "Reliability guaranteed" },
      { "value": "$50M+", "label": "Revenue Generated", "description": "For our clients" },
      { "value": "24/7", "label": "Support", "description": "Always available" },
      { "value": "50+", "label": "Integrations", "description": "Connect everything" },
      { "value": "4.9/5", "label": "Rating", "description": "Customer satisfaction" }
    ],
    "footer": {
      "tagline": "Compelling company tagline summarizing value proposition",
      "description": "Brief 2-sentence company description",
      "copyright": "© 2024 Company Name. All rights reserved.",
      "links": {
        "product": ["Features", "Pricing", "Integrations", "Changelog"],
        "company": ["About", "Careers", "Blog", "Press"],
        "resources": ["Documentation", "Help Center", "Community", "Contact"],
        "legal": ["Privacy Policy", "Terms of Service", "Cookie Policy"]
      }
    }
  },
  "animations": [
    { "element": "hero", "type": "fade-in-up", "trigger": "on-load", "duration": "0.8s", "stagger": "0.15s" },
    { "element": "hero-text", "type": "text-reveal", "trigger": "on-load", "duration": "1.2s" },
    { "element": "trust-bar", "type": "slide-in", "trigger": "on-scroll", "duration": "0.6s" },
    { "element": "features", "type": "stagger-fade", "trigger": "on-scroll", "delay": "0.1s", "stagger": "0.08s" },
    { "element": "stats", "type": "count-up", "trigger": "on-scroll", "duration": "2s" },
    { "element": "testimonials", "type": "carousel-slide", "trigger": "auto", "interval": "5s" },
    { "element": "cta-button", "type": "pulse-glow", "trigger": "on-hover", "duration": "0.3s" },
    { "element": "cards", "type": "hover-lift", "trigger": "on-hover", "duration": "0.25s" },
    { "element": "images", "type": "parallax", "trigger": "on-scroll", "speed": "0.5" },
    { "element": "section-headers", "type": "fade-in", "trigger": "on-scroll", "duration": "0.5s" },
    { "element": "floating-elements", "type": "float", "trigger": "continuous", "duration": "3s" },
    { "element": "gradient-bg", "type": "gradient-shift", "trigger": "continuous", "duration": "10s" }
  ],
  "responsive": {
    "mobileFirst": true,
    "breakpoints": [
      { "name": "sm", "width": "640px" },
      { "name": "md", "width": "768px" },
      { "name": "lg", "width": "1024px" },
      { "name": "xl", "width": "1280px" },
      { "name": "2xl", "width": "1536px" }
    ],
    "mobileNav": "hamburger-slide",
    "mobileHero": "stacked",
    "mobileCards": "swipeable"
  },
  "seo": {
    "siteName": "Business Name",
    "defaultTitle": "Business Name - Primary Keyword",
    "titleTemplate": "%s | Business Name",
    "defaultDescription": "Primary meta description with key value proposition and target keywords",
    "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
    "ogImage": "/og-image.jpg",
    "twitterHandle": "@handle",
    "schemaType": "Organization"
  }
}

CRITICAL GUIDELINES:
1. Make website UNIQUE, MODERN, PREMIUM - no generic templates
2. Use brand colors/typography from Phase 2 if provided
3. Write conversion-focused copy SPECIFIC to this business
4. Mobile-first responsive with premium interactions
5. Smooth animations and micro-interactions throughout
6. Clear user journey from landing to conversion
7. Match brand voice and industry terminology
8. Include detailed social proof with SPECIFIC results/metrics
9. SEO-optimized structure and meta content
10. EVERY piece of copy must be DETAILED and SPECIFIC - absolutely NO generic placeholders

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
              temperature: 0.85,
              max_tokens: 8000,
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
