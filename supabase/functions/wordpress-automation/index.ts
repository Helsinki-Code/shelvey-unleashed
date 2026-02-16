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

async function getMcpCredentials(supabase: any, userId: string) {
  const { data, error } = await supabase.functions.invoke("get-mcp-credentials", {
    body: { userId, mcpServerId: "mcp-wordpress" },
  });

  if (error) throw error;
  if (!data?.success || !data?.credentials) {
    throw new Error(data?.error || "WordPress credentials are not configured");
  }

  return data.credentials as Record<string, string>;
}

async function invokeMcpWordPress(
  supabase: any,
  userId: string,
  tool: string,
  args: JsonRecord = {},
) {
  const credentials = await getMcpCredentials(supabase, userId);
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

function normalizedWpStatus(status?: WordPressPost["status"]) {
  if (status === "published") return "publish";
  if (status === "pending") return "pending";
  return "draft";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const started = Date.now();

  try {
    const { action, user_id, session_id, post, post_id, category, search_query } = await req.json();
    assertRequired(action, "action");
    assertRequired(user_id, "user_id");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) throw new Error("Supabase environment is missing");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "authenticate_wordpress") {
      const credentials = await getMcpCredentials(supabase, user_id);
      const siteInfo = await invokeMcpWordPress(supabase, user_id, "get_users");
      await logAudit({
        supabase,
        userId: user_id,
        sessionId: session_id,
        action: "authenticate_wordpress",
        status: "success",
        durationMs: Date.now() - started,
      });
      return jsonResponse({
        success: true,
        wordpress_info: {
          blog_url: credentials.WORDPRESS_URL,
          username: credentials.WORDPRESS_USERNAME,
          users_count: Array.isArray(siteInfo) ? siteInfo.length : null,
          connected: true,
        },
        duration_ms: Date.now() - started,
      });
    }

    if (action === "create_post") {
      assertRequired(post?.title, "post.title");
      assertRequired(post?.content, "post.content");

      const wpPost = await invokeMcpWordPress(supabase, user_id, "create_post", {
        title: post.title,
        content: post.content,
        excerpt: post.excerpt || null,
        status: normalizedWpStatus(post.status),
      });

      const parsedWpPost = (wpPost || {}) as JsonRecord;
      const wpPostId = parsedWpPost.id ? Number(parsedWpPost.id) : null;
      const wpUrl = parsedWpPost.link ? String(parsedWpPost.link) : null;

      const { data: savedPost, error: saveError } = await supabase
        .from("blog_posts")
        .insert({
          user_id: user_id,
          title: String(post.title),
          slug: toSlug(String(post.title)),
          content: String(post.content),
          excerpt: post.excerpt || String(post.content).replace(/<[^>]+>/g, "").slice(0, 300),
          featured_image_url: post.featured_image_url || null,
          status: post.status === "published" ? "published" : "draft",
          published_at: post.status === "published" ? new Date().toISOString() : null,
          wordpress_id: Number.isFinite(wpPostId) ? wpPostId : null,
          wordpress_url: wpUrl,
          meta: {
            platform: "wordpress",
            tags: post.tags || [],
            categories: post.categories || [],
            mcp_response: wpPost,
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
        post: savedPost,
        wordpress_result: wpPost,
        duration_ms: Date.now() - started,
      });
    }

    if (action === "update_post") {
      assertRequired(post_id, "post_id");

      let wpResult: unknown = null;
      const { data: localPost } = await supabase
        .from("blog_posts")
        .select("id,wordpress_id,user_id")
        .eq("id", post_id)
        .eq("user_id", user_id)
        .single();

      if (localPost?.wordpress_id) {
        wpResult = await invokeMcpWordPress(supabase, user_id, "update_post", {
          post_id: localPost.wordpress_id,
          title: post?.title,
          content: post?.content,
          excerpt: post?.excerpt || null,
          status: normalizedWpStatus(post?.status),
        });
      }

      const { data: updated, error: updateError } = await supabase
        .from("blog_posts")
        .update({
          title: post?.title || undefined,
          slug: post?.title ? toSlug(post.title) : undefined,
          content: post?.content || undefined,
          excerpt: post?.excerpt || undefined,
          featured_image_url: post?.featured_image_url || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", post_id)
        .eq("user_id", user_id)
        .select()
        .single();

      if (updateError) throw updateError;

      await logAudit({
        supabase,
        userId: user_id,
        sessionId: session_id,
        action: "update_post",
        status: "success",
        durationMs: Date.now() - started,
      });

      return jsonResponse({ success: true, post: updated, wordpress_result: wpResult });
    }

    if (action === "delete_post") {
      assertRequired(post_id, "post_id");
      const { data: localPost } = await supabase
        .from("blog_posts")
        .select("id,wordpress_id,user_id")
        .eq("id", post_id)
        .eq("user_id", user_id)
        .single();

      if (localPost?.wordpress_id) {
        await invokeMcpWordPress(supabase, user_id, "update_post", {
          post_id: localPost.wordpress_id,
          status: "trash",
        });
      }

      const { error } = await supabase.from("blog_posts").delete().eq("id", post_id).eq("user_id", user_id);
      if (error) throw error;

      await logAudit({
        supabase,
        userId: user_id,
        sessionId: session_id,
        action: "delete_post",
        status: "success",
        durationMs: Date.now() - started,
      });

      return jsonResponse({ success: true, deleted: true });
    }

    if (action === "get_categories") {
      const categories = await invokeMcpWordPress(supabase, user_id, "get_categories");
      return jsonResponse({ success: true, categories, total: Array.isArray(categories) ? categories.length : 0 });
    }

    if (action === "create_category") {
      assertRequired(category?.name, "category.name");
      const credentials = await getMcpCredentials(supabase, user_id);
      const siteBase = credentials.WORDPRESS_URL.replace(/\/$/, "");
      const authHeader = "Basic " + btoa(`${credentials.WORDPRESS_USERNAME}:${credentials.WORDPRESS_APP_PASSWORD}`);

      const response = await fetch(`${siteBase}/wp-json/wp/v2/categories`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: category.name,
          slug: category.slug || toSlug(category.name),
          description: category.description || "",
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(`WordPress create category failed (${response.status})`);
      return jsonResponse({ success: true, category: result });
    }

    if (action === "get_plugins") {
      const credentials = await getMcpCredentials(supabase, user_id);
      const siteBase = credentials.WORDPRESS_URL.replace(/\/$/, "");
      const authHeader = "Basic " + btoa(`${credentials.WORDPRESS_USERNAME}:${credentials.WORDPRESS_APP_PASSWORD}`);
      const response = await fetch(`${siteBase}/wp-json/wp/v2/plugins`, {
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
      });

      if (response.status === 404) {
        return jsonResponse({
          success: true,
          plugins: [],
          note: "Plugins endpoint is unavailable. Install WP REST API plugin endpoint for plugin inventory.",
        });
      }

      const plugins = await response.json().catch(() => []);
      if (!response.ok) throw new Error(`WordPress plugins fetch failed (${response.status})`);
      return jsonResponse({
        success: true,
        plugins,
        total: Array.isArray(plugins) ? plugins.length : 0,
      });
    }

    if (action === "optimize_post_seo") {
      assertRequired(post_id, "post_id");
      const contentText = String(post?.content || "");
      const title = String(post?.title || "");
      const excerpt = String(post?.excerpt || "");
      const score =
        Math.max(0, Math.min(100,
          (title.length >= 40 && title.length <= 65 ? 30 : 20) +
          (excerpt.length >= 120 && excerpt.length <= 160 ? 25 : 15) +
          (contentText.split(/\s+/).filter(Boolean).length >= 800 ? 30 : 15) +
          (/<h2|##\s/.test(contentText) ? 15 : 5),
        ));

      return jsonResponse({
        success: true,
        optimization: {
          post_id,
          seo_score_estimate: score,
          recommendations: [
            "Use one primary keyword in title, first paragraph, and one H2.",
            "Keep meta description around 140-160 characters.",
            "Add at least 2 internal links and 1 external authority link.",
            "Ensure image alt tags include semantic context.",
          ],
        },
      });
    }

    if (action === "search_posts") {
      const query = String(search_query || "").trim();
      const dbQuery = supabase
        .from("blog_posts")
        .select("id,title,excerpt,published_at,status,wordpress_url")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false })
        .limit(50);

      const { data, error } = query
        ? await dbQuery.or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        : await dbQuery;

      if (error) throw error;
      return jsonResponse({
        success: true,
        query,
        results: data || [],
        total: Array.isArray(data) ? data.length : 0,
      });
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

