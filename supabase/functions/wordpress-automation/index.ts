import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WordPressPost {
  title: string;
  content: string;
  excerpt?: string;
  tags?: string[];
  categories?: string[];
  featured_image_url?: string;
  status?: "draft" | "pending" | "published";
  scheduled_date?: string;
  author_id?: string;
}

type JsonRecord = Record<string, unknown>;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function assertRequired(value: unknown, name: string) {
  if (!value || (typeof value === "string" && !value.trim())) {
    throw new Error(`${name} is required`);
  }
}

function toSlug(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function normalizeWpStatus(status?: string) {
  if (!status) return "draft";
  if (status === "published") return "publish";
  return status;
}

async function getMcpCredentials(supabase: any, userId: string, mcpServerId: string) {
  const { data, error } = await supabase.functions.invoke("get-mcp-credentials", {
    body: { userId, mcpServerId },
  });

  if (error) throw error;
  if (!data?.success || !data?.credentials) {
    throw new Error(data?.error || `Credentials not configured for ${mcpServerId}`);
  }

  return data.credentials as Record<string, string>;
}

async function invokeMcpWordPress(
  supabase: any,
  userId: string,
  tool: string,
  args: JsonRecord = {},
) {
  const credentials = await getMcpCredentials(supabase, userId, "mcp-wordpress");
  const { data, error } = await supabase.functions.invoke("mcp-wordpress", {
    body: { tool, arguments: args, credentials },
  });

  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || `mcp-wordpress ${tool} failed`);

  return data.data;
}

async function logAudit(args: {
  supabase: any;
  userId?: string;
  sessionId?: string;
  action: string;
  status: "success" | "error" | "warning";
  durationMs?: number;
  errorMessage?: string;
}) {
  if (!args.userId) return;
  await args.supabase.from("browser_automation_audit").insert({
    user_id: args.userId,
    session_id: args.sessionId || null,
    provider: "mcp-wordpress",
    action: args.action,
    status: args.status,
    duration_ms: args.durationMs ?? null,
    error_message: args.errorMessage ?? null,
  });
}

