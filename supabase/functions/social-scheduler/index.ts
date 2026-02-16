import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

async function getMcpCredentials(supabase: any, userId: string, mcpServerId: string) {
  const { data, error } = await supabase.functions.invoke("get-mcp-credentials", {
    body: { userId, mcpServerId },
  });
  if (error) throw error;
  if (!data?.success || !data?.credentials) {
    throw new Error(data?.error || `Credentials are not configured for ${mcpServerId}`);
  }
  return data.credentials as Record<string, string>;
}

async function invokeMcpFunction(
  supabase: any,
  functionName: string,
  payload: JsonRecord,
) {
  const { data, error } = await supabase.functions.invoke(functionName, { body: payload });
  if (error) throw error;
  return data;
}

async function logAgentActivity(supabase: any, action: string, status: string, metadata?: JsonRecord) {
  await supabase.from("agent_activity_logs").insert({
    agent_id: "social-media-agent",
    agent_name: "Social Media Manager",
    action,
    status,
    metadata: metadata || {},
  });
}

async function postToLinkedIn(
  supabase: any,
  userId: string,
  content: string,
) {
  const credentials = await getMcpCredentials(supabase, userId, "mcp-linkedin");
  const data = await invokeMcpFunction(supabase, "mcp-linkedin", {
    tool: "post_update",
    arguments: { text: content, visibility: "PUBLIC" },
    credentials,
  });

  if (!data?.success) throw new Error(data?.error || "LinkedIn publish failed");
  return {
    success: true,
    platformPostId: data?.data?.postId || null,
    url: data?.data?.postId ? `https://www.linkedin.com/feed/update/${data.data.postId}` : null,
    raw: data,
  };
}

async function postToFacebook(
  supabase: any,
  userId: string,
  content: string,
) {
  const credentials = await getMcpCredentials(supabase, userId, "mcp-facebook");
  const pageId = credentials.FACEBOOK_PAGE_ID;
  const accessToken = credentials.FACEBOOK_ACCESS_TOKEN;
  if (!pageId || !accessToken) throw new Error("Facebook PAGE_ID or ACCESS_TOKEN is missing");

  const response = await fetch(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: content, access_token: accessToken }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.error) {
    throw new Error(data?.error?.message || `Facebook publish failed (${response.status})`);
  }

  return {
    success: true,
    platformPostId: data?.id || null,
    url: data?.id ? `https://www.facebook.com/${data.id}` : null,
    raw: data,
  };
}

async function postToInstagram(
  supabase: any,
  userId: string,
  content: string,
  mediaUrl?: string,
) {
  if (!mediaUrl) {
    return {
      success: false,
      error: "Instagram requires at least one image URL",
    };
  }

  const credentials = await getMcpCredentials(supabase, userId, "mcp-instagram");
  const data = await invokeMcpFunction(supabase, "mcp-instagram", {
    tool: "publish_media",
    arguments: { image_url: mediaUrl, caption: content },
    credentials,
  });

  if (!data?.success) throw new Error(data?.error || "Instagram publish failed");
  const postId = data?.data?.id || null;
  return {
    success: true,
    platformPostId: postId,
    url: postId ? `https://www.instagram.com/p/${postId}` : null,
    raw: data,
  };
}

async function postToTwitter(
  supabase: any,
  userId: string,
  content: string,
) {
  const credentials = await getMcpCredentials(supabase, userId, "mcp-twitter");
  const data = await invokeMcpFunction(supabase, "mcp-twitter", {
    tool: "post_tweet",
    arguments: { text: content },
    credentials,
  });

  if (!data?.success) throw new Error(data?.error || "Twitter publish failed");
  if (!data?.data?.posted) {
    return {
      success: false,
      error: data?.data?.message || "Twitter posting is not fully configured",
      raw: data,
    };
  }

  return {
    success: true,
    platformPostId: data?.data?.id || null,
    url: data?.data?.id ? `https://x.com/i/web/status/${data.data.id}` : null,
    raw: data,
  };
}

