import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ExistingFile = {
  path: string;
  content?: string;
  type?: string;
};

enum ParseState {
  NARRATIVE,
  FENCE_START,
  FILE_BLOCK,
}

function normalizeExistingFiles(input: unknown): ExistingFile[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item): ExistingFile | null => {
      if (typeof item === "string") {
        return { path: item };
      }
      if (item && typeof item === "object" && typeof (item as Record<string, unknown>).path === "string") {
        const obj = item as Record<string, unknown>;
        return {
          path: obj.path as string,
          content: typeof obj.content === "string" ? obj.content : undefined,
          type: typeof obj.type === "string" ? obj.type : undefined,
        };
      }
      return null;
    })
    .filter((v): v is ExistingFile => Boolean(v));
}

function buildExistingFilesContext(files: ExistingFile[]): string {
  if (files.length === 0) return "";

  const MAX_FILES_WITH_CONTENT = 15;
  const MAX_CONTENT_CHARS = 6000;
  const filesForContext = files.slice(0, MAX_FILES_WITH_CONTENT);

  const blocks = filesForContext.map((f) => {
    const extension = f.path.split(".").pop() || "txt";
    const content = (f.content || "").slice(0, MAX_CONTENT_CHARS);
    const truncated = (f.content || "").length > MAX_CONTENT_CHARS ? "\n// ...truncated for context..." : "";
    return `\`\`\`${extension}:${f.path}\n${content}${truncated}\n\`\`\``;
  });

  return `\n\nEXISTING PROJECT FILES:
${files.map((f) => `- ${f.path}`).join("\n")}

CURRENT FILE CONTENT (authoritative context for edits):
${blocks.join("\n\n")}

EDIT RULES:
- If the user asks for changes, modify only the required files.
- If a file is unchanged, DO NOT output it.
- If a file is changed, output the complete updated file content for that file.
- Keep imports consistent with existing project structure.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, project, branding, specs, existingFiles } = await req.json();
    const normalizedExistingFiles = normalizeExistingFiles(existingFiles);
    const hasExistingFiles = normalizedExistingFiles.length > 0;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const existingFilesContext = buildExistingFilesContext(normalizedExistingFiles);

    const systemPrompt = `You are an expert React/TypeScript website builder.

Project: ${project?.name || "Website"}
Industry: ${project?.industry || "General"}
Description: ${project?.description || ""}
${branding ? `Branding: Primary color: ${branding.primaryColor}, Secondary: ${branding.secondaryColor}, Accent: ${branding.accentColor}` : ""}
${specs ? `Specifications: ${JSON.stringify(specs)}` : ""}
${existingFilesContext}

CRITICAL RULES:
1. If existing files are provided, treat this as an incremental update task.
2. For incremental updates, output only NEW or CHANGED files.
3. For each changed file, return full file contents (not partial diffs).
4. Keep explanation brief (1-2 sentences).
5. NEVER paste code in explanation. ONLY use file blocks.
6. Output files using this exact format:
\`\`\`tsx:src/App.tsx
// complete file content
\`\`\`
7. ${hasExistingFiles
    ? "Do NOT regenerate the whole app unless the user explicitly requests a full rebuild."
    : "This is a new app: generate a complete runnable starter (App, styles, and required components)."}
8. Use React 18 + Tailwind CSS.
9. Prefer clean, accessible, responsive markup.
10. Avoid introducing dependencies not already needed.`;

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
          if (!text) return;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "content", content: text })}\n\n`));
        };

        const emitFile = (path: string, type: string, content: string) => {
          filesEmitted++;
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "file",
                file: { path: path.trim(), content: content.trim(), type },
              })}\n\n`,
            ),
          );
        };

        const emitStatus = (label: string) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "status", label })}\n\n`));
        };

        try {
          outer: while (reader) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
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

                if (!content) continue;
                for (const char of content) {
                  switch (parseState) {
                    case ParseState.NARRATIVE:
                      if (char === "`") {
                        fenceAccumulator += char;
                        if (fenceAccumulator === "```") {
                          parseState = ParseState.FENCE_START;
                          fenceAccumulator = "";
                        }
                      } else {
                        if (fenceAccumulator) {
                          narrativeBuffer += fenceAccumulator;
                          fenceAccumulator = "";
                        }
                        narrativeBuffer += char;
                        if (narrativeBuffer.length >= 15 || char === "\n") {
                          emitContent(narrativeBuffer);
                          narrativeBuffer = "";
                        }
                      }
                      break;

                    case ParseState.FENCE_START:
                      if (char === "\n") {
                        const headerParts = fenceAccumulator.split(":");
                        if (headerParts.length >= 2) {
                          currentFileType = headerParts[0].trim();
                          currentFilePath = headerParts.slice(1).join(":").trim();
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
                      if (char === "`") {
                        fenceAccumulator += char;
                        if (fenceAccumulator === "```") {
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
              } catch {
                // partial JSON chunk
              }
            }

            if (upstreamDone) break outer;
          }

          try {
            if (reader) await reader.cancel();
          } catch {
            // ignore
          }

          if (narrativeBuffer) emitContent(narrativeBuffer);
          if (fileBuffer && currentFilePath) emitFile(currentFilePath, currentFileType, fileBuffer);

          emitContent(`\n\nGeneration complete - ${filesEmitted} file${filesEmitted !== 1 ? "s" : ""} created.`);
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
