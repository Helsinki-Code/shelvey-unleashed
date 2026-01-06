import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  prompt?: string;
  conversationId?: string;
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
    const { projectId, businessName, industry, description, branding, prompt } = body;

    // Build the enhanced prompt for v0
    const enhancedPrompt = `
Create a modern, professional landing page for a business with the following details:

Business Name: ${businessName}
Industry: ${industry}
Description: ${description}

${branding ? `
Brand Guidelines:
- Primary Color: ${branding.primaryColor || 'use a professional blue'}
- Secondary Color: ${branding.secondaryColor || 'complementary color'}
- Accent Color: ${branding.accentColor || 'for CTAs and highlights'}
- Heading Font: ${branding.headingFont || 'modern sans-serif'}
- Body Font: ${branding.bodyFont || 'readable sans-serif'}
` : ''}

${prompt ? `Additional Requirements: ${prompt}` : ''}

Requirements:
1. Create a complete, production-ready React component with TypeScript
2. Use Tailwind CSS for all styling
3. Include Framer Motion animations for smooth interactions
4. Make it fully responsive (mobile-first)
5. Include these sections:
   - Hero section with compelling headline and CTA
   - Features/Services section
   - About/Why Us section
   - Testimonials or Social Proof
   - Contact/CTA section
   - Footer
6. Use modern design patterns and beautiful gradients
7. Ensure excellent accessibility (proper contrast, semantic HTML)
8. Add hover states and micro-interactions

Output only the React component code, no explanations.
`.trim();

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
