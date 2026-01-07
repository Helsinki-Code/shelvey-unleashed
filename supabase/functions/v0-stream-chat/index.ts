import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Streaming state machine states
enum ParseState {
  NARRATIVE,    // Normal text - emit as content
  FENCE_START,  // Detected ``` - check for file block
  FILE_BLOCK,   // Inside file block - buffer content
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, projectId, project, branding, specs } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Updated system prompt - instructs AI to generate ALL files at once
    const systemPrompt = `You are an expert React/TypeScript website builder. Generate complete, production-ready React applications.

Project: ${project?.name || 'Website'}
Industry: ${project?.industry || 'General'}
Description: ${project?.description || ''}
${branding ? `Branding: Primary color: ${branding.primaryColor}, Secondary: ${branding.secondaryColor}` : ''}
${specs ? `Specifications: ${JSON.stringify(specs)}` : ''}

CRITICAL RULES - FOLLOW EXACTLY:

1. GENERATE ALL FILES IN ONE RESPONSE - Never ask the user to "continue" or split generation across multiple messages. Complete the ENTIRE application in a single response.

2. Keep explanation EXTREMELY BRIEF (1-2 sentences max): "Creating a complete landing page with hero, features, pricing, and contact sections."

3. NEVER paste code in your explanation. ONLY use file blocks.

4. Output ALL files using this exact format:

\`\`\`tsx:src/App.tsx
// complete file content
\`\`\`

\`\`\`tsx:src/components/Hero.tsx
// complete file content  
\`\`\`

\`\`\`css:src/index.css
/* styles */
\`\`\`

5. REQUIRED FILES FOR ANY WEBSITE:
   - src/App.tsx (main app with routing)
   - src/index.css (global styles)
   - All page components
   - All section components (Hero, Features, Footer, etc.)
   - Shared components (Button, Card, etc.)

6. Generate EVERYTHING the user needs in ONE response. If they ask for a landing page, include ALL sections, header, footer, and every component.

7. NEVER say "continue" or "I'll create more files next" - finish completely.

8. Use React 18, Tailwind CSS, Framer Motion, and Lucide icons.

9. Make all components fully responsive with beautiful, modern UI.

10. Include smooth animations and micro-interactions.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Create a ReadableStream that processes and filters the response
    const stream = new ReadableStream({
      async start(controller) {
        let buffer = "";
        let parseState = ParseState.NARRATIVE;
        let narrativeBuffer = "";
        let fileBuffer = "";
        let currentFilePath = "";
        let currentFileType = "";
        let fenceAccumulator = "";
        
        const emitContent = (text: string) => {
          if (text) {
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ type: "content", content: text })}\n\n`
            ));
          }
        };
        
        const emitFile = (path: string, type: string, content: string) => {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ 
              type: "file", 
              file: { path: path.trim(), content: content.trim(), type } 
            })}\n\n`
          ));
        };
        
        const emitStatus = (label: string) => {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: "status", label })}\n\n`
          ));
        };

        try {
          while (reader) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6).trim();
                if (data === "[DONE]") {
                  // Flush any remaining narrative
                  if (narrativeBuffer.trim()) {
                    emitContent(narrativeBuffer);
                  }
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  continue;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  
                  if (content) {
                    // Process character by character for file block detection
                    for (const char of content) {
                      switch (parseState) {
                        case ParseState.NARRATIVE:
                          if (char === '`') {
                            fenceAccumulator += char;
                            if (fenceAccumulator === '```') {
                              parseState = ParseState.FENCE_START;
                              fenceAccumulator = "";
                            }
                          } else {
                            if (fenceAccumulator) {
                              narrativeBuffer += fenceAccumulator;
                              fenceAccumulator = "";
                            }
                            narrativeBuffer += char;
                            
                            // Emit content in small chunks for real-time feel
                            if (narrativeBuffer.length >= 10 || char === '\n') {
                              emitContent(narrativeBuffer);
                              narrativeBuffer = "";
                            }
                          }
                          break;
                          
                        case ParseState.FENCE_START:
                          if (char === '\n') {
                            // Parse the file header: "tsx:src/App.tsx" or just language
                            const headerParts = fenceAccumulator.split(':');
                            if (headerParts.length >= 2) {
                              currentFileType = headerParts[0].trim();
                              currentFilePath = headerParts.slice(1).join(':').trim();
                              parseState = ParseState.FILE_BLOCK;
                              fileBuffer = "";
                              emitStatus(`Generating ${currentFilePath}...`);
                            } else {
                              // Just a regular code block, not a file
                              narrativeBuffer += "```" + fenceAccumulator + char;
                              parseState = ParseState.NARRATIVE;
                            }
                            fenceAccumulator = "";
                          } else {
                            fenceAccumulator += char;
                          }
                          break;
                          
                        case ParseState.FILE_BLOCK:
                          if (char === '`') {
                            fenceAccumulator += char;
                            if (fenceAccumulator === '```') {
                              // End of file block - emit the file
                              emitFile(currentFilePath, currentFileType, fileBuffer);
                              parseState = ParseState.NARRATIVE;
                              fenceAccumulator = "";
                              fileBuffer = "";
                              currentFilePath = "";
                              currentFileType = "";
                            }
                          } else {
                            if (fenceAccumulator) {
                              fileBuffer += fenceAccumulator;
                              fenceAccumulator = "";
                            }
                            fileBuffer += char;
                          }
                          break;
                      }
                    }
                  }
                } catch {
                  // Partial JSON, continue
                }
              }
            }
          }
          
          // Handle any remaining content
          if (narrativeBuffer.trim()) {
            emitContent(narrativeBuffer);
          }
          if (fileBuffer && currentFilePath) {
            emitFile(currentFilePath, currentFileType, fileBuffer);
          }
          
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: unknown) {
    console.error("v0-stream-chat error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
