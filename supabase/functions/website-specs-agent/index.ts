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

// Helper to safely stringify and truncate large objects
const safeStringify = (obj: any, maxLength = 3000): string => {
  if (!obj) return 'Not available';
  try {
    const str = JSON.stringify(obj, null, 2);
    if (str.length > maxLength) {
      return str.substring(0, maxLength) + '\n... [truncated for brevity]';
    }
    return str;
  } catch {
    return 'Unable to serialize';
  }
};

// Extract color hex codes from various palette formats
const extractColorHexes = (colors: any): { primary: string; secondary: string; accent: string; background: string; text: string } => {
  const defaults = { primary: '#3B82F6', secondary: '#8B5CF6', accent: '#F59E0B', background: '#FFFFFF', text: '#1A1A2E' };
  
  if (!colors) return defaults;
  
  // Handle array of color objects
  if (Array.isArray(colors.colors || colors)) {
    const colorArr = colors.colors || colors;
    return {
      primary: colorArr[0]?.hex || colorArr[0]?.value || defaults.primary,
      secondary: colorArr[1]?.hex || colorArr[1]?.value || defaults.secondary,
      accent: colorArr[2]?.hex || colorArr[2]?.value || defaults.accent,
      background: colorArr[4]?.hex || colorArr[4]?.value || defaults.background,
      text: colorArr[3]?.hex || colorArr[3]?.value || defaults.text,
    };
  }
  
  // Handle direct hex properties
  return {
    primary: colors.primary || colors.primaryColor || defaults.primary,
    secondary: colors.secondary || colors.secondaryColor || defaults.secondary,
    accent: colors.accent || colors.accentColor || defaults.accent,
    background: colors.background || colors.backgroundColor || defaults.background,
    text: colors.text || colors.textColor || defaults.text,
  };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');

  const supabase = createClient(supabaseUrl, supabaseKey);

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

    const stream = new ReadableStream({
      async start(controller) {
        try {
          sendSSE(controller, 'progress', { progress: 5, message: 'Analyzing business context from Phase 1 & Phase 2...' });

          // ============================================
          // BUILD RICH CONTEXT FROM ALL PHASES
          // ============================================
          
          // Extract brand colors deterministically
          const brandColors = extractColorHexes(phase2Data?.colors);
          
          // Build comprehensive business context
          let businessContext = `
═══════════════════════════════════════════════════════════════
BUSINESS PROFILE
═══════════════════════════════════════════════════════════════
Name: ${project.name}
Industry: ${project.industry}
Description: ${project.description}
`;

          // Phase 1: Full research data
          if (phase1Data) {
            businessContext += `
═══════════════════════════════════════════════════════════════
PHASE 1: MARKET RESEARCH & STRATEGY (Approved)
═══════════════════════════════════════════════════════════════

📊 MARKET ANALYSIS:
${safeStringify(phase1Data.marketAnalysis, 2000)}

🎯 TARGET AUDIENCE PROFILE:
${safeStringify(phase1Data.targetAudienceProfile || phase1Data.targetAudience, 1500)}

🏆 COMPETITOR LANDSCAPE:
${safeStringify(phase1Data.competitorReport || phase1Data.competitors, 1500)}

📈 TREND FORECAST:
${safeStringify(phase1Data.trendForecast, 1000)}

💎 UNIQUE VALUE PROPOSITION:
${phase1Data.uniqueValue || 'Not specified - infer from business description'}
`;
          }

          // Phase 2: Full branding data with ACTUAL asset URLs
          if (phase2Data) {
            businessContext += `
═══════════════════════════════════════════════════════════════
PHASE 2: BRAND IDENTITY (Approved)
═══════════════════════════════════════════════════════════════

🎨 BRAND COLOR PALETTE (USE THESE EXACT HEX CODES):
- Primary Color: ${brandColors.primary}
- Secondary Color: ${brandColors.secondary}
- Accent Color: ${brandColors.accent}
- Background Color: ${brandColors.background}
- Text Color: ${brandColors.text}

✏️ TYPOGRAPHY:
${safeStringify(phase2Data.typography, 500)}

🗣️ BRAND VOICE:
${phase2Data.brandVoice || 'Professional, trustworthy, innovative'}

🖼️ APPROVED BRAND ASSETS (ACTUAL URLs TO USE):
${phase2Data.logo ? `- Logo: ${phase2Data.logo}` : ''}
${phase2Data.icon ? `- App Icon: ${phase2Data.icon}` : ''}
${phase2Data.banner ? `- Banner: ${phase2Data.banner}` : ''}
${phase2Data.assets?.map((a: any) => `- ${a.type || a.name}: ${a.imageUrl}`).join('\n') || ''}
`;
          }

          sendSSE(controller, 'progress', { progress: 15, message: 'Discovering optimal site architecture for this business...' });

          // ============================================
          // DYNAMIC SYSTEM PROMPT (NO HARDCODING!)
          // ============================================
          const systemPrompt = `You are a world-class website architect, premium UX strategist, and visual art director. Your job is to DISCOVER and DESIGN the optimal website structure for THIS SPECIFIC BUSINESS based on the provided context.

═══════════════════════════════════════════════════════════════
CRITICAL RULES - READ CAREFULLY
═══════════════════════════════════════════════════════════════

🚫 DO NOT USE PRE-DEFINED PAGE LISTS
🚫 DO NOT USE GENERIC TEMPLATE STRUCTURES  
🚫 DO NOT ASSUME "Home/About/Services/Contact" IS CORRECT
🚫 DO NOT COPY EXAMPLE STRUCTURES FROM TRAINING DATA

✅ ANALYZE the business type, industry, and goals
✅ DECIDE pages based on what THIS business actually needs
✅ USE industry-specific terminology (not generic "Services" if they offer "Programs", "Treatments", "Plans", etc.)
✅ VARY the structure based on business complexity

═══════════════════════════════════════════════════════════════
DYNAMIC PAGE COUNT RULES
═══════════════════════════════════════════════════════════════

Based on business type, generate APPROPRIATE number of pages:

SIMPLE LOCAL SERVICE (plumber, salon, etc): 5-7 pages
PROFESSIONAL SERVICES (agency, consulting): 7-10 pages
SAAS/TECH PRODUCT: 8-12 pages
E-COMMERCE: 10-15 pages (collections, product pages, etc.)
PORTFOLIO/CREATIVE: 6-9 pages
HEALTHCARE/MEDICAL: 8-12 pages
EDUCATION/COURSES: 9-14 pages
ENTERPRISE B2B: 10-14 pages

═══════════════════════════════════════════════════════════════
INDUSTRY-SPECIFIC PAGE EXAMPLES (CHOOSE WHAT FITS)
═══════════════════════════════════════════════════════════════

SaaS/Tech: Pricing, Integrations, Security, API Docs, Changelog, Status, Enterprise
E-commerce: Collections, Product, Cart, Checkout, Order Tracking, Returns, Size Guide
Healthcare: Conditions, Treatments, Practitioners, Book Appointment, Patient Portal, Insurance
Agency: Case Studies, Process, Capabilities, Industries, Team, Careers, Insights
Restaurant: Menu, Reservations, Locations, Catering, Events, Gift Cards
Real Estate: Listings, Property Detail, Neighborhoods, Agents, Mortgage Calculator, Virtual Tours
Education: Courses, Curriculum, Instructors, Student Portal, Certifications, Resources
Fitness: Classes, Trainers, Schedule, Membership, Facilities, Nutrition

═══════════════════════════════════════════════════════════════
COMPONENT GENERATION RULES
═══════════════════════════════════════════════════════════════

Generate 18-40 UNIQUE components based on complexity:
- Each component must have a clear, specific purpose
- Components should match the industry vocabulary
- Include both layout components and interactive elements
- Specify animations, hover states, and micro-interactions

═══════════════════════════════════════════════════════════════
COPY CONTENT REQUIREMENTS
═══════════════════════════════════════════════════════════════

ALL copy must be:
- Specific to THIS business (use their name, industry terminology)
- Based on the target audience profile from Phase 1
- Aligned with the brand voice from Phase 2
- Written as FINAL production copy, not placeholders

Word count minimums:
- Hero headline: 6-12 power words
- Hero subheadline: 40-80 words with specific value proposition
- Feature descriptions: 40-60 words each
- Service descriptions: 60-100 words each
- About/Story section: 200-400 words
- Testimonials: 50-80 words each (realistic, metric-driven)
- FAQ answers: 40-80 words each

═══════════════════════════════════════════════════════════════
IMAGE PLAN (CRITICAL FOR AI GENERATION)
═══════════════════════════════════════════════════════════════

For every visual element, provide a detailed "imagePlan" array. Each slot must include:

{
  "slotId": "unique-identifier",
  "pageRoute": "/page-route",
  "sectionId": "section-name",
  "placement": "hero-background | inline | card | icon | avatar | gallery",
  "aspectRatio": "16:9 | 4:3 | 1:1 | 3:2 | 9:16",
  "prompt": "60-100 word detailed prompt including: subject, style, composition, lighting, mood, and BRAND COLORS (${brandColors.primary}, ${brandColors.secondary})",
  "negativePrompt": "what to avoid in the image",
  "priority": "high | medium | low"
}

EVERY section that could benefit from imagery MUST have an image slot.
Prioritize: Hero (always high), Feature icons, Team photos, Case study visuals, Service illustrations.

═══════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════

Return a valid JSON object with this structure:

{
  "siteArchitecture": {
    "siteType": "saas | ecommerce | portfolio | service | corporate | blog | landing",
    "complexity": "simple | medium | complex",
    "totalPages": number,
    "totalComponents": number,
    "primaryGoal": "lead generation | sales | booking | information | portfolio showcase | community"
  },
  "pages": [
    {
      "name": "Page Name",
      "route": "/route",
      "purpose": "What this page achieves for the business",
      "sections": ["Section1", "Section2", ...],
      "metaTitle": "SEO title under 60 chars",
      "metaDescription": "SEO description under 160 chars"
    }
  ],
  "components": [
    {
      "name": "ComponentName",
      "type": "hero | features | testimonials | cta | form | pricing | team | gallery | faq | footer | etc",
      "props": { detailed configuration },
      "animations": { "type": "fadeIn | slideUp | scaleIn | stagger", "duration": "0.5s", "delay": "0s" },
      "description": "What this component does and why"
    }
  ],
  "globalStyles": {
    "primaryColor": "${brandColors.primary}",
    "secondaryColor": "${brandColors.secondary}",
    "accentColor": "${brandColors.accent}",
    "backgroundColor": "${brandColors.background}",
    "textColor": "${brandColors.text}",
    "headingFont": "from Phase 2 typography",
    "bodyFont": "from Phase 2 typography",
    "borderRadius": "none | sm | md | lg | xl | 2xl | full",
    "spacing": "compact | comfortable | spacious",
    "shadows": { "soft": "...", "medium": "...", "strong": "..." },
    "gradients": { "primary": "...", "subtle": "...", "accent": "..." }
  },
  "copyContent": {
    "hero": {
      "headline": "Powerful headline specific to this business",
      "subheadline": "40-80 word value proposition",
      "primaryCta": "Action button text",
      "secondaryCta": "Secondary action",
      "trustIndicators": ["Indicator 1", "Indicator 2"]
    },
    "features": {
      "sectionTitle": "...",
      "sectionSubtitle": "...",
      "items": [
        { "title": "...", "description": "40-60 words", "icon": "lucide-icon-name" }
      ]
    },
    "services": {
      "sectionTitle": "...",
      "items": [
        { "name": "...", "description": "60-100 words", "deliverables": [], "price": "optional" }
      ]
    },
    "about": {
      "sectionTitle": "...",
      "story": "200-400 word company story",
      "mission": "30+ words",
      "vision": "30+ words",
      "values": [{ "name": "...", "description": "..." }],
      "team": [{ "name": "...", "role": "...", "bio": "..." }]
    },
    "testimonials": {
      "sectionTitle": "...",
      "items": [
        { "quote": "50-80 words with specific results/metrics", "author": "...", "role": "...", "company": "...", "metric": "e.g., 300% increase" }
      ]
    },
    "pricing": {
      "sectionTitle": "...",
      "tiers": [
        { "name": "...", "price": "...", "period": "...", "features": [], "cta": "...", "highlighted": boolean }
      ]
    },
    "faq": {
      "sectionTitle": "...",
      "items": [
        { "question": "...", "answer": "40-80 words" }
      ]
    },
    "cta": {
      "headline": "...",
      "description": "...",
      "buttonText": "...",
      "secondaryText": "..."
    },
    "footer": {
      "tagline": "...",
      "copyright": "© 2025 ${project.name}. All rights reserved.",
      "socialLinks": [],
      "legalLinks": ["Privacy Policy", "Terms of Service"]
    }
  },
  "imagePlan": [
    {
      "slotId": "hero-background",
      "pageRoute": "/",
      "sectionId": "hero",
      "placement": "hero-background",
      "aspectRatio": "16:9",
      "prompt": "60-100 word detailed prompt with brand colors",
      "negativePrompt": "...",
      "priority": "high"
    }
  ],
  "seoStrategy": {
    "primaryKeywords": [],
    "secondaryKeywords": [],
    "localSeo": boolean,
    "schemaTypes": ["Organization", "Product", "Service", "FAQ", etc]
  }
}

Remember: 
- Every decision must be derived from the business context provided
- Use the EXACT brand colors: Primary ${brandColors.primary}, Secondary ${brandColors.secondary}, Accent ${brandColors.accent}
- Reference the target audience when writing copy
- Reference competitor insights when positioning
- Make it unique and premium, not template-like`;

          sendSSE(controller, 'progress', { progress: 25, message: 'AI is designing custom site architecture...' });

          // Call AI with the rich context
          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-pro',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: businessContext }
              ],
              temperature: 0.8,
              max_tokens: 16000,
            }),
          });

          if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            console.error('AI API error:', aiResponse.status, errorText);
            throw new Error(`AI API error: ${aiResponse.status}`);
          }

          sendSSE(controller, 'progress', { progress: 60, message: 'Parsing website specifications...' });

          const aiData = await aiResponse.json();
          const rawContent = aiData.choices?.[0]?.message?.content;

          if (!rawContent) {
            throw new Error('No content returned from AI');
          }

          // Parse JSON from response (handle markdown code blocks)
          let specs: any;
          try {
            let jsonStr = rawContent;
            const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
              jsonStr = jsonMatch[1];
            }
            // Clean up any trailing commas or issues
            jsonStr = jsonStr.trim().replace(/,(\s*[}\]])/g, '$1');
            specs = JSON.parse(jsonStr);
          } catch (parseError) {
            console.error('JSON parse error:', parseError, 'Raw content:', rawContent.substring(0, 500));
            throw new Error('Failed to parse AI response as JSON');
          }

          sendSSE(controller, 'progress', { progress: 75, message: 'Injecting brand assets and validating...' });

          // ============================================
          // DETERMINISTIC ASSET INJECTION
          // ============================================
          // Force-inject actual asset URLs regardless of what the model output
          specs.brandAssets = {
            logoUrl: phase2Data?.logo || null,
            iconUrl: phase2Data?.icon || null,
            bannerUrl: phase2Data?.banner || null,
            primaryColorHex: brandColors.primary,
            secondaryColorHex: brandColors.secondary,
            accentColorHex: brandColors.accent,
            backgroundColorHex: brandColors.background,
            textColorHex: brandColors.text,
            headingFont: phase2Data?.typography?.headingFont || specs.globalStyles?.headingFont || 'Inter',
            bodyFont: phase2Data?.typography?.bodyFont || specs.globalStyles?.bodyFont || 'Inter',
            assetLibrary: phase2Data?.assets || [],
          };

          // Force globalStyles colors to match
          if (specs.globalStyles) {
            specs.globalStyles.primaryColor = brandColors.primary;
            specs.globalStyles.secondaryColor = brandColors.secondary;
            specs.globalStyles.accentColor = brandColors.accent;
            specs.globalStyles.backgroundColor = brandColors.background;
            specs.globalStyles.textColor = brandColors.text;
          }

          // ============================================
          // VALIDATION & AUTO-REPAIR
          // ============================================
          const pageCount = specs.pages?.length || 0;
          const componentCount = specs.components?.length || 0;
          const imageSlotCount = specs.imagePlan?.length || 0;

          console.log(`Specs validation: ${pageCount} pages, ${componentCount} components, ${imageSlotCount} image slots`);

          // Ensure minimums
          if (pageCount < 5) {
            console.warn('Page count below minimum, specs may be incomplete');
          }
          if (componentCount < 15) {
            console.warn('Component count below minimum, specs may be incomplete');
          }
          if (imageSlotCount < 5) {
            console.warn('Image slots below minimum, adding defaults');
            // Add essential image slots if missing
            if (!specs.imagePlan) specs.imagePlan = [];
            const existingSlotIds = specs.imagePlan.map((s: any) => s.slotId);
            
            const essentialSlots = [
              {
                slotId: 'hero-background',
                pageRoute: '/',
                sectionId: 'hero',
                placement: 'hero-background',
                aspectRatio: '16:9',
                prompt: `Professional ${project.industry} imagery with modern aesthetic, gradient overlay transitioning from ${brandColors.primary} to ${brandColors.secondary}, abstract geometric shapes, dynamic lighting, high-end corporate feel, ultra-wide cinematic composition`,
                negativePrompt: 'text, watermark, low quality, blurry',
                priority: 'high'
              },
              {
                slotId: 'about-team',
                pageRoute: '/about',
                sectionId: 'team',
                placement: 'inline',
                aspectRatio: '16:9',
                prompt: `Diverse professional team collaborating in modern ${project.industry} office, warm natural lighting, brand colors ${brandColors.accent} accents in environment, candid yet polished, depth of field`,
                negativePrompt: 'posed, stiff, artificial',
                priority: 'medium'
              },
            ];

            essentialSlots.forEach(slot => {
              if (!existingSlotIds.includes(slot.slotId)) {
                specs.imagePlan.push(slot);
              }
            });
          }

          sendSSE(controller, 'progress', { progress: 85, message: 'Saving specifications to database...' });

          // Save to database
          const { data: deliverable, error: saveError } = await supabase
            .from('phase_deliverables')
            .upsert({
              phase_id: phaseId,
              user_id: user.id,
              name: 'Website Specifications',
              deliverable_type: 'website_specs',
              description: `Dynamic website blueprint: ${specs.siteArchitecture?.totalPages || pageCount} pages, ${specs.siteArchitecture?.totalComponents || componentCount} components, ${specs.imagePlan?.length || 0} image slots`,
              status: 'review',
              generated_content: { specs, generatedAt: new Date().toISOString() },
              ceo_approved: true, // Auto-approve by CEO
            }, { onConflict: 'phase_id,deliverable_type' })
            .select()
            .single();

          if (saveError) {
            console.error('Save error:', saveError);
            throw saveError;
          }

          // Log activity
          await supabase.from('agent_activity_logs').insert({
            agent_id: 'website-specs-agent',
            agent_name: 'Website Specs Agent',
            action: 'Generated dynamic website specifications',
            status: 'completed',
            metadata: {
              projectId,
              phaseId,
              pageCount: specs.pages?.length,
              componentCount: specs.components?.length,
              imageSlots: specs.imagePlan?.length,
              siteType: specs.siteArchitecture?.siteType,
            },
          });

          sendSSE(controller, 'progress', { progress: 95, message: 'Finalizing...' });

          // Send complete event
          sendSSE(controller, 'complete', { 
            specs,
            progress: 100,
            message: `Website specifications complete: ${specs.pages?.length || 0} pages, ${specs.components?.length || 0} components, ${specs.imagePlan?.length || 0} image slots ready for generation`
          });
          
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          sendSSE(controller, 'error', { 
            message: error instanceof Error ? error.message : 'Unknown error' 
          });
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
