import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function callAI(messages: { role: string; content: string }[], maxTokens = 4000) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 429) throw new Error("RATE_LIMIT");
    if (status === 402) throw new Error("PAYMENT_REQUIRED");
    throw new Error(`AI gateway error: ${status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

function parseJSON(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (match) {
      try { return JSON.parse(match[1].trim()); } catch { /* fall through */ }
    }
    const braceMatch = raw.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      try { return JSON.parse(braceMatch[0]); } catch { /* fall through */ }
    }
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, ...params } = body;

    if (!action) {
      return new Response(
        JSON.stringify({ error: "action is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result: any;

    switch (action) {
      case "analyzeWebsite": {
        const { url } = params;
        const raw = await callAI([
          { role: "system", content: "You are an SEO expert. Analyze the given website URL and return JSON with 'pages' (array of discovered page URLs) and 'keywords' (array of objects with: keyword, volume (number), difficulty (number 0-100), cpc (number), intent (one of: Informational, Transactional, Commercial, Navigational))." },
          { role: "user", content: `Analyze this website for SEO: ${url}. Return the JSON with pages and keywords.` },
        ]);
        result = parseJSON(raw) || { pages: [`${url}`, `${url}/about`, `${url}/blog`], keywords: [] };
        break;
      }

      case "serpAnalysis": {
        const { keyword } = params;
        const raw = await callAI([
          { role: "system", content: "You are a SERP analyst. Analyze the search landscape for a keyword and return JSON with: aiOverview (string summary of AI overview if present), peopleAlsoAsk (array of strings), competitors (array of {domain, rank, estimatedTraffic, domainAuthority, rankingChange}), opportunityScore (0-100), strategicInsight (string), group (topic group)." },
          { role: "user", content: `Analyze SERP landscape for keyword: "${keyword}"` },
        ]);
        const parsed = parseJSON(raw);
        result = {
          keyword,
          aiOverview: parsed?.aiOverview || "",
          peopleAlsoAsk: parsed?.peopleAlsoAsk || [],
          competitors: parsed?.competitors || [],
          opportunityScore: parsed?.opportunityScore || 50,
          strategicInsight: parsed?.strategicInsight || "Analysis complete.",
          group: parsed?.group || "General",
          timestamp: Date.now(),
        };
        break;
      }

      case "contentStrategy": {
        const { keywords, serpData, goals } = params;
        const raw = await callAI([
          { role: "system", content: "You are an SEO content strategist. Create a content strategy and return JSON with: clusters (array of {name, keywords: string[], intent}), calendar (array of {week: number, topic, type, bestDay}), internalLinking (array of {sourceTopic, targetTopic, anchorText}), summary (string)." },
          { role: "user", content: `Create content strategy.\nKeywords: ${JSON.stringify(keywords?.slice(0, 20))}\nSERP Data: ${JSON.stringify(serpData?.slice(0, 5))}\nGoals: ${goals}` },
        ], 8000);
        result = parseJSON(raw) || { clusters: [], calendar: [], internalLinking: [], summary: "Strategy generation failed." };
        break;
      }

      case "articleOutline": {
        const { keyword, serpData, tone } = params;
        const raw = await callAI([
          { role: "system", content: "You are a content writer. Create an article outline and return JSON with: title (string), sections (array of {heading, content: '' (empty), type: 'text', visualType: 'none'|'chart'|'table'|'image', imagePrompt?: string})." },
          { role: "user", content: `Create article outline for keyword "${keyword}" in ${tone || 'professional'} tone.\nSERP context: ${JSON.stringify(serpData || {})}` },
        ]);
        result = parseJSON(raw) || { title: keyword, sections: [{ heading: "Introduction", content: "", type: "text", visualType: "none" }] };
        break;
      }

      case "writeSection": {
        const { sectionHeading, keyword, context, tone, visualType } = params;
        const raw = await callAI([
          { role: "system", content: `You are an expert SEO content writer. Write a section for an article. Return JSON with: content (string, 300-500 words of well-formatted content)${visualType === 'chart' ? ', chartData (array of {label, value})' : ''}${visualType === 'image' ? ', imagePrompt (descriptive prompt for image generation)' : ''}.` },
          { role: "user", content: `Write section "${sectionHeading}" for keyword "${keyword}" in ${tone || 'professional'} tone.\nContext: ${context || 'No additional context'}` },
        ], 4000);
        result = parseJSON(raw) || { content: `Content for "${sectionHeading}" could not be generated. Please try again.` };
        break;
      }

      case "optimizeAIOverview": {
        const { content, keyword } = params;
        const raw = await callAI([
          { role: "system", content: "You are an AI Overview optimization expert. Optimize the given content to appear in Google's AI Overview. Return JSON with: content (the optimized full content as string)." },
          { role: "user", content: `Optimize this content for AI Overview for keyword "${keyword}":\n\n${content?.slice(0, 5000)}` },
        ], 8000);
        const parsed = parseJSON(raw);
        result = { content: parsed?.content || content };
        break;
      }

      case "internalLinks": {
        const { content, sitemap } = params;
        const raw = await callAI([
          { role: "system", content: "You are an internal linking expert. Suggest internal links for the content. Return a JSON array of objects with: id (unique string), anchorText, targetUrl, context (snippet showing where the link fits), type ('internal'), confidence (0-1)." },
          { role: "user", content: `Suggest internal links.\nSitemap pages: ${JSON.stringify(sitemap?.slice(0, 30))}\n\nContent:\n${content?.slice(0, 3000)}` },
        ]);
        const parsed = parseJSON(raw);
        result = Array.isArray(parsed) ? parsed : parsed?.suggestions || [];
        break;
      }

      case "checkRank": {
        const { domain, keywords } = params;
        const raw = await callAI([
          { role: "system", content: "You are a rank tracking expert. Estimate search rankings for the given domain and keywords. Return JSON with: results (array of {keyword, rank: number|null, url: string|null, title: string|null, analysis: string, found: boolean}), summary (string)." },
          { role: "user", content: `Check rankings for domain "${domain}" on keywords: ${JSON.stringify(keywords?.slice(0, 20))}` },
        ]);
        const parsed = parseJSON(raw);
        result = { results: parsed?.results || [], summary: parsed?.summary || "Rank check complete.", groundingUrls: [] };
        break;
      }

      case "analyzeTraffic": {
        const { metrics, pages } = params;
        const raw = await callAI([
          { role: "system", content: "You are a web analytics expert. Analyze the traffic data and return JSON with: content (string with analysis and recommendations)." },
          { role: "user", content: `Analyze traffic patterns.\nMetrics: ${JSON.stringify(metrics?.slice(0, 30))}\nPages: ${JSON.stringify(pages?.slice(0, 20))}` },
        ]);
        const parsed = parseJSON(raw);
        result = { content: parsed?.content || raw || "Analysis unavailable." };
        break;
      }

      case "predictIndexing": {
        const { content, keyword } = params;
        const raw = await callAI([
          { role: "system", content: "You are an indexing prediction expert. Predict whether this content will be indexed by Google. Return JSON with: likelihood ('High'|'Medium'|'Low'), advice (string with actionable tips)." },
          { role: "user", content: `Predict indexing success for keyword "${keyword}".\n\nContent preview:\n${content?.slice(0, 2000)}` },
        ]);
        const parsed = parseJSON(raw);
        result = { likelihood: parsed?.likelihood || "Medium", advice: parsed?.advice || "Submit to Search Console." };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("ai-seo error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "RATE_LIMIT") {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (message === "PAYMENT_REQUIRED") {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
