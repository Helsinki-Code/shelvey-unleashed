import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MediumPost {
  title: string;
  content: string;
  tags?: string[];
  published?: boolean;
  canonical_url?: string;
  publish_status?: "draft" | "published" | "unlisted";
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

function normalizeMediumStatus(input?: string, published?: boolean) {
  if (!input) return published ? "public" : "draft";
  if (input === "published") return "public";
  return input;
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

async function invokeMcpMedium(
  supabase: any,
  userId: string,
  tool: string,
  args: JsonRecord = {},
) {
  const credentials = await getMcpCredentials(supabase, userId, "mcp-medium");
  const { data, error } = await supabase.functions.invoke("mcp-medium", {
    body: { tool, arguments: args, credentials },
  });

  if (error) throw error;
  if (!data?.success) throw new Error(data?.error || `mcp-medium ${tool} failed`);

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
    provider: "mcp-medium",
    action: args.action,
    status: args.status,
    duration_ms: args.durationMs ?? null,
    error_message: args.errorMessage ?? null,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const started = Date.now();

  try {
    const { action, user_id, session_id, post, post_id, publication_id } = await req.json();
    assertRequired(action, "action");
    assertRequired(user_id, "user_id");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) throw new Error("Supabase environment is missing");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "authenticate_medium" || action === "get_user_profile") {
      const profile = await invokeMcpMedium(supabase, user_id, "get_user");
      await logAudit({
        supabase,
        userId: user_id,
        sessionId: session_id,
        action: action === "authenticate_medium" ? "authenticate_medium" : "get_user_profile",
        status: "success",
        durationMs: Date.now() - started,
      });
      return jsonResponse({ success: true, profile, duration_ms: Date.now() - started });
    }

    if (action === "get_publications") {
      const publications = await invokeMcpMedium(supabase, user_id, "get_publications");
      await logAudit({
        supabase,
        userId: user_id,
        sessionId: session_id,
        action: "get_publications",
        status: "success",
        durationMs: Date.now() - started,
      });
      return jsonResponse({ success: true, publications });
    }

    if (action === "publish_to_medium") {
      assertRequired(post?.title, "post.title");
      assertRequired(post?.content, "post.content");

      const mcpResult = await invokeMcpMedium(supabase, user_id, "create_post", {
        title: post.title,
        content: post.content,
        content_format: "html",
        publish_status: normalizeMediumStatus(post.publish_status, post.published),
        tags: Array.isArray(post.tags) ? post.tags.slice(0, 5) : [],
        canonical_url: post.canonical_url,
      });

      const mediumPost = (mcpResult?.data || mcpResult || {}) as JsonRecord;
      const postUrl = String(mediumPost.url || "");
      const mediumId = String(mediumPost.id || post_id || "");

      const { data: savedPost, error: saveError } = await supabase
        .from("blog_posts")
        .insert({
          user_id: user_id,
          title: String(post.title),
          slug: toSlug(String(post.title)),
          content: String(post.content),
          excerpt: String(post.content).replace(/<[^>]+>/g, "").slice(0, 300),
          status: "published",
          published_at: new Date().toISOString(),
          medium_id: mediumId || null,
          medium_url: postUrl || null,
          meta: {
            platform: "medium",
            tags: post.tags || [],
            canonical_url: post.canonical_url || null,
            mcp_response: mcpResult,
          },
        })
        .select()
        .single();

      if (saveError) throw saveError;

      await logAudit({
        supabase,
        userId: user_id,
        sessionId: session_id,
        action: "publish_to_medium",
        status: "success",
        durationMs: Date.now() - started,
      });

      return jsonResponse({
        success: true,
        post: savedPost,
        medium_result: mcpResult,
        duration_ms: Date.now() - started,
      });
    }

    if (action === "publish_to_publication") {
      assertRequired(publication_id, "publication_id");
      assertRequired(post?.title, "post.title");
      assertRequired(post?.content, "post.content");

      const credentials = await getMcpCredentials(supabase, user_id, "mcp-medium");
      const token = credentials.MEDIUM_INTEGRATION_TOKEN;
      if (!token) throw new Error("MEDIUM_INTEGRATION_TOKEN missing");

      const response = await fetch(`https://api.medium.com/v1/publications/${publication_id}/posts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          title: post.title,
          contentFormat: "html",
          content: post.content,
          publishStatus: normalizeMediumStatus(post.publish_status, post.published),
          tags: Array.isArray(post.tags) ? post.tags.slice(0, 5) : [],
          canonicalUrl: post.canonical_url || undefined,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(`Medium publication publish failed (${response.status})`);

      await logAudit({
        supabase,
        userId: user_id,
        sessionId: session_id,
        action: "publish_to_publication",
        status: "success",
        durationMs: Date.now() - started,
      });

      return jsonResponse({ success: true, publication_id, result, duration_ms: Date.now() - started });
    }

    if (action === "update_post") {
      assertRequired(post_id, "post_id");
      assertRequired(post?.title, "post.title");

      const { data, error } = await supabase
        .from("blog_posts")
        .update({
          title: post.title,
          slug: toSlug(post.title),
          content: post.content || null,
          excerpt: post.content ? String(post.content).replace(/<[^>]+>/g, "").slice(0, 300) : null,
          updated_at: new Date().toISOString(),
          meta: {
            update_note: "Medium API does not support post editing via public integration token API.",
            requested_publish_status: post.publish_status || null,
            requested_tags: post.tags || [],
          },
        })
        .eq("id", post_id)
        .eq("user_id", user_id)
        .select()
        .single();

      if (error) throw error;

      await logAudit({
        supabase,
        userId: user_id,
        sessionId: session_id,
        action: "update_medium_post",
        status: "warning",
        durationMs: Date.now() - started,
      });

      return jsonResponse({
        success: true,
        post: data,
        warning: "Remote Medium post update is not supported by current Medium API; local record was updated.",
      });
    }

    if (action === "delete_post") {
      assertRequired(post_id, "post_id");
      const { error } = await supabase.from("blog_posts").delete().eq("id", post_id).eq("user_id", user_id);
      if (error) throw error;

      await logAudit({
        supabase,
        userId: user_id,
        sessionId: session_id,
        action: "delete_medium_post",
        status: "warning",
        durationMs: Date.now() - started,
      });

      return jsonResponse({
        success: true,
        deleted_local: true,
        warning: "Medium API does not support deleting posts via public integration token API.",
      });
    }

    if (action === "get_post_stats") {
      assertRequired(post_id, "post_id");
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id,title,medium_id,medium_url,published_at,meta")
        .eq("id", post_id)
        .eq("user_id", user_id)
        .single();
      if (error) throw error;

      return jsonResponse({
        success: true,
        stats: {
          post_id: data.id,
          medium_id: data.medium_id,
          medium_url: data.medium_url,
          published_at: data.published_at,
          note: "Live Medium engagement metrics are not available from current Medium API.",
        },
      });
    }

    return jsonResponse({ success: false, error: "Unknown action", action }, 400);
  } catch (error) {
    console.error("Error in medium-automation:", error);
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});
