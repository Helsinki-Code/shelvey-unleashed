import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function callAI(messages: { role: string; content: string }[], model = "google/gemini-3-flash-preview", maxTokens = 4000) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
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

async function callAIStructured(messages: { role: string; content: string }[], tools: any[], toolChoice: any, model = "google/gemini-3-flash-preview") {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, tools, tool_choice: toolChoice, max_tokens: 8000 }),
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 429) throw new Error("RATE_LIMIT");
    if (status === 402) throw new Error("PAYMENT_REQUIRED");
    throw new Error(`AI gateway error: ${status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall) {
    try { return JSON.parse(toolCall.function.arguments); } catch { return null; }
  }
  // Fallback: try parsing content as JSON
  const content = data.choices?.[0]?.message?.content || "";
  return parseJSON(content);
}

function parseJSON(raw: string): any {
  try { return JSON.parse(raw); } catch {}
  const match = raw.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (match) { try { return JSON.parse(match[1].trim()); } catch {} }
  const braceMatch = raw.match(/\{[\s\S]*\}/);
  if (braceMatch) { try { return JSON.parse(braceMatch[0]); } catch {} }
  const arrMatch = raw.match(/\[[\s\S]*\]/);
  if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch {} }
  return null;
}

// ─── AGENT HANDLERS ───

async function handleOrchestrate(params: any) {
  const { url, goals } = params;
  const raw = await callAI([
    { role: "system", content: "You are the Orchestrator Agent for an SEO War Room. Given a website URL and goals, create a detailed workflow plan. Return JSON with: phases (array of {id, name, description, assignedAgent, dependencies: string[], estimatedDuration}), strategy (string overview), priorities (array of strings)." },
    { role: "user", content: `Website: ${url}\nGoals: ${goals || 'Improve organic traffic and rankings'}\n\nCreate the master workflow plan.` },
  ]);
  return parseJSON(raw) || { phases: [], strategy: "Workflow planned.", priorities: [] };
}

async function handleCrawl(params: any) {
  const { url } = params;
  const raw = await callAI([
    { role: "system", content: "You are the Website Crawler Agent. Analyze the given URL and return JSON with: pages (array of discovered page URLs, at least 10), contentThemes (array of strings), technicalIssues (array of strings), siteStructure (object with levels), metaAnalysis (object with titleTagCount, missingDescriptions, h1Issues)." },
    { role: "user", content: `Crawl and analyze this website: ${url}. Discover all pages, identify content themes, and detect technical issues.` },
  ]);
  return parseJSON(raw) || { pages: [url], contentThemes: [], technicalIssues: [], siteStructure: {}, metaAnalysis: {} };
}

async function handleKeywordResearch(params: any) {
  const { url, contentThemes, pages } = params;
  const tools = [{
    type: "function",
    function: {
      name: "return_keywords",
      description: "Return discovered keywords with metrics",
      parameters: {
        type: "object",
        properties: {
          keywords: {
            type: "array",
            items: {
              type: "object",
              properties: {
                keyword: { type: "string" },
                volume: { type: "number" },
                difficulty: { type: "number" },
                cpc: { type: "number" },
                intent: { type: "string", enum: ["Informational", "Transactional", "Commercial", "Navigational"] },
                category: { type: "string" },
                cluster: { type: "string" },
              },
              required: ["keyword", "volume", "difficulty", "cpc", "intent"],
            },
          },
          clusters: { type: "array", items: { type: "object", properties: { name: { type: "string" }, count: { type: "number" } }, required: ["name", "count"] } },
          summary: { type: "string" },
        },
        required: ["keywords", "clusters", "summary"],
      },
    },
  }];

  const result = await callAIStructured([
    { role: "system", content: "You are the Keyword Research Agent. Discover 15-25 high-value keywords based on the website content. Include primary, secondary, long-tail, and question-based keywords. Group them into thematic clusters." },
    { role: "user", content: `Website: ${url}\nContent themes: ${JSON.stringify(contentThemes || [])}\nPages: ${JSON.stringify((pages || []).slice(0, 15))}\n\nDiscover and categorize keywords.` },
  ], tools, { type: "function", function: { name: "return_keywords" } });

  return result || { keywords: [], clusters: [], summary: "Research complete." };
}

async function handleSerpAnalysis(params: any) {
  const { keyword } = params;
  const tools = [{
    type: "function",
    function: {
      name: "return_serp_analysis",
      description: "Return SERP analysis for a keyword",
      parameters: {
        type: "object",
        properties: {
          aiOverview: { type: "string" },
          peopleAlsoAsk: { type: "array", items: { type: "string" } },
          competitors: { type: "array", items: { type: "object", properties: { domain: { type: "string" }, rank: { type: "number" }, estimatedTraffic: { type: "number" }, domainAuthority: { type: "number" }, rankingChange: { type: "number" } }, required: ["domain", "rank"] } },
          opportunityScore: { type: "number" },
          strategicInsight: { type: "string" },
          group: { type: "string" },
        },
        required: ["aiOverview", "peopleAlsoAsk", "competitors", "opportunityScore", "strategicInsight"],
      },
    },
  }];

  const result = await callAIStructured([
    { role: "system", content: "You are the SERP Analyst Agent. Analyze the search landscape for this keyword. Identify AI Overview presence, extract all People Also Ask questions (7-10), profile top competitors, and calculate an opportunity score (0-100)." },
    { role: "user", content: `Analyze SERP for keyword: "${keyword}"` },
  ], tools, { type: "function", function: { name: "return_serp_analysis" } });

  return { keyword, timestamp: Date.now(), ...result } || { keyword, aiOverview: "", peopleAlsoAsk: [], competitors: [], opportunityScore: 50, strategicInsight: "", group: "General", timestamp: Date.now() };
}

async function handleContentStrategy(params: any) {
  const { keywords, serpData, goals } = params;
  const raw = await callAI([
    { role: "system", content: "You are the Content Strategy Agent. Create a comprehensive content strategy. Return JSON with: clusters (array of {name, keywords, intent}), pillarContent (array of {title, cluster, targetKeyword, supportingArticles}), calendar (array of {week, topic, type, bestDay, cluster}), internalLinking (array of {sourceTopic, targetTopic, anchorText}), internalLinkingMap (array of {from, to, anchorText, priority}), summary (string)." },
    { role: "user", content: `Keywords: ${JSON.stringify((keywords || []).slice(0, 20))}\nSERP Data: ${JSON.stringify((serpData || []).slice(0, 5))}\nGoals: ${goals || 'Increase organic traffic'}` },
  ], "google/gemini-3-flash-preview", 8000);
  return parseJSON(raw) || { clusters: [], pillarContent: [], calendar: [], internalLinking: [], internalLinkingMap: [], summary: "Strategy generated." };
}

async function handleArticleOutline(params: any) {
  const { keyword, serpData, tone, paaQuestions } = params;
  const raw = await callAI([
    { role: "system", content: "You are the Outline Architect Agent. Create a detailed article outline targeting 3,000+ words. Return JSON with: title (string), metaDescription (string, 155 chars max), sections (array of {heading, content: '', type: 'text', visualType: 'none'|'chart'|'table'|'image', imagePrompt?: string}). Include at least 8-12 sections. Integrate PAA questions as H2/H3 headings where appropriate." },
    { role: "user", content: `Keyword: "${keyword}"\nTone: ${tone || 'professional'}\nPAA Questions: ${JSON.stringify(paaQuestions || [])}\nSERP context: ${JSON.stringify(serpData || {})}` },
  ]);
  return parseJSON(raw) || { title: keyword, metaDescription: "", sections: [{ heading: "Introduction", content: "", type: "text", visualType: "none" }] };
}

async function handleWriteSection(params: any) {
  const { sectionHeading, keyword, context, tone, visualType, paaQuestions } = params;
  const raw = await callAI([
    { role: "system", content: `You are the Article Writer Agent. Write a comprehensive section (300-600 words). Return JSON with: content (string, well-formatted markdown)${visualType === 'chart' ? ', chartData (array of {label, value})' : ''}${visualType === 'image' ? ', imagePrompt (descriptive prompt for image generation)' : ''}. If a PAA question is relevant, weave the answer naturally into the content.` },
    { role: "user", content: `Section: "${sectionHeading}"\nKeyword: "${keyword}"\nTone: ${tone || 'professional'}\nPAA to address: ${JSON.stringify((paaQuestions || []).slice(0, 3))}\nContext: ${context || 'None'}` },
  ]);
  return parseJSON(raw) || { content: `Content for "${sectionHeading}" pending.` };
}

async function handleOptimizeAIOverview(params: any) {
  const { content, keyword, aiOverview } = params;
  const raw = await callAI([
    { role: "system", content: "You are the AI Overview Optimizer Agent. Optimize this content to appear in Google's AI Overview. Add direct answer paragraphs, structured lists, and clear definitions near the top. Return JSON with: content (optimized full content), changes (array of strings describing what was changed)." },
    { role: "user", content: `Keyword: "${keyword}"\nExisting AI Overview: ${aiOverview || 'None detected'}\n\nContent to optimize:\n${(content || '').slice(0, 6000)}` },
  ], "google/gemini-3-flash-preview", 8000);
  return parseJSON(raw) || { content, changes: [] };
}

async function handleInternalLinks(params: any) {
  const { content, sitemap } = params;
  const raw = await callAI([
    { role: "system", content: "You are the Internal Link Suggester Agent. Analyze content and suggest contextual internal links. Return a JSON array of objects: {id, anchorText, targetUrl, context (surrounding text snippet), type: 'internal', confidence (0-1)}." },
    { role: "user", content: `Sitemap: ${JSON.stringify((sitemap || []).slice(0, 30))}\n\nContent:\n${(content || '').slice(0, 4000)}` },
  ]);
  const parsed = parseJSON(raw);
  return Array.isArray(parsed) ? parsed : parsed?.suggestions || [];
}

async function handleImagePrompt(params: any) {
  const { sectionHeading, keyword, context } = params;
  const raw = await callAI([
    { role: "system", content: "You are the Image Generation Agent. Create a detailed image prompt and SEO alt text. Return JSON with: prompt (detailed image generation prompt), altText (SEO-optimized alt text), placement (where in the section the image should go)." },
    { role: "user", content: `Create an image for article section: "${sectionHeading}"\nKeyword: "${keyword}"\nContext: ${context || 'General'}` },
  ]);
  return parseJSON(raw) || { prompt: `Illustration for ${sectionHeading}`, altText: sectionHeading, placement: "after first paragraph" };
}

async function handleRankCheck(params: any) {
  const { domain, keywords } = params;
  const raw = await callAI([
    { role: "system", content: "You are the Rank Tracker Agent. Estimate search rankings. Return JSON with: results (array of {keyword, rank: number|null, url: string|null, title: string|null, analysis, found: boolean}), summary (string)." },
    { role: "user", content: `Domain: "${domain}"\nKeywords: ${JSON.stringify((keywords || []).slice(0, 20))}` },
  ]);
  const parsed = parseJSON(raw);
  return { results: parsed?.results || [], summary: parsed?.summary || "Rank check complete.", groundingUrls: [] };
}

async function handleAnalyzeTraffic(params: any) {
  const { metrics, pages } = params;
  const raw = await callAI([
    { role: "system", content: "You are the Analytics Agent. Analyze traffic data and provide insights. Return JSON with: insights (string with detailed analysis), recommendations (array of strings), topPerforming (array of strings), underperforming (array of strings)." },
    { role: "user", content: `Metrics: ${JSON.stringify((metrics || []).slice(0, 30))}\nPages: ${JSON.stringify((pages || []).slice(0, 20))}` },
  ]);
  return parseJSON(raw) || { insights: "Analysis unavailable.", recommendations: [], topPerforming: [], underperforming: [] };
}

async function handleContentOptimization(params: any) {
  const { content, keyword, currentRank } = params;
  const raw = await callAI([
    { role: "system", content: "You are the Content Optimizer Agent. Analyze content for optimization opportunities. Return JSON with: score (0-100), issues (array of {type, description, severity}), recommendations (array of strings), optimizedSections (array of {heading, suggestion})." },
    { role: "user", content: `Keyword: "${keyword}"\nCurrent Rank: ${currentRank || 'Unknown'}\n\nContent:\n${(content || '').slice(0, 4000)}` },
  ]);
  return parseJSON(raw) || { score: 0, issues: [], recommendations: [], optimizedSections: [] };
}

async function handlePredictIndexing(params: any) {
  const { content, keyword } = params;
  const raw = await callAI([
    { role: "system", content: "You are the Indexing Predictor Agent. Predict indexing likelihood. Return JSON with: likelihood ('High'|'Medium'|'Low'), score (0-100), factors (array of {factor, status: 'positive'|'negative'|'neutral', detail}), advice (string)." },
    { role: "user", content: `Keyword: "${keyword}"\n\nContent preview:\n${(content || '').slice(0, 3000)}` },
  ]);
  return parseJSON(raw) || { likelihood: "Medium", score: 50, factors: [], advice: "Submit to Search Console." };
}

async function handleValidateLinks(params: any) {
  const { links } = params;
  const raw = await callAI([
    { role: "system", content: "You are the Link Validator Agent. Validate link quality and relevance. Return JSON with: results (array of {url, status: 'valid'|'broken'|'redirect'|'low_authority', issue?: string}), summary (string)." },
    { role: "user", content: `Validate these links:\n${JSON.stringify((links || []).slice(0, 30))}` },
  ]);
  return parseJSON(raw) || { results: [], summary: "Validation complete." };
}

async function handleGenerateReport(params: any) {
  const { sessionData } = params;
  const raw = await callAI([
    { role: "system", content: "You are the Report Generator Agent. Create a comprehensive session report in markdown format. Include executive summary, key findings, articles produced, keyword analysis, strategic recommendations, and next steps." },
    { role: "user", content: `Generate a full session report from this data:\n${JSON.stringify(sessionData || {}).slice(0, 6000)}` },
  ], "google/gemini-3-flash-preview", 8000);
  return { report: raw || "Report generation failed.", format: "markdown" };
}

// ─── MAIN HANDLER ───

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { agent, ...params } = body;

    if (!agent) {
      return new Response(JSON.stringify({ error: "agent is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let result: any;

    switch (agent) {
      case "orchestrator": result = await handleOrchestrate(params); break;
      case "crawler": result = await handleCrawl(params); break;
      case "keyword_researcher": result = await handleKeywordResearch(params); break;
      case "serp_analyst": result = await handleSerpAnalysis(params); break;
      case "content_strategist": result = await handleContentStrategy(params); break;
      case "outline_architect": result = await handleArticleOutline(params); break;
      case "article_writer": result = await handleWriteSection(params); break;
      case "ai_overview_optimizer": result = await handleOptimizeAIOverview(params); break;
      case "internal_linker": result = await handleInternalLinks(params); break;
      case "image_generator": result = await handleImagePrompt(params); break;
      case "rank_tracker": result = await handleRankCheck(params); break;
      case "analytics_agent": result = await handleAnalyzeTraffic(params); break;
      case "content_optimizer": result = await handleContentOptimization(params); break;
      case "indexing_predictor": result = await handlePredictIndexing(params); break;
      case "link_validator": result = await handleValidateLinks(params); break;
      case "report_generator": result = await handleGenerateReport(params); break;
      default:
        return new Response(JSON.stringify({ error: `Unknown agent: ${agent}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("seo-agent-orchestrator error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "RATE_LIMIT") {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (message === "PAYMENT_REQUIRED") {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
