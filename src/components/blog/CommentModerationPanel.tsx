import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MessageSquare, Check, X, Flag } from "lucide-react";

export const CommentModerationPanel = () => {
  const { user } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchComments();
      const interval = setInterval(fetchComments, 45000); // Refresh every 45 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchComments = async () => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) return;

      const response = await supabase.functions.invoke("blog-publishing-executor", {
        body: { action: "get_comments" },
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (response.data) {
        setComments(response.data);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-40 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const pendingComments = comments.filter((c: any) => c.status === "pending");
  const approvedComments = comments.filter((c: any) => c.status === "approved");
  const flaggedComments = comments.filter((c: any) => c.status === "flagged");

  const handleApprove = async (commentId: string) => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) return;

      await supabase.functions.invoke("blog-publishing-executor", {
        body: { action: "moderate_comment", commentId, status: "approved" },
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });
      fetchComments();
    } catch (error) {
      console.error("Error approving comment:", error);
    }
  };

  const handleReject = async (commentId: string) => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session?.access_token) return;

      await supabase.functions.invoke("blog-publishing-executor", {
        body: { action: "moderate_comment", commentId, status: "rejected" },
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });
      fetchComments();
    } catch (error) {
      console.error("Error rejecting comment:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Comment Moderation</CardTitle>
        <CardDescription>AI-powered spam detection & approval workflow</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Pending</p>
              <p className="text-2xl font-bold text-yellow-500">{pendingComments.length}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Approved</p>
              <p className="text-2xl font-bold text-green-500">{approvedComments.length}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Flagged</p>
              <p className="text-2xl font-bold text-red-500">{flaggedComments.length}</p>
            </div>
          </div>

          {/* Pending Comments */}
          {pendingComments.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-yellow-500" />
                <p className="text-sm font-medium">Pending Approval ({pendingComments.length})</p>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {pendingComments.slice(0, 10).map((comment: any) => (
                  <div key={comment.id} className="p-3 border rounded-lg bg-yellow-500/5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm">{comment.author_name}</p>
                        <p className="text-xs text-muted-foreground">{comment.post_title}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {comment.spam_score || 0}% spam
                      </Badge>
                    </div>
                    <p className="text-sm mb-2">{comment.content}</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-500 hover:bg-green-600"
                        onClick={() => handleApprove(comment.id)}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(comment.id)}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Flagged Comments */}
          {flaggedComments.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Flag className="h-4 w-4 text-red-500" />
                <p className="text-sm font-medium">Flagged for Review ({flaggedComments.length})</p>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {flaggedComments.slice(0, 5).map((comment: any) => (
                  <div key={comment.id} className="p-2 rounded border border-red-500/20 bg-red-500/5 text-sm">
                    <p className="font-medium">{comment.author_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{comment.content}</p>
                    <p className="text-xs text-red-600 mt-1">
                      Reason: {comment.flag_reason || "Spam detected"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Moderation Rules */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">Moderation Rules</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>✓ Auto-flag links & promotional content</p>
              <p>✓ Detect spam patterns & keyword stuffing</p>
              <p>✓ Filter profanity & inappropriate language</p>
              <p>✓ Block known spam domains</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
