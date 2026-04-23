"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface CampaignComment {
  id: string;
  content: string;
  author_id: string | null;
  created_at: string;
}

interface CommentsSection {
  campaignId: string;
}

export function CommentsSection({ campaignId }: CommentsSection) {
  const [comments, setComments] = useState<CampaignComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchComments = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("comments")
        .select("id, content, author_id, created_at")
        .eq("campaign_id", campaignId)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false });

      setComments(data || []);
      setIsLoading(false);
    };

    fetchComments();
  }, [campaignId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    const supabase = createClient();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: newCommentData } = await supabase
        .from("comments")
        .insert({
          campaign_id: campaignId,
          author_id: user?.id || null,
          content: newComment,
          is_hidden: false,
        })
        .select()
        .single();

      if (newCommentData) {
        setComments((previous) => [newCommentData as CampaignComment, ...previous]);
        setNewComment("");
      }
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
      <div>
        <h3 className="text-lg font-bold">Feedback & Comments</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">Share your thoughts and support for this campaign.</p>
      </div>

      {/* Comment Form */}
      <form onSubmit={handleAddComment} className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-4">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Share your thoughts..."
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--background)] px-3 py-2 text-sm outline-none resize-none"
          rows={3}
        />
        <button
          type="submit"
          disabled={isSubmitting || !newComment.trim()}
          className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 hover:bg-[var(--brand-strong)]"
        >
          {isSubmitting ? "Posting..." : "Post Comment"}
        </button>
      </form>

      {/* Comments List */}
      {isLoading ? (
        <div className="text-center text-sm text-[var(--muted)]">Loading comments...</div>
      ) : comments.length === 0 ? (
        <p className="text-center text-sm text-[var(--muted)]">No comments yet. Be the first to comment!</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="border-b border-[var(--line)] pb-4 last:border-b-0">
              <p className="text-sm font-semibold text-[var(--muted)]">
                {comment.author_id ? "Supporter" : "Anonymous"}
              </p>
              <p className="mt-2 text-sm">{comment.content}</p>
              <p className="mt-2 text-xs text-[var(--muted)]">
                {new Date(comment.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
