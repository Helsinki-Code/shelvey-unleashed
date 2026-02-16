import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type StrategyType = "Contrarian" | "Storyteller" | "Analytical" | "Practical";

interface ToneProfile {
  tone: string;
  style: string;
  keywords: string[];
  brandVoice: string;
}

interface ArticleResult {
  title: string;
  metaDescription: string;
  slug: string;
  content: string;
  charts: Array<Record<string, unknown>>;
  images: Array<{ url: string; alt: string; caption: string }>;
}

interface AutopilotConfigRow {
  id: string;
  enabled: boolean;
  run_interval_minutes: number;
  keywords: unknown;
  target_posts_per_run: number;
  auto_publish_site: boolean;
  auto_publish_medium: boolean;
  auto_publish_social: boolean;
  include_parasite_seo: boolean;
  social_platforms: unknown;
}

const OPENAI_MODEL_FAST = "gpt-4o-mini";
const OPENAI_MODEL_WRITE = "gpt-4.1-mini";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseJsonFromText<T>(text: string, fallback: T): T {
  try {
    const trimmed = text.trim();
    if (!trimmed) return fallback;
    const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const raw = codeBlock?.[1] ?? trimmed;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseSitemapUrls(sitemapContent: string): string[] {
  const urls = Array.from(sitemapContent.matchAll(/<loc>(.*?)<\/loc>/g)).map((m) => (m[1] || "").trim());
  return Array.from(new Set(urls)).filter(Boolean);
}

async function openAIChat({
  apiKey,
  model,
  system,
  user,
  temperature = 0.7,
}: {
  apiKey: string;
  model: string;
  system?: string;
  user: string;
  temperature?: number;
}) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature,
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        { role: "user", content: user },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return String(data?.choices?.[0]?.message?.content || "");
}

async function analyzeBrandTone(apiKey: string, url: string, websiteContext: string): Promise<ToneProfile> {
  const prompt = `Analyze the writing style, tone of voice, target audience, and brand personality of this website URL: ${url}

Website content sample:
${websiteContext.slice(0, 2500)}

Return strict JSON:
{ "tone": "string", "style": "string", "keywords": ["string"], "brandVoice": "string" }`;

  const text = await openAIChat({
    apiKey,
    model: OPENAI_MODEL_FAST,
    user: prompt,
    temperature: 0.2,
  });

  return parseJsonFromText<ToneProfile>(text, {
    tone: "Professional",
    style: "Clean",
    keywords: ["Expert"],
    brandVoice: "Authoritative and clear.",
  });
}

function getSystemInstructionForStrategy(strategy: StrategyType, brandVoice: string) {
  return `You are an elite SEO content writer.
Brand voice: ${brandVoice}
Narrative strategy: ${strategy}
Write naturally, avoid fluff, and keep high informational density.`;
}

async function generateOutline(apiKey: string, keyword: string, strategy: StrategyType, serpData: string) {
  const prompt = `
Strategy Persona: ${strategy}
Keyword: ${keyword}
SERP Context: ${serpData.slice(0, 1000)}

TASK:
1. Identify PAA-style questions from context.
2. Create a massive article outline with 8-10 sections (excluding intro/conclusion).
3. Structure must reflect strategy persona.

Return JSON:
{
  "title": "Catchy title",
  "sections": ["..."],
  "paa": ["..."]
}`;

  const text = await openAIChat({ apiKey, model: OPENAI_MODEL_FAST, user: prompt, temperature: 0.4 });
  return parseJsonFromText<{ title: string; sections: string[]; paa: string[] }>(text, {
    title: `Complete Guide to ${keyword}`,
    sections: [
      "Foundations",
      "Core Concepts",
      "Common Mistakes",
      "Framework",
      "Execution",
      "Advanced Optimization",
      "Case Examples",
      "Checklist",
    ],
    paa: [],
  });
}

async function writeSection(args: {
  apiKey: string;
  sectionTitle: string;
  keyword: string;
  strategy: StrategyType;
  toneProfile: ToneProfile;
  prevContext: string;
  internalLinks: string[];
  isPaaSection?: boolean;
}) {
  const linksContext = args.internalLinks.length
    ? `AVAILABLE INTERNAL LINKS:\n${args.internalLinks.join("\n")}\nIf relevant, hyperlink anchor text to exact URL.`
    : "";

  const paaInstruction = args.isPaaSection
    ? "This section must answer PAA questions directly with schema-friendly Q/A style."
    : "";

  const prompt = `
TASK: Write a deep-dive section for keyword "${args.keyword}".
SECTION TITLE: "${args.sectionTitle}"
PREVIOUS CONTEXT: ${args.prevContext.slice(-500)}
${linksContext}
${paaInstruction}

RULES:
1) 400-500 words minimum.
2) Markdown formatting with H3/H4 subsections.
3) Use strategy persona and human tone.
4) Add [CHART_CONTEXT: ...] or [IMAGE_CONTEXT: ...] placeholders when useful.
`;

  return openAIChat({
    apiKey: args.apiKey,
    model: OPENAI_MODEL_WRITE,
    system: getSystemInstructionForStrategy(args.strategy, args.toneProfile.brandVoice),
    user: prompt,
    temperature: 0.7,
  });
}

async function generateCharts(apiKey: string, descriptions: string[]) {
  const charts: Array<Record<string, unknown>> = [];
  for (const desc of descriptions.slice(0, 2)) {
    const prompt = `Create dataset JSON for chart: "${desc}". Return:
{"title":"...","type":"bar|line|pie","data":[{"name":"Label","value":10}],"description":"..."}`;
    const text = await openAIChat({ apiKey, model: OPENAI_MODEL_FAST, user: prompt, temperature: 0.3 });
    const parsed = parseJsonFromText<Record<string, unknown>>(text, {});
    if (Object.keys(parsed).length) charts.push(parsed);
  }
  return charts;
}

async function generateImagesFromFalai(args: {
  supabaseUrl: string;
  serviceKey: string;
  prompts: string[];
}) {
  const images: Array<{ url: string; alt: string; caption: string }> = [];

  for (const prompt of args.prompts.slice(0, 4)) {
    try {
      const response = await fetch(`${args.supabaseUrl}/functions/v1/mcp-falai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${args.serviceKey}`,
        },
        body: JSON.stringify({
          tool: "generateImage",
          arguments: {
            prompt: `Photorealistic, premium, high quality, 4k, cinematic lighting: ${prompt}`,
            aspectRatio: "16:9",
          },
        }),
      });
      const data = await response.json().catch(() => ({}));
      const url = data?.data?.images?.[0]?.url || data?.images?.[0]?.url || data?.output?.[0]?.url;
      if (url) images.push({ url, alt: prompt, caption: prompt });
    } catch {
      // skip failed image generation in production run
    }
  }

  return images;
}

