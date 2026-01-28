import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, content-type",
};

interface BlogRequest {
  action:
    | "get_posts"
    | "publish_post"
    | "get_seo_data"
    | "get_comments"
    | "get_analytics"
    | "get_backlinks"
    | "get_social_metrics";
  postId?: string;
  title?: string;
  content?: string;
  platforms?: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  );

  try {
    const body = (await req.json()) as BlogRequest;
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const userId = user.id;

    switch (body.action) {
      case "get_posts": {
        const { data, error } = await supabase
          .from("blog_posts")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) throw error;

        return new Response(JSON.stringify(data || []), {
          headers: corsHeaders,
        });
      }

      case "publish_post": {
        const postId = crypto.randomUUID();
        const { error } = await supabase
          .from("blog_posts")
          .insert({
            post_id: postId,
            user_id: userId,
            title: body.title,
            content: body.content,
            status: "published",
            published_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          });

        if (error) throw error;

        // Log the publishing action
        await supabase.from("blog_browser_actions").insert({
          user_id: userId,
          action: "publish_to_wordpress",
          post_id: postId,
          status: "completed",
          timestamp: new Date().toISOString(),
        });

        return new Response(
          JSON.stringify({
            status: "published",
            postId,
            title: body.title,
          }),
          { headers: corsHeaders }
        );
      }

      case "get_seo_data": {
        const { data, error } = await supabase
          .from("blog_seo_monitoring")
          .select("*")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
          .limit(50);

        if (error) throw error;

        return new Response(JSON.stringify(data || []), {
          headers: corsHeaders,
        });
      }

      case "get_comments": {
        const { data, error } = await supabase
          .from("blog_comments")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) throw error;

        return new Response(JSON.stringify(data || []), {
          headers: corsHeaders,
        });
      }

      case "get_analytics": {
        const { data, error } = await supabase
          .from("blog_analytics_snapshots")
          .select("*")
          .eq("user_id", userId)
          .order("captured_at", { ascending: false })
          .limit(30);

        if (error) throw error;

        // Calculate summary statistics
        if (data && data.length > 0) {
          const totalPageviews = data.reduce(
            (sum, d) => sum + (d.total_pageviews || 0),
            0
          );
          const totalSessions = data.reduce(
            (sum, d) => sum + (d.total_sessions || 0),
            0
          );
          const totalUsers = data.reduce(
            (sum, d) => sum + (d.total_users || 0),
            0
          );
          const avgBounceRate =
            data.reduce((sum, d) => sum + (d.bounce_rate || 0), 0) / data.length;

          return new Response(
            JSON.stringify({
              snapshots: data,
              summary: {
                totalPageviews,
                totalSessions,
                totalUsers,
                avgBounceRate: Math.round(avgBounceRate * 100) / 100,
              },
            }),
            { headers: corsHeaders }
          );
        }

        return new Response(
          JSON.stringify({
            snapshots: [],
            summary: {
              totalPageviews: 0,
              totalSessions: 0,
              totalUsers: 0,
              avgBounceRate: 0,
            },
          }),
          { headers: corsHeaders }
        );
      }

      case "get_backlinks": {
        const { data, error } = await supabase
          .from("blog_backlinks")
          .select("*")
          .eq("user_id", userId)
          .order("discovered_at", { ascending: false })
          .limit(100);

        if (error) throw error;

        // Categorize backlinks
        if (data && data.length > 0) {
          const activeBacklinks = data.filter((b) => b.status === "active");
          const lostBacklinks = data.filter((b) => b.status === "lost");
          const avgDA =
            data.reduce((sum, b) => sum + (b.domain_authority || 0), 0) /
            data.length;

          return new Response(
            JSON.stringify({
              backlinks: data,
              summary: {
                totalBacklinks: data.length,
                activeBacklinks: activeBacklinks.length,
                lostBacklinks: lostBacklinks.length,
                averageDA: Math.round(avgDA * 100) / 100,
              },
            }),
            { headers: corsHeaders }
          );
        }

        return new Response(
          JSON.stringify({
            backlinks: [],
            summary: {
              totalBacklinks: 0,
              activeBacklinks: 0,
              lostBacklinks: 0,
              averageDA: 0,
            },
          }),
          { headers: corsHeaders }
        );
      }

      case "get_social_metrics": {
        const { data, error } = await supabase
          .from("blog_social_metrics")
          .select("*")
          .eq("user_id", userId)
          .order("captured_at", { ascending: false })
          .limit(50);

        if (error) throw error;

        return new Response(JSON.stringify(data || []), {
          headers: corsHeaders,
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: corsHeaders,
        });
    }
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