async function publishToPlatform(args: {
  supabase: any;
  userId: string;
  platform: string;
  content: string;
  mediaUrls: string[];
}) {
  const platform = args.platform.toLowerCase();

  if (platform === "linkedin") return await postToLinkedIn(args.supabase, args.userId, args.content);
  if (platform === "facebook") return await postToFacebook(args.supabase, args.userId, args.content);
  if (platform === "instagram") return await postToInstagram(args.supabase, args.userId, args.content, args.mediaUrls[0]);
  if (platform === "twitter" || platform === "x") return await postToTwitter(args.supabase, args.userId, args.content);

  return { success: false, error: `Unsupported platform: ${args.platform}` };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, userId, postId, postData } = await req.json();
    assertRequired(action, "action");
    assertRequired(userId, "userId");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) throw new Error("Supabase environment is missing");

    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === "create_post") {
      assertRequired(postData?.content, "postData.content");
      const platforms = Array.isArray(postData?.platforms) ? postData.platforms : [];
      if (platforms.length === 0) throw new Error("At least one platform is required");

      const { data, error } = await supabase
        .from("social_posts")
        .insert({
          user_id: userId,
          campaign_id: postData?.campaignId || null,
          content: postData.content,
          media_urls: Array.isArray(postData?.mediaUrls) ? postData.mediaUrls : [],
          platforms,
          scheduled_at: postData?.scheduledAt || null,
          status: postData?.scheduledAt ? "scheduled" : "draft",
        })
        .select()
        .single();

      if (error) throw error;

      await logAgentActivity(
        supabase,
        `Created social post for ${platforms.join(", ")}`,
        "completed",
        { post_id: data.id, platforms },
      );

      return jsonResponse({ success: true, data });
    }

    if (action === "post_now") {
      assertRequired(postId, "postId");
      const { data: post, error: fetchError } = await supabase
        .from("social_posts")
        .select("*")
        .eq("id", postId)
        .eq("user_id", userId)
        .single();
      if (fetchError) throw fetchError;

      const platforms = Array.isArray(post?.platforms) ? post.platforms : [];
      const mediaUrls = Array.isArray(post?.media_urls) ? post.media_urls : [];
      const postResults: Record<string, unknown> = {};

      for (const platform of platforms) {
        const key = String(platform);
        const platformContent =
          post?.content?.[key] ||
          post?.content?.default ||
          "";

        try {
          const result = await publishToPlatform({
            supabase,
            userId,
            platform: key,
            content: String(platformContent),
            mediaUrls: mediaUrls.map((u: unknown) => String(u)),
          });
          postResults[key] = result;
        } catch (platformError) {
          postResults[key] = {
            success: false,
            error: platformError instanceof Error ? platformError.message : "Unknown error",
          };
        }
      }

      const total = Object.keys(postResults).length;
      const successCount = Object.values(postResults).filter((v: unknown) => (v as JsonRecord)?.success === true).length;
      const finalStatus = successCount === total ? "posted" : successCount > 0 ? "partial" : "failed";

      const { data: updatedPost, error: updateError } = await supabase
        .from("social_posts")
        .update({
          status: finalStatus,
          posted_at: successCount > 0 ? new Date().toISOString() : null,
          post_results: postResults,
        })
        .eq("id", postId)
        .eq("user_id", userId)
        .select()
        .single();

      if (updateError) throw updateError;

      await logAgentActivity(
        supabase,
        `Published social post to ${platforms.join(", ")}`,
        finalStatus === "failed" ? "failed" : "completed",
        { post_id: postId, results: postResults, success_count: successCount, total },
      );

      return jsonResponse({
        success: finalStatus !== "failed",
        data: {
          post: updatedPost,
          results: postResults,
          success_count: successCount,
          total,
        },
      }, finalStatus === "failed" ? 500 : 200);
    }

    if (action === "schedule_post") {
      assertRequired(postId, "postId");
      assertRequired(postData?.scheduledAt, "postData.scheduledAt");
      const { data, error } = await supabase
        .from("social_posts")
        .update({
          scheduled_at: postData.scheduledAt,
          status: "scheduled",
        })
        .eq("id", postId)
        .eq("user_id", userId)
        .select()
        .single();
      if (error) throw error;
      return jsonResponse({ success: true, data });
    }

    if (action === "get_scheduled") {
      const { data, error } = await supabase
        .from("social_posts")
        .select("*, marketing_campaigns(name)")
        .eq("user_id", userId)
        .eq("status", "scheduled")
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return jsonResponse({ success: true, data });
    }

    if (action === "process_scheduled") {
      const { data: duePosts, error } = await supabase
        .from("social_posts")
        .select("*")
        .eq("status", "scheduled")
        .lte("scheduled_at", new Date().toISOString());
      if (error) throw error;

      const results: Array<Record<string, unknown>> = [];
      for (const post of duePosts || []) {
        const postNowResp = await invokeMcpFunction(supabase, "social-scheduler", {
          action: "post_now",
          userId: post.user_id,
          postId: post.id,
        });
        results.push({ postId: post.id, result: postNowResp });
      }

      return jsonResponse({ success: true, data: { processed: results.length, results } });
    }

    if (action === "generate_caption") {
      const openAiKey = Deno.env.get("OPENAI_API_KEY");
      const platforms = Array.isArray(postData?.platforms) ? postData.platforms : [];
      const topic = String(postData?.topic || "our latest product");
      const tone = String(postData?.tone || "professional and engaging");

      if (!openAiKey) {
        const fallback = `New update: ${topic}\n\nBuilt for growth. #marketing #automation`;
        return jsonResponse({ success: true, data: { captions: fallback, warning: "OPENAI_API_KEY missing, used fallback caption." } });
      }

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.7,
          messages: [
            {
              role: "system",
              content:
                "You are a social media strategist. Return concise, high-performing post captions. Output valid JSON object with one key per platform and a default key.",
            },
            {
              role: "user",
              content: `Generate captions for platforms: ${platforms.join(", ")}.
Topic: ${topic}
Tone: ${tone}
Include sensible hashtags. JSON only.`,
            },
          ],
        }),
      });

      const aiData = await response.json().catch(() => ({}));
      const raw = String(aiData?.choices?.[0]?.message?.content || "").trim();
      let captions: unknown = raw;
      try {
        captions = JSON.parse(raw);
      } catch {
        captions = raw;
      }

      return jsonResponse({ success: true, data: { captions } });
    }

    return jsonResponse({ success: false, error: `Unknown action: ${action}` }, 400);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Social scheduler error:", errorMessage);
    return jsonResponse({ success: false, error: errorMessage }, 500);
  }
});