async function resolveWordPressIds(
  supabase: any,
  userId: string,
  categories?: string[],
  tags?: string[],
) {
  const categoryNames = Array.isArray(categories) ? categories.filter(Boolean) : [];
  const tagNames = Array.isArray(tags) ? tags.filter(Boolean) : [];

  const existingCategories = (await invokeMcpWordPress(supabase, userId, "get_categories", {})) as Array<JsonRecord>;
  const categoryMap = new Map(
    (existingCategories || []).map((c) => [String(c.name || "").toLowerCase(), Number(c.id)]),
  );
  const categoryIds = categoryNames
    .map((name) => categoryMap.get(name.toLowerCase()))
    .filter((id): id is number => Number.isFinite(id));

  let tagIds: number[] = [];
  if (tagNames.length > 0) {
    try {
      const credentials = await getMcpCredentials(supabase, userId, "mcp-wordpress");
      const baseSite = (credentials.WORDPRESS_URL || "").replace(/\/$/, "");
      const username = credentials.WORDPRESS_USERNAME;
      const password = credentials.WORDPRESS_APP_PASSWORD;
      if (baseSite && username && password) {
        const auth = "Basic " + btoa(`${username}:${password}`);
        const tagsResp = await fetch(`${baseSite}/wp-json/wp/v2/tags?per_page=100`, {
          headers: { Authorization: auth, "Content-Type": "application/json" },
        });
        const wpTags = await tagsResp.json().catch(() => []);
        const tagMap = new Map(
          (Array.isArray(wpTags) ? wpTags : []).map((t: JsonRecord) => [String(t.name || "").toLowerCase(), Number(t.id)]),
        );
        tagIds = tagNames
          .map((name) => tagMap.get(name.toLowerCase()))
          .filter((id): id is number => Number.isFinite(id));
      }
    } catch {
      tagIds = [];
    }
  }

  return { categoryIds, tagIds };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const started = Date.now();

  try {
    const { action, user_id, session_id, post, blog_url, post_id, category, search_query } = await req.json();
    assertRequired(action, "action");
    assertRequired(user_id, "user_id");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) throw new Error("Supabase environment is missing");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "authenticate_wordpress") {
      const site = blog_url || null;
      const me = await invokeMcpWordPress(supabase, user_id, "get_users");
      await logAudit({
        supabase,
        userId: user_id,
        sessionId: session_id,
        action: "authenticate_wordpress",
        status: "success",
        durationMs: Date.now() - started,
      });
      return jsonResponse({ success: true, wordpress_info: { site_url: site, users: me } });
    }

    if (action === "get_categories") {
      const categories = await invokeMcpWordPress(supabase, user_id, "get_categories");
      return jsonResponse({ success: true, categories, total: Array.isArray(categories) ? categories.length : 0 });
    }

    if (action === "create_category") {
      assertRequired(category?.name, "category.name");
      const credentials = await getMcpCredentials(supabase, user_id, "mcp-wordpress");
      const site = (credentials.WORDPRESS_URL || "").replace(/\/$/, "");
      const username = credentials.WORDPRESS_USERNAME;
      const password = credentials.WORDPRESS_APP_PASSWORD;
      if (!site || !username || !password) throw new Error("WordPress credentials missing");

      const auth = "Basic " + btoa(`${username}:${password}`);
      const resp = await fetch(`${site}/wp-json/wp/v2/categories`, {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: category.name,
          slug: category.slug || toSlug(category.name),
          description: category.description || "",
        }),
      });
      const result = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(`Failed to create category (${resp.status})`);

      return jsonResponse({ success: true, category: result, duration_ms: Date.now() - started });
    }

    if (action === "create_post") {
      assertRequired(post?.title, "post.title");
      assertRequired(post?.content, "post.content");

      const wpPost = post as WordPressPost;
      const { categoryIds, tagIds } = await resolveWordPressIds(
        supabase,
        user_id,
        wpPost.categories,
        wpPost.tags,
      );

      const mcpResult = await invokeMcpWordPress(supabase, user_id, "create_post", {
        title: wpPost.title,
        content: wpPost.content,
        status: normalizeWpStatus(wpPost.status),
        excerpt: wpPost.excerpt || "",
        categories: categoryIds,
        tags: tagIds,
      });

      const created = (mcpResult || {}) as JsonRecord;
      const wordpressId = Number(created.id);
      const wordpressUrl = String(created.link || "");

      const { data: savedPost, error: saveError } = await supabase
        .from("blog_posts")
        .insert({
          user_id: user_id,
          title: wpPost.title,
          slug: toSlug(wpPost.title),
          content: wpPost.content,
          excerpt: wpPost.excerpt || wpPost.content.replace(/<[^>]+>/g, "").slice(0, 300),
          featured_image_url: wpPost.featured_image_url || null,
          status: wpPost.status || "draft",
          published_at: wpPost.status === "published" ? new Date().toISOString() : null,
          wordpress_id: Number.isFinite(wordpressId) ? wordpressId : null,
          wordpress_url: wordpressUrl || null,
          meta: {
            platform: "wordpress",
            requested_categories: wpPost.categories || [],
            requested_tags: wpPost.tags || [],
            mapped_category_ids: categoryIds,
            mapped_tag_ids: tagIds,
            mcp_response: created,
          },
        })
        .select()
        .single();
      if (saveError) throw saveError;

      await logAudit({
        supabase,
        userId: user_id,
        sessionId: session_id,
        action: "create_post",
        status: "success",
        durationMs: Date.now() - started,
      });

      return jsonResponse({
        success: true,
        post: created,
        saved_post: savedPost,
        duration_ms: Date.now() - started,
      });
    }

    if (action === "update_post") {
      assertRequired(post_id, "post_id");
      assertRequired(post?.title, "post.title");
      const wpPost = post as WordPressPost;
      const { categoryIds, tagIds } = await resolveWordPressIds(
        supabase,
        user_id,
        wpPost.categories,
        wpPost.tags,
      );

      const updated = await invokeMcpWordPress(supabase, user_id, "update_post", {
        post_id,
        title: wpPost.title,
        content: wpPost.content,
        status: normalizeWpStatus(wpPost.status),
        excerpt: wpPost.excerpt || "",
        categories: categoryIds,
        tags: tagIds,
      });

      await supabase
        .from("blog_posts")
        .update({
          title: wpPost.title,
          slug: toSlug(wpPost.title),
          content: wpPost.content || null,
          excerpt: wpPost.excerpt || null,
          featured_image_url: wpPost.featured_image_url || null,
          status: wpPost.status || null,
          updated_at: new Date().toISOString(),
          meta: {
            platform: "wordpress",
            mapped_category_ids: categoryIds,
            mapped_tag_ids: tagIds,
            mcp_response: updated,
          },
        })
        .eq("id", post_id)
        .eq("user_id", user_id);

      await logAudit({
        supabase,
        userId: user_id,
        sessionId: session_id,
        action: "update_post",
        status: "success",
        durationMs: Date.now() - started,
      });

      return jsonResponse({ success: true, post: updated, duration_ms: Date.now() - started });
    }

    if (action === "delete_post") {
      assertRequired(post_id, "post_id");
      const credentials = await getMcpCredentials(supabase, user_id, "mcp-wordpress");
      const site = (credentials.WORDPRESS_URL || "").replace(/\/$/, "");
      const username = credentials.WORDPRESS_USERNAME;
      const password = credentials.WORDPRESS_APP_PASSWORD;
      if (!site || !username || !password) throw new Error("WordPress credentials missing");
      const auth = "Basic " + btoa(`${username}:${password}`);

      const wpResp = await fetch(`${site}/wp-json/wp/v2/posts/${post_id}?force=true`, {
        method: "DELETE",
        headers: { Authorization: auth, "Content-Type": "application/json" },
      });
      const wpResult = await wpResp.json().catch(() => ({}));
      if (!wpResp.ok) throw new Error(`WordPress delete failed (${wpResp.status})`);

      await supabase.from("blog_posts").delete().eq("id", post_id).eq("user_id", user_id);

      await logAudit({
        supabase,
        userId: user_id,
        sessionId: session_id,
        action: "delete_post",
        status: "success",
        durationMs: Date.now() - started,
      });

      return jsonResponse({ success: true, result: wpResult, duration_ms: Date.now() - started });
    }

    if (action === "get_plugins") {
      const plugins = await invokeMcpWordPress(supabase, user_id, "get_plugins");
      return jsonResponse({
        success: true,
        plugins,
        note: "WordPress core REST does not expose plugins without plugin-specific endpoints.",
      });
    }

    if (action === "optimize_post_seo") {
      assertRequired(post?.title, "post.title");
      assertRequired(post?.content, "post.content");
      const title = String(post.title);
      const content = String(post.content);
      const wordCount = content.replace(/<[^>]+>/g, "").trim().split(/\s+/).filter(Boolean).length;
      const keyword = title.split(/\s+/).slice(0, 3).join(" ");
      const hasKeywordInTitle = title.toLowerCase().includes(keyword.toLowerCase());
      const hasKeywordInIntro = content.toLowerCase().slice(0, 300).includes(keyword.toLowerCase());
      const seoScore = Math.min(100, (hasKeywordInTitle ? 35 : 0) + (hasKeywordInIntro ? 25 : 0) + Math.min(40, Math.floor(wordCount / 30)));

      return jsonResponse({
        success: true,
        optimization: {
          post_id: post_id || null,
          seo_score: seoScore,
          title_recommendation: title.length > 60 ? "Shorten title to <= 60 chars" : "Title length is healthy",
          meta_description_recommendation:
            (post.excerpt || "").length > 160
              ? "Trim meta description to ~155 chars"
              : "Meta description length is healthy",
          content_word_count: wordCount,
          suggested_internal_links: 3,
          suggested_schema: "BlogPosting",
        },
      });
    }

    if (action === "search_posts") {
      const query = String(search_query || "").trim().toLowerCase();
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id,title,excerpt,status,published_at,updated_at,wordpress_url")
        .eq("user_id", user_id)
        .order("updated_at", { ascending: false })
        .limit(100);
      if (error) throw error;

      const rows = Array.isArray(data) ? data : [];
      const results = query
        ? rows.filter((r) => {
            const title = String(r.title || "").toLowerCase();
            const excerpt = String(r.excerpt || "").toLowerCase();
            return title.includes(query) || excerpt.includes(query);
          })
        : rows;

      return jsonResponse({ success: true, query: search_query || "", results, total: results.length });
    }

    return jsonResponse({ success: false, error: "Unknown action", action }, 400);
  } catch (error) {
    console.error("Error in wordpress-automation:", error);
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});
