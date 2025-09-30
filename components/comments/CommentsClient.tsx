"use client";

import { useEffect, useState, useTransition } from "react";
import { supabase } from "@/lib/supabaseClient";

type CommentItem = {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

type Props = {
  postId: string;
};

export default function CommentsClient({ postId }: Props) {
  const [items, setItems] = useState<CommentItem[]>([]);
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewerId, setViewerId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      try {
        const qs = new URLSearchParams();
        qs.set("postId", postId);
        const res = await fetch(`/api/comments?${qs.toString()}`);
        const data = await res.json().catch(() => null);

        if (res.ok && data?.success === true) {
          const next = (data.data?.items as CommentItem[]) ?? [];
          if (!cancelled) setItems(next);
        } else {
          throw new Error(data?.error?.message ?? "Failed to load comments.");
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? "Failed to load comments.");
      }
    }

    async function loadUser() {
      try {
        const { data } = await supabase.auth.getUser();
        if (!cancelled) setViewerId(data.user?.id);
      } catch {
        // ignore
      }
    }

    loadInitial();
    loadUser();

    const channel = (supabase as any)
      .channel(`comments-${postId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments" },
        (payload: any) => {
          const row = payload.new as CommentItem;
          if (row.post_id !== postId) return;
          setItems((prev) => {
            const tempIdx = prev.findIndex(
              (p) => p.id.startsWith("temp-") && p.user_id === row.user_id && p.body === row.body
            );
            if (tempIdx >= 0) {
              const next = prev.slice();
              next[tempIdx] = row;
              return next;
            }
            if (prev.some((p) => p.id === row.id)) return prev;
            return [...prev, row];
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [postId]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting || isPending) return;

    if (!viewerId) {
      setError("Sign in to comment.");
      return;
    }

    const body = text.trim();
    if (!body) return;

    const optimistic: CommentItem = {
      id: `temp-${Date.now()}`,
      post_id: postId,
      user_id: viewerId,
      body,
      created_at: new Date().toISOString(),
    };

    setItems((prev) => [...prev, optimistic]);
    setText("");
    setError(null);
    setIsSubmitting(true);

    startTransition(async () => {
      try {
        const res = await fetch("/api/comments", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ postId, text: body }),
        });
        const data = await res.json().catch(() => null);

        if (!res.ok || data?.success !== true) {
          throw new Error(data?.error?.message ?? "Failed to create comment.");
        }

        const inserted = (data.data?.item as CommentItem | undefined) ?? undefined;
        if (inserted) {
          setItems((prev) => {
            const idx = prev.findIndex((p) => p.id === optimistic.id);
            if (idx >= 0) {
              const next = prev.slice();
              next[idx] = inserted;
              return next;
            }
            if (prev.some((p) => p.id === inserted.id)) return prev;
            return [...prev, inserted];
          });
        }
      } catch (err: any) {
        setItems((prev) => prev.filter((p) => p.id !== optimistic.id));
        setText(body);
        setError(err?.message ?? "Could not post comment.");
      } finally {
        setIsSubmitting(false);
      }
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          type="text"
          className="flex-1 rounded-md border border-neutral-200 px-3 py-2 outline-none focus:ring-2 focus:ring-[rgb(var(--accent))]"
          placeholder={viewerId ? "Write a comment…" : "Sign in to comment"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!viewerId || isSubmitting || isPending}
          maxLength={2000}
        />
        <button
          type="submit"
          disabled={!viewerId || isSubmitting || isPending || !text.trim()}
          className="btn btn-accent disabled:opacity-60"
        >
          {isSubmitting || isPending ? "…" : "Comment"}
        </button>
      </form>

      {error ? (
        <div
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          <div className="flex items-center justify-between gap-2">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="rounded border border-red-300 bg-white/60 px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      <ul className="space-y-3">
        {items.map((c) => (
          <li key={c.id} className="card p-3 sm:p-4">
            <div className="text-sm text-neutral-500">
              {new Date(c.created_at).toLocaleString()}
              {c.id.startsWith("temp-") ? (
                <span className="ml-2 text-xs text-neutral-500">(sending…)</span>
              ) : null}
            </div>
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{c.body}</p>
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-neutral-500">No comments yet.</li>}
      </ul>
    </div>
  );
}
