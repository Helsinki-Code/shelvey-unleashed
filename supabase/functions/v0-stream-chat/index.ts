import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

enum ParseState {
  NARRATIVE,
  FENCE_START,
  FILE_BLOCK,
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, projectId, project, branding, specs, existingFiles } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context about existing files so the AI doesn't regenerate everything
    let existingFilesContext = "";
    if (existingFiles && existingFiles.length > 0) {
      existingFilesContext = `\n\nEXISTING PROJECT FILES (already generated - DO NOT regenerate these unless the user asks to modify them):
${existingFiles.map((f: string) => `- ${f}`).join("\n")}

IMPORTANT: Only generate NEW files or files the user explicitly asks to change. Reference existing files by import but do NOT regenerate them.`;
    }

    const systemPrompt = `You are an expert React/TypeScript website builder. Generate complete, production-ready React applications.

Project: ${project?.name || "Website"}
Industry: ${project?.industry || "General"}
Description: ${project?.description || ""}
${branding ? `Branding: Primary color: ${branding.primaryColor}, Secondary: ${branding.secondaryColor}, Accent: ${branding.accentColor}` : ""}
${specs ? `Specifications: ${JSON.stringify(specs)}` : ""}
${existingFilesContext}

CRITICAL RULES:

1. GENERATE ALL FILES IN ONE RESPONSE. Never ask to "continue". Complete EVERYTHING in a single response.

2. Keep explanation EXTREMELY BRIEF (1-2 sentences max).

3. NEVER paste code in your explanation. ONLY use file blocks.

4. Output ALL files using this exact format:

\`\`\`tsx:src/App.tsx
// complete file content
\`\`\`

\`\`\`tsx:src/components/Hero.tsx
// complete file content
\`\`\`

5. REQUIRED FILES FOR A NEW WEBSITE:
   - src/App.tsx (main app component)
   - src/index.css (Tailwind + global styles)
   - All section/page components

6. Use React 18, Tailwind CSS, and Lucide icons.
7. Make all components fully responsive with beautiful, modern UI.
8. Include smooth hover effects and transitions.
9. Use semantic HTML and proper accessibility.
10. Do NOT use framer-motion imports - use plain CSS transitions/animations.`;

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
        max_completion_tokens: 32000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = "";
        let parseState = ParseState.NARRATIVE;
        let narrativeBuffer = "";
        let fileBuffer = "";
        let currentFilePath = "";
        let currentFileType = "";
        let fenceAccumulator = "";
        let upstreamDone = false;
        let filesEmitted = 0;

        const emitContent = (text: string) => {
          if (text) {
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ type: "content", content: text })}\n\n`
            ));
          }
        };

        const emitFile = (path: string, type: string, content: string) => {
          filesEmitted++;
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              type: "file",
              file: { path: path.trim(), content: content.trim(), type },
            })}\n\n`
          ));
        };

        const emitStatus = (label: string) => {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: "status", label })}\n\n`
          ));
        };

        try {
          outer: while (reader) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6).trim();
                if (data === "[DONE]") {
                  upstreamDone = true;
                  break;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  const finishReason = parsed.choices?.[0]?.finish_reason;

                  if (finishReason === "stop" || finishReason === "length") {
                    upstreamDone = true;
                    break;
                  }

                  if (content) {
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
                            if (narrativeBuffer.length >= 15 || char === '\n') {
                              emitContent(narrativeBuffer);
                              narrativeBuffer = "";
                            }
                          }
                          break;

                        case ParseState.FENCE_START:
                          if (char === '\n') {
                            const headerParts = fenceAccumulator.split(':');
                            if (headerParts.length >= 2) {
                              currentFileType = headerParts[0].trim();
                              currentFilePath = headerParts.slice(1).join(':').trim();
                              parseState = ParseState.FILE_BLOCK;
                              fileBuffer = "";
                              emitStatus(`Generating ${currentFilePath}...`);
                            } else {
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
                  // Partial JSON
                }
              }
            }

            if (upstreamDone) break outer;
          }

          try {
            if (reader) await reader.cancel();
          } catch { /* ignore */ }

          // Flush remaining
          if (narrativeBuffer) {
            emitContent(narrativeBuffer);
          }
          if (fileBuffer && currentFilePath) {
            emitFile(currentFilePath, currentFileType, fileBuffer);
          }

          // Emit completion summary
          emitContent(`\n\n✅ Generation complete — ${filesEmitted} file${filesEmitted !== 1 ? 's' : ''} created.`);
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));

        } finally {
          controller.close();
        }
      },
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
