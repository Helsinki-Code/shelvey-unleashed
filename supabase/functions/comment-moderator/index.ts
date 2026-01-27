import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface Comment {
  id?: string;
  post_id: string;
  author: string;
  email: string;
  content: string;
  platform: string;
  created_at?: string;
}

interface ModerationResult {
  comment_id: string;
  status: "approved" | "rejected" | "flagged";
  reason?: string;
  spam_score: number;
  sentiment: "positive" | "neutral" | "negative";
  topics: string[];
}

Deno.serve(async (req) => {
  try {
    const {
      action,
      user_id,
      session_id,
      comment,
      comment_id,
      post_id,
      auto_approve_threshold,
      auto_reject_threshold,
    } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "moderate_comment") {
      return await moderateComment(
        supabase,
        user_id,
        session_id,
        comment,
        auto_approve_threshold || 20,
        auto_reject_threshold || 80
      );
    }

    if (action === "moderate_batch") {
      return await moderateBatch(
        supabase,
        user_id,
        session_id,
        comment.comments || [],
        auto_approve_threshold || 20,
        auto_reject_threshold || 80
      );
    }

    if (action === "get_pending_comments") {
      return await getPendingComments(supabase, user_id, post_id);
    }

    if (action === "approve_comment") {
      return await approveComment(supabase, user_id, comment_id);
    }

    if (action === "reject_comment") {
      return await rejectComment(
        supabase,
        user_id,
        comment_id,
        comment.reason
      );
    }

    if (action === "reply_to_comment") {
      return await replyToComment(
        supabase,
        user_id,
        session_id,
        comment_id,
        comment.reply_content
      );
    }

    if (action === "auto_respond") {
      return await autoRespond(supabase, user_id, session_id, comment_id);
    }

    return new Response(
      JSON.stringify({ error: "Unknown action", action }),
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in comment-moderator:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
});

async function moderateComment(
  supabase: any,
  userId: string,
  sessionId: string,
  comment: Comment,
  autoApproveThreshold: number,
  autoRejectThreshold: number
) {
  const startTime = Date.now();

  try {
    const result = analyzeComment(comment);

    let status = "flagged" as "approved" | "rejected" | "flagged";
    if (result.spam_score < autoApproveThreshold) {
      status = "approved";
    } else if (result.spam_score > autoRejectThreshold) {
      status = "rejected";
    }

    // Store moderation result
    const { error: dbError } = await supabase
      .from("blog_comments")
      .insert({
        user_id: userId,
        post_id: comment.post_id,
        author: comment.author,
        email: comment.email,
        content: comment.content,
        platform: comment.platform,
        status,
        moderation_result: result,
        created_at: new Date().toISOString(),
      });

    if (dbError) throw dbError;

    const duration = Date.now() - startTime;

    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "moderate_comment",
      status: "completed",
      details: {
        comment_status: status,
        spam_score: result.spam_score,
        sentiment: result.sentiment,
        duration_ms: duration,
      },
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        result: { ...result, status },
        duration_ms: duration,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "moderate_comment",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      details: { post_id: comment.post_id },
    });

    throw error;
  }
}

async function moderateBatch(
  supabase: any,
  userId: string,
  sessionId: string,
  comments: Comment[],
  autoApproveThreshold: number,
  autoRejectThreshold: number
) {
  const startTime = Date.now();
  const results: ModerationResult[] = [];

  try {
    for (const comment of comments) {
      const result = analyzeComment(comment);

      let status = "flagged" as "approved" | "rejected" | "flagged";
      if (result.spam_score < autoApproveThreshold) {
        status = "approved";
      } else if (result.spam_score > autoRejectThreshold) {
        status = "rejected";
      }

      results.push({ ...result, status });

      // Store each moderation result
      await supabase.from("blog_comments").insert({
        user_id: userId,
        post_id: comment.post_id,
        author: comment.author,
        email: comment.email,
        content: comment.content,
        platform: comment.platform,
        status,
        moderation_result: result,
        created_at: new Date().toISOString(),
      });
    }

    const duration = Date.now() - startTime;
    const approved = results.filter((r) => r.status === "approved").length;
    const rejected = results.filter((r) => r.status === "rejected").length;
    const flagged = results.filter((r) => r.status === "flagged").length;

    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "moderate_batch",
      status: "completed",
      details: {
        total_comments: comments.length,
        approved,
        rejected,
        flagged,
        duration_ms: duration,
      },
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: { total: comments.length, approved, rejected, flagged },
        duration_ms: duration,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "moderate_batch",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      details: { comments_count: comments.length },
    });

    throw error;
  }
}

