import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Trash2 } from "lucide-react";

interface Comment {
  id: string;
  author: string;
  email: string;
  content: string;
  post_id: string;
  created_at: string;
  status: "pending" | "approved" | "rejected";
  spam_score: number;
  sentiment: "positive" | "neutral" | "negative";
}

const mockComments: Comment[] = [
  {
    id: "1",
    author: "John Trading",
    email: "john@example.com",
    content: "Great article! Very helpful insights on portfolio rebalancing.",
    post_id: "post-1",
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    status: "pending",
    spam_score: 8,
    sentiment: "positive",
  },
  {
    id: "2",
    author: "Jane Investor",
    email: "jane@example.com",
    content: "This guide changed my entire approach to trading. Recommend!",
    post_id: "post-1",
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    status: "approved",
    spam_score: 5,
    sentiment: "positive",
  },
  {
    id: "3",
    author: "Spam Bot",
    email: "spam@example.com",
    content: "Buy crypto now!!! Limited time offer!!! Click here!!!",
    post_id: "post-2",
    created_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    status: "pending",
    spam_score: 92,
    sentiment: "neutral",
  },
];

export function CommentModerationPanel() {
  const [comments, setComments] = useState<Comment[]>(mockComments);
  const [selectedComment, setSelectedComment] = useState<string | null>(
    mockComments[0]?.id
  );

  const active = comments.find((c) => c.id === selectedComment);

  const handleApprove = (id: string) => {
    setComments(
      comments.map((c) => (c.id === id ? { ...c, status: "approved" } : c))
    );
  };

  const handleReject = (id: string) => {
    setComments(
      comments.map((c) => (c.id === id ? { ...c, status: "rejected" } : c))
    );
  };

  const handleDelete = (id: string) => {
    setComments(comments.filter((c) => c.id !== id));
  };

  const pending = comments.filter((c) => c.status === "pending");

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle className="text-base">Pending Comments</CardTitle>
          <CardDescription>{pending.length} awaiting approval</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {pending.map((comment) => (
              <button
                key={comment.id}
                onClick={() => setSelectedComment(comment.id)}
                className={`w-full text-left p-3 rounded-lg border-2 transition ${
                  selectedComment === comment.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className="text-sm font-medium truncate">{comment.author}</p>
                <p className="text-xs text-gray-600 truncate">{comment.content}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    className={`text-xs ${
                      comment.spam_score > 50
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {comment.spam_score}% spam
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Comment Details</CardTitle>
          <CardDescription>Review and moderate</CardDescription>
        </CardHeader>
        <CardContent>
          {active ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Author</p>
                <p className="font-semibold">{active.author}</p>
                <p className="text-sm text-gray-500">{active.email}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Comment</p>
                <div className="bg-gray-50 p-3 rounded-lg text-sm">
                  {active.content}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-blue-50 p-2 rounded">
                  <p className="text-gray-600">Spam Score</p>
                  <p className="font-semibold">{active.spam_score}%</p>
                </div>
                <div className="bg-purple-50 p-2 rounded">
                  <p className="text-gray-600">Sentiment</p>
                  <p className="font-semibold capitalize">{active.sentiment}</p>
                </div>
                <div className="bg-gray-100 p-2 rounded">
                  <p className="text-gray-600">Status</p>
                  <p className="font-semibold capitalize">{active.status}</p>
                </div>
              </div>

              {active.status === "pending" && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleApprove(active.id)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleReject(active.id)}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => handleDelete(active.id)}
                    variant="outline"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No comments to review</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
