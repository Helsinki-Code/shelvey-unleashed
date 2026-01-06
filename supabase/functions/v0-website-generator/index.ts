import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface V0GenerationRequest {
  projectId: string;
  businessName: string;
  industry: string;
  description: string;
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    logo?: string;
    headingFont?: string;
    bodyFont?: string;
  };
  approvedSpecs?: any;
  prompt?: string;
  conversationId?: string;
  selectedPage?: string; // For dynamic page selection
  editMode?: {
    section: string;
    changes: string;
    existingCode: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const encoder = new TextEncoder();
  
  const sendSSE = (controller: ReadableStreamDefaultController, data: any) => {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    controller.enqueue(encoder.encode(message));
  };

  try {
    const V0_API_KEY = Deno.env.get('V0_API_KEY');
    if (!V0_API_KEY) {
      throw new Error('V0_API_KEY is not configured');
    }

    const body: V0GenerationRequest = await req.json();
    const { projectId, businessName, industry, description, branding, approvedSpecs, prompt, editMode, selectedPage } = body;

    // ============================================
    // EXTRACT BRAND ASSETS DETERMINISTICALLY
    // ============================================
    const brandAssets = approvedSpecs?.brandAssets || {};
    const logoUrl = brandAssets.logoUrl || branding?.logo;
    const iconUrl = brandAssets.iconUrl;
    const bannerUrl = brandAssets.bannerUrl;
    
    // Colors - prefer brandAssets (injected deterministically) over globalStyles
    const primaryColor = brandAssets.primaryColorHex || approvedSpecs?.globalStyles?.primaryColor || branding?.primaryColor || '#3B82F6';
    const secondaryColor = brandAssets.secondaryColorHex || approvedSpecs?.globalStyles?.secondaryColor || branding?.secondaryColor || '#8B5CF6';
    const accentColor = brandAssets.accentColorHex || approvedSpecs?.globalStyles?.accentColor || branding?.accentColor || '#F59E0B';
    const backgroundColor = brandAssets.backgroundColorHex || approvedSpecs?.globalStyles?.backgroundColor || '#FFFFFF';
    const textColor = brandAssets.textColorHex || approvedSpecs?.globalStyles?.textColor || '#1A1A2E';
    
    // Fonts
    const headingFont = brandAssets.headingFont || approvedSpecs?.globalStyles?.headingFont || branding?.headingFont || 'Inter';
    const bodyFont = brandAssets.bodyFont || approvedSpecs?.globalStyles?.bodyFont || branding?.bodyFont || 'Inter';

    // ============================================
    // BUILD DYNAMIC SECTIONS FROM SPECS
    // ============================================
    // Get page structure from approved specs (dynamic, not hardcoded)
    let targetPage = approvedSpecs?.pages?.[0]; // Default to first page (usually Home)
    if (selectedPage && approvedSpecs?.pages) {
      targetPage = approvedSpecs.pages.find((p: any) => 
        p.route === selectedPage || p.name.toLowerCase() === selectedPage.toLowerCase()
      ) || targetPage;
    }
    
    const sections = targetPage?.sections || ['Hero', 'Features', 'About', 'Testimonials', 'CTA', 'Footer'];
    const pagePurpose = targetPage?.purpose || targetPage?.description || `Main landing page for ${businessName}`;

    // ============================================
    // BUILD IMAGE INSTRUCTIONS FROM imagePlan
    // ============================================
    const imagePlan = approvedSpecs?.imagePlan || [];
    const relevantImages = imagePlan.filter((img: any) => 
      img.pageRoute === (targetPage?.route || '/') || img.priority === 'high'
    );

    let imageInstructions = '';
    if (logoUrl || relevantImages.length > 0) {
      imageInstructions = `
══════════════════════════════════════════════════════════════════
BRAND ASSETS & IMAGE INSTRUCTIONS
══════════════════════════════════════════════════════════════════

🖼️ ACTUAL BRAND ASSETS (USE THESE EXACT URLs):
${logoUrl ? `<img src="${logoUrl}" alt="${businessName} Logo" className="h-8 w-auto" />` : ''}
${iconUrl ? `- Icon: ${iconUrl}` : ''}
${bannerUrl ? `- Banner: ${bannerUrl}` : ''}

📸 AI-GENERATED IMAGE PLACEHOLDERS:
For each image slot below, create a placeholder <div> with the exact prompt as a data attribute:

${relevantImages.map((img: any) => `
Section: ${img.sectionId}
Placement: ${img.placement}
Aspect Ratio: ${img.aspectRatio}
Code: <div 
  data-image-prompt="${img.prompt}"
  data-aspect-ratio="${img.aspectRatio}"
  className="relative overflow-hidden ${img.aspectRatio === '16:9' ? 'aspect-video' : img.aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[4/3]'} bg-gradient-to-br from-[${primaryColor}]/10 to-[${secondaryColor}]/10 rounded-xl"
>
  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
    <span className="text-sm opacity-50">AI Image: ${img.sectionId}</span>
  </div>
</div>
`).join('\n')}

IMPORTANT: 
- Use the actual logo URL in an <img> tag in header/nav
- For other images, use the placeholder div pattern with data-image-prompt
`;
    }

    // ============================================
    // BUILD COPY INSTRUCTIONS FROM specs.copyContent
    // ============================================
    let copyInstructions = '';
    if (approvedSpecs?.copyContent) {
      const copy = approvedSpecs.copyContent;
      copyInstructions = `
══════════════════════════════════════════════════════════════════
EXACT COPY TO USE (FROM APPROVED SPECS)
══════════════════════════════════════════════════════════════════

🎯 HERO SECTION:
- Headline: "${copy.hero?.headline || ''}"
- Subheadline: "${copy.hero?.subheadline || ''}"
- Primary CTA: "${copy.hero?.primaryCta || copy.hero?.cta || 'Get Started'}"
- Secondary CTA: "${copy.hero?.secondaryCta || 'Learn More'}"
${copy.hero?.trustIndicators ? `- Trust Indicators: ${copy.hero.trustIndicators.join(', ')}` : ''}

⭐ FEATURES:
- Section Title: "${copy.features?.sectionTitle || copy.features?.title || 'Features'}"
- Section Subtitle: "${copy.features?.sectionSubtitle || copy.features?.subtitle || ''}"
${copy.features?.items?.map((f: any, i: number) => `
Feature ${i+1}: "${f.title}"
Description: ${f.description}
Icon: ${f.icon || 'Star'}`).join('\n') || ''}

🏢 ABOUT:
- Section Title: "${copy.about?.sectionTitle || copy.about?.title || 'About Us'}"
- Story: "${copy.about?.story || copy.about?.content || ''}"
- Mission: "${copy.about?.mission || ''}"
- Vision: "${copy.about?.vision || ''}"

💼 SERVICES:
${copy.services?.items?.map((s: any, i: number) => `
Service ${i+1}: "${s.name}"
Description: ${s.description}
${s.deliverables?.length ? `Deliverables: ${s.deliverables.join(', ')}` : ''}`).join('\n') || ''}

💬 TESTIMONIALS:
- Section Title: "${copy.testimonials?.sectionTitle || copy.testimonials?.title || 'What Our Clients Say'}"
${copy.testimonials?.items?.map((t: any, i: number) => `
Testimonial ${i+1}: "${t.quote}"
- Author: ${t.author}
- Role: ${t.role}
- Company: ${t.company}
- Metric: ${t.metric || ''}`).join('\n') || ''}

💰 PRICING:
${copy.pricing?.tiers?.map((tier: any) => `
Tier: ${tier.name} - ${tier.price}/${tier.period || 'month'}
Features: ${tier.features?.join(', ') || ''}
Highlighted: ${tier.highlighted ? 'Yes (popular)' : 'No'}`).join('\n') || ''}

❓ FAQ:
${copy.faq?.items?.map((faq: any) => `
Q: ${faq.question}
A: ${faq.answer}`).join('\n') || ''}

📣 CTA SECTION:
- Headline: "${copy.cta?.headline || copy.cta?.primary?.title || ''}"
- Description: "${copy.cta?.description || copy.cta?.primary?.description || ''}"
- Button: "${copy.cta?.buttonText || copy.cta?.primary?.buttonText || 'Get Started Now'}"

🔗 FOOTER:
- Tagline: "${copy.footer?.tagline || ''}"
- Copyright: "${copy.footer?.copyright || `© ${new Date().getFullYear()} ${businessName}`}"
`;
    }

    // ============================================
    // BUILD STYLE INSTRUCTIONS
    // ============================================
    const styleInstructions = `
══════════════════════════════════════════════════════════════════
DESIGN SYSTEM (USE EXACT VALUES)
══════════════════════════════════════════════════════════════════

🎨 COLOR TOKENS (Tailwind arbitrary values):
- Primary: [${primaryColor}] → bg-[${primaryColor}], text-[${primaryColor}], border-[${primaryColor}]
- Secondary: [${secondaryColor}] → bg-[${secondaryColor}], text-[${secondaryColor}]
- Accent: [${accentColor}] → bg-[${accentColor}], text-[${accentColor}]
- Background: [${backgroundColor}]
- Text: [${textColor}]

🔤 TYPOGRAPHY:
- Headings: font-[${headingFont}] or closest Google Font
- Body: font-[${bodyFont}] or closest Google Font

📐 SPACING & RADIUS:
- Border Radius: ${approvedSpecs?.globalStyles?.borderRadius || 'rounded-xl'}
- Spacing: ${approvedSpecs?.globalStyles?.spacing || 'comfortable (py-20 px-6)'}

🌊 GRADIENTS:
- Primary Gradient: bg-gradient-to-br from-[${primaryColor}] to-[${secondaryColor}]
- Subtle Gradient: bg-gradient-to-b from-[${backgroundColor}] to-[${primaryColor}]/5
- Accent Gradient: bg-gradient-to-r from-[${accentColor}] to-[${primaryColor}]

🌑 SHADOWS:
- Soft: shadow-[0_4px_20px_rgba(0,0,0,0.08)]
- Medium: shadow-[0_8px_30px_rgba(0,0,0,0.12)]
- Glow: shadow-[0_0_40px_${primaryColor}40]
`;

    // ============================================
    // BUILD THE ENHANCED PROMPT
    // ============================================
    let enhancedPrompt = '';
    
    if (editMode) {
      enhancedPrompt = `
I have an existing React website component. I need you to modify ONLY the "${editMode.section}" section based on these changes:

CHANGES REQUESTED: ${editMode.changes}

EXISTING CODE:
\`\`\`tsx
${editMode.existingCode}
\`\`\`

${styleInstructions}

Requirements:
1. Keep all other sections EXACTLY the same
2. Only modify the ${editMode.section} section as requested
3. Maintain the same imports and component structure
4. Use the existing styling patterns
5. Output the COMPLETE component code with the modification

Output only the React component code, no explanations.
`.trim();
    } else {
      enhancedPrompt = `
══════════════════════════════════════════════════════════════════
CREATE A PREMIUM WEBSITE PAGE
══════════════════════════════════════════════════════════════════

Business: ${businessName}
Industry: ${industry}
Description: ${description}

Page: ${targetPage?.name || 'Home'}
Route: ${targetPage?.route || '/'}
Purpose: ${pagePurpose}

${imageInstructions}

${styleInstructions}

${copyInstructions}

${prompt ? `Additional Requirements: ${prompt}` : ''}

══════════════════════════════════════════════════════════════════
SECTIONS TO BUILD: ${sections.join(' → ')}
══════════════════════════════════════════════════════════════════

TECHNICAL REQUIREMENTS:
1. Create a complete, production-ready React component with TypeScript
2. Use Tailwind CSS with the EXACT hex color codes provided (use arbitrary values like bg-[#hex])
3. Include Framer Motion animations for smooth interactions
4. Fully responsive design (mobile-first)
5. Use the EXACT copy text provided above - do not make up different text
6. Include beautiful gradients, shadows, and micro-interactions
7. Proper accessibility (contrast, semantic HTML, alt text)
8. Add hover states and smooth transitions

IMAGE HANDLING:
- ${logoUrl ? `Use this ACTUAL logo: <img src="${logoUrl}" alt="${businessName} logo" />` : 'Create a text logo using the business name'}
- For other images, use placeholder divs with data-image-prompt attributes

COMPONENT STRUCTURE:
- Export a single default function component
- Include all sections in order: ${sections.join(', ')}
- Each section should be visually distinct and premium

Output only the React component code, no explanations or markdown.
`.trim();
    }

    // ============================================
    // STREAMING GENERATION
    // ============================================
    const stream = new ReadableStream({
      async start(controller) {
        try {
          sendSSE(controller, { 
            type: 'start', 
            message: 'Connecting to v0 Platform API...',
            timestamp: new Date().toISOString()
          });

          console.log('Calling v0 API with prompt length:', enhancedPrompt.length);
          
          const v0Response = await fetch('https://api.v0.dev/v1/chat', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${V0_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: [{ role: 'user', content: enhancedPrompt }],
              stream: true,
            }),
          });

          if (!v0Response.ok) {
            const errorText = await v0Response.text();
            console.error('v0 API error:', v0Response.status, errorText);
            throw new Error(`v0 API error: ${v0Response.status} - ${errorText}`);
          }

          sendSSE(controller, { 
            type: 'connected', 
            message: 'Connected to v0 - Building your website...',
            timestamp: new Date().toISOString()
          });

          const reader = v0Response.body?.getReader();
          if (!reader) throw new Error('No response body from v0');

          const decoder = new TextDecoder();
          let fullCode = '';
          let buffer = '';
          
          // Dynamic component tracking based on sections
          let componentIndex = 0;
          const totalSections = sections.length;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.trim() || line.startsWith(':')) continue;
              if (!line.startsWith('data: ')) continue;

              const jsonStr = line.slice(6).trim();
              if (jsonStr === '[DONE]') continue;

              try {
                const parsed = JSON.parse(jsonStr);
                const content = parsed.choices?.[0]?.delta?.content;
                
                if (content) {
                  fullCode += content;
                  
                  // Dynamic section detection
                  for (let i = componentIndex; i < sections.length; i++) {
                    const sectionName = sections[i];
                    if (content.toLowerCase().includes(sectionName.toLowerCase()) && componentIndex === i) {
                      componentIndex = i + 1;
                      const progressPercent = Math.round((componentIndex / totalSections) * 90) + 5;
                      sendSSE(controller, { 
                        type: 'component_start', 
                        component: sectionName,
                        progress: progressPercent,
                        message: `Building ${sectionName} section...`,
                        timestamp: new Date().toISOString()
                      });
                      break;
                    }
                  }

                  sendSSE(controller, { 
                    type: 'code_chunk', 
                    content: content,
                    timestamp: new Date().toISOString()
                  });
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }

          // Clean up code
          let cleanedCode = fullCode;
          const codeBlockMatch = fullCode.match(/```(?:tsx?|jsx?|javascript|typescript)?\n([\s\S]*?)```/);
          if (codeBlockMatch) {
            cleanedCode = codeBlockMatch[1];
          }

          sendSSE(controller, { 
            type: 'complete', 
            code: cleanedCode,
            progress: 100,
            message: 'Website generation complete!',
            timestamp: new Date().toISOString()
          });

          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          sendSSE(controller, { 
            type: 'error', 
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
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
    console.error('v0 generator error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