async function generateSEOArticle(args: {
  apiKey: string;
  keyword: string;
  toneProfile: ToneProfile;
  serpData: string;
  sitemapContent: string;
  strategy: StrategyType;
}) {
  const internalLinks = args.sitemapContent ? parseSitemapUrls(args.sitemapContent) : [];
  const outline = await generateOutline(args.apiKey, args.keyword, args.strategy, args.serpData);
  const title = outline.title || `Complete Guide to ${args.keyword}`;

  let fullContent = `# ${title}\n\n`;
  const chartPrompts: string[] = [];
  const imagePrompts: string[] = [];
  const sections = [...outline.sections];
  if (outline.paa?.length) sections.push("Frequently Asked Questions");

  const intro = await writeSection({
    apiKey: args.apiKey,
    sectionTitle: "Introduction & Hook",
    keyword: args.keyword,
    strategy: args.strategy,
    toneProfile: args.toneProfile,
    prevContext: "",
    internalLinks,
  });
  fullContent += `${intro}\n\n`;

  for (const section of sections) {
    const isPaa = section === "Frequently Asked Questions";
    const sectionTitle = isPaa ? `Frequently Asked Questions: ${outline.paa.join("; ")}` : section;
    const sectionContent = await writeSection({
      apiKey: args.apiKey,
      sectionTitle,
      keyword: args.keyword,
      strategy: args.strategy,
      toneProfile: args.toneProfile,
      prevContext: fullContent,
      internalLinks,
      isPaaSection: isPaa,
    });
    fullContent += `## ${section}\n\n${sectionContent}\n\n`;

    const charts = sectionContent.match(/\[CHART_CONTEXT:.*?\]/g) || [];
    const imgs = sectionContent.match(/\[IMAGE_CONTEXT:.*?\]/g) || [];
    chartPrompts.push(...charts.map((s) => s.replace("[CHART_CONTEXT:", "").replace("]", "").trim()));
    imagePrompts.push(...imgs.map((s) => s.replace("[IMAGE_CONTEXT:", "").replace("]", "").trim()));
  }

  const conclusion = await writeSection({
    apiKey: args.apiKey,
    sectionTitle: "Conclusion & Final Thoughts",
    keyword: args.keyword,
    strategy: args.strategy,
    toneProfile: args.toneProfile,
    prevContext: fullContent,
    internalLinks,
  });
  fullContent += `## Conclusion\n\n${conclusion}\n\n`;

  const metaText = await openAIChat({
    apiKey: args.apiKey,
    model: OPENAI_MODEL_FAST,
    user: `Write seductive SEO meta description for title "${title}" under 160 chars.`,
    temperature: 0.4,
  });

  const charts = await generateCharts(args.apiKey, chartPrompts.length ? chartPrompts : [`Market trend for ${args.keyword}`]);

  return {
    title,
    metaDescription: metaText.slice(0, 160).trim(),
    slug: slugify(title),
    content: fullContent,
    chartPrompts,
    imagePrompts: imagePrompts.length ? imagePrompts : [`${args.keyword} professional featured image`, `${args.keyword} workflow illustration`, `${args.keyword} analytics dashboard`],
    charts,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ success: false, error: "Unauthorized" }, 401);

    const body = await req.json();
    const action = String(body?.action || "");
    const projectId = String(body?.projectId || "");
    if (!projectId) return jsonResponse({ success: false, error: "projectId is required" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openAIKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAIKey) return jsonResponse({ success: false, error: "OPENAI_API_KEY not configured" }, 500);

    const admin = createClient(supabaseUrl, serviceKey, { global: { headers: { Authorization: authHeader } } });
    const service = createClient(supabaseUrl, serviceKey);

    const { data: authData, error: authError } = await admin.auth.getUser();
    const user = authData?.user;
    if (authError || !user) return jsonResponse({ success: false, error: "Unauthorized" }, 401);

    if (action === "get_config") {
      const [{ data: config }, { data: runs }, { data: website }] = await Promise.all([
        service
          .from("phase4_autopilot_configs")
          .select("*")
          .eq("project_id", projectId)
          .eq("user_id", user.id)
          .maybeSingle(),
        service
          .from("phase4_autopilot_runs")
          .select("*")
          .eq("project_id", projectId)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10),
        service
          .from("generated_websites")
          .select("id, deployed_url, domain_name, custom_domain, html_content")
          .eq("project_id", projectId)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      return jsonResponse({ success: true, config, runs: runs || [], phase3Website: website || null });
    }

    if (action === "save_config") {
      const input = body?.config || {};
      const row = {
        project_id: projectId,
        user_id: user.id,
        enabled: Boolean(input.enabled),
        run_interval_minutes: Math.max(30, Number(input.run_interval_minutes || 360)),
        keywords: Array.isArray(input.keywords) ? input.keywords : [],
        target_posts_per_run: Math.max(1, Math.min(5, Number(input.target_posts_per_run || 1))),
        auto_publish_site: input.auto_publish_site !== false,
        auto_publish_medium: Boolean(input.auto_publish_medium),
        auto_publish_social: input.auto_publish_social !== false,
        include_parasite_seo: input.include_parasite_seo !== false,
        social_platforms: Array.isArray(input.social_platforms) ? input.social_platforms : ["linkedin", "twitter"],
        status: "idle",
        next_run_at: input.enabled ? new Date(Date.now() + Math.max(30, Number(input.run_interval_minutes || 360)) * 60000).toISOString() : null,
      };

      const { data, error } = await service
        .from("phase4_autopilot_configs")
        .upsert(row, { onConflict: "project_id,user_id", ignoreDuplicates: false })
        .select()
        .single();
      if (error) throw error;

      return jsonResponse({ success: true, config: data });
    }

    if (action !== "run_once") {
      return jsonResponse({ success: false, error: `Unknown action: ${action}` }, 400);
    }

    const { data: configData } = await service
      .from("phase4_autopilot_configs")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();
    let config = configData as AutopilotConfigRow | null;

    if (!config) {
      const { data: createdConfig, error: createConfigError } = await service
        .from("phase4_autopilot_configs")
        .insert({
          project_id: projectId,
          user_id: user.id,
          enabled: false,
          run_interval_minutes: 360,
          keywords: [],
          target_posts_per_run: 1,
          auto_publish_site: true,
          auto_publish_medium: false,
          auto_publish_social: true,
          include_parasite_seo: true,
          social_platforms: ["linkedin", "twitter"],
          status: "idle",
        })
        .select("*")
        .single();
      if (createConfigError) throw createConfigError;
      config = createdConfig as AutopilotConfigRow;
    }

    const { data: project } = await service
      .from("business_projects")
      .select("id,name,industry,description")
      .eq("id", projectId)
      .single();
    if (!project) return jsonResponse({ success: false, error: "Project not found" }, 404);

    const { data: phase3Website } = await service
      .from("generated_websites")
      .select("id,deployed_url,domain_name,custom_domain,html_content")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!phase3Website) return jsonResponse({ success: false, error: "Phase 3 website not found. Deploy website in Phase 3 first." }, 400);

    const { data: websitePages } = await service
      .from("website_pages")
      .select("page_name,page_code")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(20);

    const sitemapLike = (websitePages || [])
      .map((p) => `https://${phase3Website.custom_domain || phase3Website.domain_name || "site.local"}/${String(p.page_name).replace(/^src\//, "").replace(/\.(tsx|ts|css|json|html)$/, "").replace(/\\/g, "/")}`)
      .join("\n");

    const websiteContext = [(phase3Website.html_content || "").slice(0, 12000), ...(websitePages || []).map((p) => (p.page_code || "").slice(0, 1500))].join("\n\n");
    const strategy = (body?.strategy || "Analytical") as StrategyType;
    const siteUrl = phase3Website.deployed_url || phase3Website.custom_domain || phase3Website.domain_name || "https://example.com";

    let keywords = Array.isArray(config?.keywords) ? (config?.keywords as string[]) : [];
    if (!keywords.length && body?.keyword) keywords = [String(body.keyword)];
    if (!keywords.length) keywords = [String(project.name), `${String(project.name)} ${String(project.industry || "")}`.trim()];
    const targetKeywords = Array.from(new Set(keywords.filter(Boolean))).slice(0, Math.max(1, config?.target_posts_per_run || 1));

    const { data: runRow, error: runCreateError } = await service
      .from("phase4_autopilot_runs")
      .insert({
        config_id: config.id,
        project_id: projectId,
        user_id: user.id,
        run_type: body?.run_type || "manual",
        status: "running",
        summary: { phase3Site: siteUrl, keywords: targetKeywords },
      })
      .select()
      .single();
    if (runCreateError) throw runCreateError;

    const runId = runRow.id as string;
    const sessionId = crypto.randomUUID();

    try {
      await service.from("phase4_autopilot_configs").upsert(
        {
          project_id: projectId,
          user_id: user.id,
          status: "running",
          last_error: null,
          next_run_at:
            config?.enabled
              ? new Date(Date.now() + Math.max(30, config?.run_interval_minutes || 360) * 60000).toISOString()
              : null,
        },
        { onConflict: "project_id,user_id" },
      );

      const toneProfile = await analyzeBrandTone(openAIKey, siteUrl, websiteContext);
      const outputs: Array<Record<string, unknown>> = [];

      for (const keyword of targetKeywords) {
        const serpData = await openAIChat({
          apiKey: openAIKey,
          model: OPENAI_MODEL_FAST,
          user: `Perform deep SERP analysis for keyword "${keyword}". Return concise notes with intent, top competitor patterns, and PAA.`,
          temperature: 0.4,
        });

        const article = await generateSEOArticle({
          apiKey: openAIKey,
          keyword,
          toneProfile,
          serpData,
          sitemapContent: sitemapLike,
          strategy,
        });

        const images = await generateImagesFromFalai({
          supabaseUrl,
          serviceKey,
          prompts: article.imagePrompts,
        });

        const fullArticle: ArticleResult = {
          title: article.title,
          metaDescription: article.metaDescription,
          slug: article.slug,
          content: article.content,
          charts: article.charts,
          images,
        };

        const { data: contentItem, error: contentError } = await service
          .from("content_items")
          .insert({
            project_id: projectId,
            user_id: user.id,
            content_type: "blog",
            title: fullArticle.title,
            content: fullArticle.content,
            status: "draft",
            seo_score: null,
            keywords: [keyword],
            metadata: {
              run_id: runId,
              strategy,
              toneProfile,
              metaDescription: fullArticle.metaDescription,
              slug: fullArticle.slug,
              featuredImage: fullArticle.images[0] || null,
              contentImages: fullArticle.images.slice(1),
              charts: fullArticle.charts,
              sourceSite: siteUrl,
              internalLinksUsed: parseSitemapUrls(sitemapLike).slice(0, 20),
            },
          })
          .select()
          .single();
        if (contentError) throw contentError;

        if (config?.auto_publish_site) {
          await fetch(`${supabaseUrl}/functions/v1/wordpress-automation`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              action: "create_post",
              user_id: user.id,
              session_id: sessionId,
              post: {
                title: fullArticle.title,
                content: fullArticle.content,
                excerpt: fullArticle.metaDescription,
                tags: [keyword],
                categories: [project.industry || "General"],
                featured_image_url: fullArticle.images[0]?.url,
                status: "published",
              },
            }),
          });
        }

        if (config?.include_parasite_seo || config?.auto_publish_medium) {
          await fetch(`${supabaseUrl}/functions/v1/medium-automation`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              action: "publish_to_medium",
              user_id: user.id,
              session_id: sessionId,
              post: {
                title: fullArticle.title,
                content: fullArticle.content,
                tags: [keyword, project.industry || "business"],
                published: true,
                publish_status: "published",
                canonical_url: siteUrl,
              },
            }),
          });
        }

        if (config?.auto_publish_social) {
          const platforms = Array.isArray(config?.social_platforms)
            ? (config.social_platforms as string[])
            : ["linkedin", "twitter"];
          const caption = `${fullArticle.title}\n\n${fullArticle.metaDescription}\n\nRead more: ${siteUrl}/${fullArticle.slug}`;

          const createResp = await fetch(`${supabaseUrl}/functions/v1/social-scheduler`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              action: "create_post",
              userId: user.id,
              postData: {
                campaignId: null,
                content: { default: caption },
                mediaUrls: fullArticle.images.map((i) => i.url),
                platforms,
              },
            }),
          });
          const createData = await createResp.json().catch(() => ({}));
          const postId = createData?.data?.id;
          if (postId) {
            await fetch(`${supabaseUrl}/functions/v1/social-scheduler`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${serviceKey}`,
              },
              body: JSON.stringify({
                action: "post_now",
                userId: user.id,
                postId,
              }),
            });
          }
        }

        await service.from("agent_activity_logs").insert({
          agent_id: "content-agent",
          agent_name: "SEO & Social Autopilot Agent",
          action: `Generated and optimized article for keyword: ${keyword}`,
          status: "completed",
          metadata: { projectId, runId, keyword, content_item_id: contentItem.id, siteUrl },
        });

        outputs.push({
          keyword,
          contentItemId: contentItem.id,
          title: fullArticle.title,
          slug: fullArticle.slug,
          imagesGenerated: fullArticle.images.length,
          chartsGenerated: fullArticle.charts.length,
        });
      }

      await service
        .from("phase4_autopilot_runs")
        .update({
          status: "completed",
          summary: { phase3Site: siteUrl, outputs },
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId);

      await service
        .from("phase4_autopilot_configs")
        .upsert(
          {
            project_id: projectId,
            user_id: user.id,
            status: "idle",
            last_run_at: new Date().toISOString(),
            next_run_at:
              config?.enabled
                ? new Date(Date.now() + Math.max(30, config?.run_interval_minutes || 360) * 60000).toISOString()
                : null,
          },
          { onConflict: "project_id,user_id" },
        );

      return jsonResponse({ success: true, runId, outputs, toneProfile, phase3Site: siteUrl });
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : "Autopilot run failed";
      await service
        .from("phase4_autopilot_runs")
        .update({
          status: "error",
          summary: { error: message },
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId);

      await service
        .from("phase4_autopilot_configs")
        .upsert(
          {
            project_id: projectId,
            user_id: user.id,
            status: "error",
            last_error: message,
          },
          { onConflict: "project_id,user_id" },
        );

      return jsonResponse({ success: false, error: message }, 500);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[phase4-autopilot] error:", message);
    return jsonResponse({ success: false, error: message }, 500);
  }
});