async function getPendingComments(
  supabase: any,
  userId: string,
  postId?: string
) {
  try {
    let query = supabase
      .from("blog_comments")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "flagged")
      .order("created_at", { ascending: false });

    if (postId) {
      query = query.eq("post_id", postId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        comments: data || [],
        total: data?.length || 0,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error getting pending comments:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
}

async function approveComment(
  supabase: any,
  userId: string,
  commentId: string
) {
  try {
    const { data, error } = await supabase
      .from("blog_comments")
      .update({
        status: "approved",
        moderated_at: new Date().toISOString(),
        moderated_by: userId,
      })
      .eq("id", commentId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, comment: data }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error approving comment:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
}

async function rejectComment(
  supabase: any,
  userId: string,
  commentId: string,
  reason: string
) {
  try {
    const { data, error } = await supabase
      .from("blog_comments")
      .update({
        status: "rejected",
        rejection_reason: reason || "Does not meet community guidelines",
        moderated_at: new Date().toISOString(),
        moderated_by: userId,
      })
      .eq("id", commentId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, comment: data }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error rejecting comment:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
}

async function replyToComment(
  supabase: any,
  userId: string,
  sessionId: string,
  commentId: string,
  replyContent: string
) {
  const startTime = Date.now();

  try {
    // Get original comment
    const { data: originalComment } = await supabase
      .from("blog_comments")
      .select("*")
      .eq("id", commentId)
      .single();

    // Create reply
    const { data: reply, error } = await supabase
      .from("blog_comments")
      .insert({
        user_id: userId,
        post_id: originalComment.post_id,
        author: "Blog Author",
        email: "author@example.com",
        content: replyContent,
        platform: originalComment.platform,
        parent_comment_id: commentId,
        status: "approved",
        is_author_reply: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    const duration = Date.now() - startTime;

    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "reply_to_comment",
      status: "completed",
      details: {
        parent_comment_id: commentId,
        reply_id: reply.id,
        duration_ms: duration,
      },
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        reply,
        duration_ms: duration,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "reply_to_comment",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      details: { comment_id: commentId },
    });

    throw error;
  }
}

async function autoRespond(
  supabase: any,
  userId: string,
  sessionId: string,
  commentId: string
) {
  const startTime = Date.now();

  try {
    // Get the comment
    const { data: comment } = await supabase
      .from("blog_comments")
      .select("*")
      .eq("id", commentId)
      .single();

    // Generate auto-response based on sentiment/topics
    const autoResponse = generateAutoResponse(comment);

    // Reply to comment
    const { data: reply, error } = await supabase
      .from("blog_comments")
      .insert({
        user_id: userId,
        post_id: comment.post_id,
        author: "Blog Author",
        email: "author@example.com",
        content: autoResponse,
        platform: comment.platform,
        parent_comment_id: commentId,
        status: "approved",
        is_author_reply: true,
        is_auto_response: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    const duration = Date.now() - startTime;

    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "auto_respond",
      status: "completed",
      details: {
        comment_id: commentId,
        reply_id: reply.id,
        duration_ms: duration,
      },
      duration_ms: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        reply,
        duration_ms: duration,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await supabase.from("browser_automation_audit").insert({
      session_id: sessionId,
      user_id: userId,
      action: "auto_respond",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      details: { comment_id: commentId },
    });

    throw error;
  }
}

// Helper functions

function analyzeComment(comment: Comment): Omit<ModerationResult, 'status'> {
  const content = comment.content.toLowerCase();
  let spamScore = 0;

  // Check for spam keywords
  const spamKeywords = [
    "viagra",
    "casino",
    "forex",
    "crypto pump",
    "click here",
    "buy now",
    "limited offer",
    "act now",
  ];
  for (const keyword of spamKeywords) {
    if (content.includes(keyword)) spamScore += 20;
  }

  // Check for excessive links
  const linkCount = (content.match(/https?:\/\//g) || []).length;
  if (linkCount > 2) spamScore += 30;

  // Check for excessive caps
  const capsCount = (content.match(/[A-Z]/g) || []).length;
  if (capsCount / content.length > 0.3) spamScore += 15;

  // Check for repeated characters
  if (/(.)\1{4,}/.test(content)) spamScore += 10;

  // Sentiment analysis (mock)
  let sentiment: "positive" | "neutral" | "negative" = "neutral";
  const positiveWords = [
    "great",
    "excellent",
    "amazing",
    "helpful",
    "love",
    "thank",
  ];
  const negativeWords = [
    "bad",
    "terrible",
    "hate",
    "useless",
    "scam",
    "fraud",
  ];

  const positiveCount = positiveWords.filter((w) =>
    content.includes(w)
  ).length;
  const negativeCount = negativeWords.filter((w) =>
    content.includes(w)
  ).length;

  if (positiveCount > negativeCount) {
    sentiment = "positive";
  } else if (negativeCount > positiveCount) {
    sentiment = "negative";
  }

  // Extract topics (mock)
  const topics = [];
  if (content.includes("trading")) topics.push("trading");
  if (content.includes("portfolio")) topics.push("portfolio");
  if (content.includes("strategy")) topics.push("strategy");
  if (content.includes("risk")) topics.push("risk");

  return {
    comment_id: comment.id || Math.random().toString(36).substr(2, 9),
    spam_score: Math.min(100, spamScore),
    sentiment,
    topics,
  };
}

function generateAutoResponse(comment: Comment): string {
  const sentiment =
    comment.content.toLowerCase().includes("great") ||
    comment.content.toLowerCase().includes("love")
      ? "positive"
      : "neutral";

  const responses = {
    positive:
      "Thank you so much for the positive feedback! We're glad the article was helpful. If you have any other questions, feel free to ask!",
    neutral:
      "Thanks for the comment! We appreciate your engagement. Please let us know if you have any other thoughts or questions.",
  };

  return responses[sentiment as keyof typeof responses] || responses.neutral;
}
