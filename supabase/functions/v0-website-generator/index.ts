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
    const { projectId, businessName, industry, description, branding, approvedSpecs, prompt, editMode } = body;

// Build sections from approved specs or use defaults
    const sections = approvedSpecs?.pages?.[0]?.sections || ['Hero', 'Features', 'About', 'Testimonials', 'Contact', 'Footer'];
    
    // Extract brand assets from approved specs
    const brandAssets = approvedSpecs?.brandAssets || {};
    const logoUrl = brandAssets.logoUrl || branding?.logo;
    const iconUrl = brandAssets.iconUrl;
    const primaryColor = brandAssets.primaryColorHex || approvedSpecs?.globalStyles?.primaryColor || branding?.primaryColor;
    const secondaryColor = brandAssets.secondaryColorHex || approvedSpecs?.globalStyles?.secondaryColor || branding?.secondaryColor;
    const accentColor = brandAssets.accentColorHex || approvedSpecs?.globalStyles?.accentColor || branding?.accentColor;
    
    // Extract image generation prompts from specs
    const imagePrompts = approvedSpecs?.imageGeneration || {};
    const copyImagePrompts = approvedSpecs?.copyContent || {};
    
    // Build image generation instructions
    let imageInstructions = '';
    if (Object.keys(imagePrompts).length > 0 || logoUrl) {
      imageInstructions = `
BRAND ASSETS TO USE:
${logoUrl ? `- Logo URL: ${logoUrl} (USE THIS as the actual logo image src)` : ''}
${iconUrl ? `- Icon URL: ${iconUrl}` : ''}

AI-GENERATED IMAGES (use these prompts with placeholder divs that describe the image):
${imagePrompts.heroBackground ? `- Hero Background: "${imagePrompts.heroBackground}"` : ''}
${copyImagePrompts.hero?.imagePrompt ? `- Hero Visual: "${copyImagePrompts.hero.imagePrompt}"` : ''}
${imagePrompts.sectionBackgrounds?.features ? `- Features Background: "${imagePrompts.sectionBackgrounds.features}"` : ''}
${imagePrompts.sectionBackgrounds?.testimonials ? `- Testimonials Background: "${imagePrompts.sectionBackgrounds.testimonials}"` : ''}
${imagePrompts.sectionBackgrounds?.cta ? `- CTA Background: "${imagePrompts.sectionBackgrounds.cta}"` : ''}

For each image placeholder, add a data-image-prompt attribute with the prompt for AI generation.
Example: <div data-image-prompt="abstract 3D geometric shapes in ${primaryColor || 'brand color'}" className="..." />
`;
    }
    
    // Build copy instructions from approved specs
    let copyInstructions = '';
    if (approvedSpecs?.copyContent) {
      const copy = approvedSpecs.copyContent;
      copyInstructions = `
EXACT COPY TO USE:
Hero:
- Headline: "${copy.hero?.headline || ''}"
- Subheadline: "${copy.hero?.subheadline || ''}"
- CTA Button: "${copy.hero?.cta || 'Get Started'}"
- Secondary CTA: "${copy.hero?.secondaryCta || 'Learn More'}"

Features:
- Title: "${copy.features?.title || ''}"
- Subtitle: "${copy.features?.subtitle || ''}"
${copy.features?.items?.map((f: any, i: number) => `- Feature ${i+1}: "${f.title}" - ${f.description}`).join('\n') || ''}

About:
- Title: "${copy.about?.title || ''}"
- Story: "${copy.about?.story || copy.about?.content || ''}"
- Mission: "${copy.about?.mission || ''}"

Services:
${copy.services?.items?.map((s: any, i: number) => `- Service ${i+1}: "${s.name}" - ${s.description}`).join('\n') || ''}

Testimonials:
${copy.testimonials?.items?.map((t: any, i: number) => `- Testimonial ${i+1}: "${t.quote}" - ${t.author}, ${t.role} at ${t.company}`).join('\n') || ''}

CTA Section:
- Title: "${copy.cta?.primary?.title || copy.cta?.title || ''}"
- Description: "${copy.cta?.primary?.description || copy.cta?.description || ''}"
- Button: "${copy.cta?.primary?.buttonText || copy.cta?.buttonText || 'Start Now'}"

Footer:
- Tagline: "${copy.footer?.tagline || ''}"
- Copyright: "${copy.footer?.copyright || `© ${new Date().getFullYear()} ${businessName}`}"
`;
    }

    // Build style instructions from approved specs
    let styleInstructions = '';
    if (approvedSpecs?.globalStyles || brandAssets.primaryColorHex) {
      const styles = approvedSpecs?.globalStyles || {};
      styleInstructions = `
DESIGN TOKENS (USE EXACT HEX CODES):
- Primary Color: ${primaryColor || 'professional blue'}
- Secondary Color: ${secondaryColor || 'complementary'}
- Accent Color: ${accentColor || 'for CTAs'}
- Background Color: ${styles.backgroundColor || '#ffffff'}
- Text Color: ${styles.textColor || '#1a1a1a'}
- Heading Font: ${brandAssets.headingFont || styles.headingFont || branding?.headingFont || 'modern sans-serif'}
- Body Font: ${brandAssets.bodyFont || styles.bodyFont || branding?.bodyFont || 'readable sans-serif'}
- Border Radius: ${styles.borderRadius || 'rounded-lg'}
- Spacing: ${styles.spacing || 'comfortable'}

GRADIENTS:
${styles.gradients ? `- Primary Gradient: ${styles.gradients.primary}` : ''}
${styles.gradients ? `- Subtle Gradient: ${styles.gradients.subtle}` : ''}

SHADOWS:
${styles.shadows ? `- Soft: ${styles.shadows.soft}` : ''}
${styles.shadows ? `- Medium: ${styles.shadows.medium}` : ''}
`;
    } else if (branding) {
      styleInstructions = `
Brand Guidelines:
- Primary Color: ${branding.primaryColor || 'professional blue'}
- Secondary Color: ${branding.secondaryColor || 'complementary color'}
- Accent Color: ${branding.accentColor || 'for CTAs and highlights'}
- Heading Font: ${branding.headingFont || 'modern sans-serif'}
- Body Font: ${branding.bodyFont || 'readable sans-serif'}
`;
    }

    // Build the enhanced prompt - handle edit mode vs full generation
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
Create a modern, professional, UNIQUE landing page for:

Business Name: ${businessName}
Industry: ${industry}
Description: ${description}

${imageInstructions}

${styleInstructions}

${copyInstructions}

${prompt ? `Additional Requirements: ${prompt}` : ''}

SECTIONS TO INCLUDE: ${sections.join(', ')}

Requirements:
1. Create a complete, production-ready React component with TypeScript
2. Use Tailwind CSS for all styling - use the EXACT hex color codes provided
3. Include Framer Motion animations for smooth interactions
4. Make it fully responsive (mobile-first)
5. Create a UNIQUE, MODERN, ATTRACTIVE design - avoid generic patterns
6. Use the EXACT copy provided above - do not make up different text
7. Include beautiful gradients, shadows, and micro-interactions
8. Ensure excellent accessibility (proper contrast, semantic HTML)
9. Add hover states and smooth transitions
10. Make it stand out - be creative with layout and visual effects
11. USE THE LOGO URL PROVIDED - add an <img> tag with the logo src
12. Add data-image-prompt attributes to image placeholders for AI generation

Output only the React component code, no explanations.
`.trim();
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial start event
          sendSSE(controller, { 
            type: 'start', 
            message: 'Connecting to v0 Platform API...',
            timestamp: new Date().toISOString()
          });

          // Call v0 API
          console.log('Calling v0 API with prompt length:', enhancedPrompt.length);
          
          const v0Response = await fetch('https://api.v0.dev/v1/chat', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${V0_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: [
                {
                  role: 'user',
                  content: enhancedPrompt,
                }
              ],
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
            message: 'Connected to v0 - Starting generation...',
            timestamp: new Date().toISOString()
          });

          // Process the streaming response
          const reader = v0Response.body?.getReader();
          if (!reader) throw new Error('No response body from v0');

          const decoder = new TextDecoder();
          let fullCode = '';
          let buffer = '';
          let componentCount = 0;
          const components: string[] = ['Hero', 'Features', 'About', 'Testimonials', 'Contact', 'Footer'];

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            
            // Process SSE lines
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
                  
                  // Detect component sections for progress updates
                  if (content.includes('Hero') && componentCount === 0) {
                    componentCount = 1;
                    sendSSE(controller, { 
                      type: 'component_start', 
                      component: 'Hero',
                      progress: 16,
                      message: 'Building Hero section...',
                      timestamp: new Date().toISOString()
                    });
                  } else if (content.includes('Features') && componentCount === 1) {
                    componentCount = 2;
                    sendSSE(controller, { 
                      type: 'component_start', 
                      component: 'Features',
                      progress: 33,
                      message: 'Building Features section...',
                      timestamp: new Date().toISOString()
                    });
                  } else if ((content.includes('About') || content.includes('Why')) && componentCount === 2) {
                    componentCount = 3;
                    sendSSE(controller, { 
                      type: 'component_start', 
                      component: 'About',
                      progress: 50,
                      message: 'Building About section...',
                      timestamp: new Date().toISOString()
                    });
                  } else if (content.includes('Testimonial') && componentCount === 3) {
                    componentCount = 4;
                    sendSSE(controller, { 
                      type: 'component_start', 
                      component: 'Testimonials',
                      progress: 66,
                      message: 'Building Testimonials section...',
                      timestamp: new Date().toISOString()
                    });
                  } else if (content.includes('Contact') && componentCount === 4) {
                    componentCount = 5;
                    sendSSE(controller, { 
                      type: 'component_start', 
                      component: 'Contact',
                      progress: 83,
                      message: 'Building Contact section...',
                      timestamp: new Date().toISOString()
                    });
                  } else if (content.includes('Footer') && componentCount === 5) {
                    componentCount = 6;
                    sendSSE(controller, { 
                      type: 'component_start', 
                      component: 'Footer',
                      progress: 95,
                      message: 'Building Footer section...',
                      timestamp: new Date().toISOString()
                    });
                  }

                  // Stream code chunks
                  sendSSE(controller, { 
                    type: 'code_chunk', 
                    content: content,
                    timestamp: new Date().toISOString()
                  });
                }
              } catch (e) {
                // Ignore parse errors for incomplete JSON
              }
            }
          }

          // Clean up the code - extract just the React component
          let cleanedCode = fullCode;
          
          // Try to extract code from markdown code blocks
          const codeBlockMatch = fullCode.match(/```(?:tsx?|jsx?|javascript|typescript)?\n([\s\S]*?)```/);
          if (codeBlockMatch) {
            cleanedCode = codeBlockMatch[1];
          }

          // Send complete event with full code
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
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
