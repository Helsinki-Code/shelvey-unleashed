import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BUILDER_SYSTEM_PROMPT = `You are ShelVey AI Builder — an expert React component generator.

CRITICAL RULES:
1. When mode is "builder", you MUST return a valid JSON object with exactly these keys: "message", "code", "seo"
2. The "code" value must be a single React functional component as a string starting with "() => {" — NO imports, NO export statements.
3. Use only inline React (React.useState, React.useEffect etc.) since React is available globally.
4. Use Tailwind CSS classes for all styling. Do NOT use external CSS files.
5. The component must be self-contained and render a complete page/section.
6. The "seo" object must have "title" (string), "description" (string), and "keywords" (string array).
7. The "message" should be a brief explanation of what was built.
8. Do NOT use any ES6 import/export syntax in the code.
9. Do NOT use TypeScript type annotations — output pure JavaScript.
10. For icons, use inline SVGs.

RESPONSE FORMAT (builder mode):
\`\`\`json
{
  "message": "Built a modern landing page with hero section...",
  "code": "() => { const [state, setState] = React.useState(false); return (<div>...</div>); }",
  "seo": { "title": "Page Title | Brand", "description": "Meta description here", "keywords": ["keyword1", "keyword2"] }
}
\`\`\`

When mode is "chat", respond with plain text — helpful, concise answers about web development.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, mode } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isBuilder = mode === "builder";

    const systemPrompt = isBuilder
      ? BUILDER_SYSTEM_PROMPT
      : "You are ShelVey AI, a helpful assistant for web development. Keep answers clear and concise.";

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    if (isBuilder) {
      // Add a reminder as the last system message
      aiMessages.push({
        role: "system",
        content: "REMINDER: Return ONLY a valid JSON object with keys: message, code, seo. The code must start with '() => {' and be pure JavaScript with no imports/exports/TypeScript.",
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
        max_tokens: isBuilder ? 16000 : 4000,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    if (!isBuilder) {
      return new Response(
        JSON.stringify({ content: rawContent }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse builder response — extract JSON from the response
    let parsed: { message: string; code: string; seo: { title: string; description: string; keywords: string[] } };

    try {
      // Try direct JSON parse first
      parsed = JSON.parse(rawContent);
    } catch {
      // Try extracting JSON from markdown code blocks
      const jsonMatch = rawContent.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[1].trim());
        } catch {
          parsed = extractFallback(rawContent);
        }
      } else {
        // Try finding JSON object directly
        const braceMatch = rawContent.match(/\{[\s\S]*"code"[\s\S]*\}/);
        if (braceMatch) {
          try {
            parsed = JSON.parse(braceMatch[0]);
          } catch {
            parsed = extractFallback(rawContent);
          }
        } else {
          parsed = extractFallback(rawContent);
        }
      }
    }

    // Validate the code starts correctly
    if (parsed.code && !parsed.code.trim().startsWith("() =>")) {
      // Try to fix common issues
      const funcMatch = parsed.code.match(/\(\)\s*=>\s*\{[\s\S]*/);
      if (funcMatch) {
        parsed.code = funcMatch[0];
      }
    }

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("ai-chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function extractFallback(raw: string): { message: string; code: string; seo: { title: string; description: string; keywords: string[] } } {
  // Try to extract code from the raw response
  const codeMatch = raw.match(/\(\)\s*=>\s*\{[\s\S]*\}/);
  return {
    message: "Component generated (parsed from response).",
    code: codeMatch?.[0] || `() => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Generated Component</h1>
        <p className="text-gray-600">The AI response could not be fully parsed. Please try again with a clearer prompt.</p>
      </div>
    </div>
  );
}`,
    seo: { title: "ShelVey | AI Generated", description: "AI-generated web component.", keywords: ["shelvey", "ai"] },
  };
}
