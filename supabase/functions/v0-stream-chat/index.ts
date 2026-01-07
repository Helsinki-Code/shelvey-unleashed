import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const systemPrompt = `You are an expert React/TypeScript website builder. Generate complete, production-ready React components using:
- React 18 with hooks
- Tailwind CSS for styling
- Framer Motion for animations
- Lucide React for icons

Project: ${project?.name || 'Website'}
Industry: ${project?.industry || 'General'}
Description: ${project?.description || ''}
${branding ? `Branding: Primary color: ${branding.primaryColor}, Secondary: ${branding.secondaryColor}` : ''}
${specs ? `Specifications: ${JSON.stringify(specs)}` : ''}

When generating code:
1. Create complete, working React components
2. Use semantic HTML and accessibility best practices
3. Make it fully responsive
4. Include smooth animations
5. After explaining, output each file with format:
   
\`\`\`tsx:src/App.tsx
// file content here
\`\`\`

Generate beautiful, modern UI that matches the project requirements.`;

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

    // Transform the stream to extract files
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(chunk);
      },
    });

    const reader = response.body?.getReader();
    const writer = transformStream.writable.getWriter();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    let buffer = "";
    let fullContent = "";

    (async () => {
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
                // Extract files from full content
                const fileRegex = /```(\w+):([^\n]+)\n([\s\S]*?)```/g;
                let match;
                while ((match = fileRegex.exec(fullContent)) !== null) {
                  const [, type, path, content] = match;
                  await writer.write(encoder.encode(
                    `data: ${JSON.stringify({ type: "file", file: { path: path.trim(), content: content.trim(), type } })}\n\n`
                  ));
                }
                await writer.write(encoder.encode("data: [DONE]\n\n"));
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullContent += content;
                  await writer.write(encoder.encode(
                    `data: ${JSON.stringify({ type: "content", content })}\n\n`
                  ));
                }
              } catch {}
            }
          }
        }
      } finally {
        await writer.close();
      }
    })();

    return new Response(transformStream.readable, {
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
