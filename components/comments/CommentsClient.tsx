"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useComments, useCreateComment, Comment } from "@/features/comments/hooks";
import { Avatar } from "@/components/ui/Avatar";

type Props = {
  postId: string;
  initialComments?: Comment[];
};

export default function CommentsClient({ postId, initialComments }: Props) {
  const { data: comments = [], isError, error } = useComments({ 
    postId, 
    initialData: initialComments 
  });
  const createComment = useCreateComment();
  
  const [text, setText] = useState("");
  const [viewerId, setViewerId] = useState<string | undefined>();
  const [localError, setLocalError] = useState<string | null>(null);

  // Detect viewer (auth) if available
  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      try {
        const { data } = await supabase.auth.getUser();
        if (!cancelled) setViewerId(data.user?.id);
      } catch {
        // ignore
      }
    }
    loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  // Realtime subscriptions for new comments
  useEffect(() => {
    const channel = (supabase as any)
      .channel(`comments-${postId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments" },
        (payload: any) => {
          const row = payload.new as Comment;
          if (row.post_id !== postId) return;
          // React Query will handle the update via refetch/invalidation
          // For now, we let the optimistic update handle it
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!viewerId) {
      setLocalError("Sign in to comment.");
      return;
    }

    const body = text.trim();
    if (!body) return;

    setLocalError(null);
    setText("");

    try {
      await createComment.mutateAsync({ postId, body });
    } catch (err: any) {
      setText(body);
      setLocalError(err?.message ?? "Could not post comment.");
    }
  }

  const displayError = localError || (isError ? error?.message : null);

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          type="text"
          className="flex-1 rounded-md border border-neutral-200 px-3 py-2 outline-none focus:ring-2 focus:ring-[rgb(var(--accent))]"
          placeholder={viewerId ? "Write a comment…" : "Sign in to comment"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!viewerId || createComment.isPending}
          maxLength={2000}
        />
        <button
          type="submit"
          disabled={!viewerId || createComment.isPending || !text.trim()}
          className="btn btn-accent disabled:opacity-60"
        >
          {createComment.isPending ? "…" : "Comment"}
        </button>
      </form>

      {displayError ? (
        <div
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          <div className="flex items-center justify-between gap-2">
            <span>{displayError}</span>
            <button
              type="button"
              onClick={() => setLocalError(null)}
              className="rounded border border-red-300 bg-white/60 px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      <ul className="space-y-3">
        {comments.map((c) => {
          const displayName = c.display_name || c.handle || "User";
          const profileHref = c.handle ? `/u/${c.handle}` : "/u/me";
          
          return (
            <li key={c.id} className="card p-3 sm:p-4">
              <div className="flex gap-3">
                <Link href={profileHref as any} className="flex-shrink-0">
                  <Avatar 
                    src={c.avatar_url} 
                    alt={displayName}
                    name={displayName}
                    size="sm"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link 
                      href={profileHref as any}
                      className="font-medium text-text-primary hover:underline"
                    >
                      {displayName}
                    </Link>
                    {c.handle && (
                      <span className="text-sm text-text-secondary">@{c.handle}</span>
                    )}
                    <span className="text-sm text-neutral-500">·</span>
                    <time className="text-sm text-neutral-500">
                      {new Date(c.created_at).toLocaleString()}
                    </time>
                    {c.id.startsWith("temp-") && (
                      <span className="text-xs text-neutral-500">(sending…)</span>
                    )}
                  </div>
                  <p className="mt-1 text-[15px] leading-relaxed whitespace-pre-wrap text-text-primary">
                    {c.body}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
        {comments.length === 0 && <li className="text-sm text-neutral-500">No comments yet.</li>}
      </ul>
    </div>
  );
}
