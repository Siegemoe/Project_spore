"use client";

import { useEffect, useRef, useState } from "react";

type CommentItem = {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
  post?: { id: string; user_id: string; caption: string | null } | null;
};

type Props = {
  userId: string;
};

export default function CommentsTab({ userId }: Props) {
  const [items, setItems] = useState<CommentItem[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  async function loadPage(next?: string) {
    try {
      setLoading(true);
      const qs = new URLSearchParams();
      qs.set("user", userId);
      qs.set("limit", "20");
      if (next) qs.set("cursor", next);
      const res = await fetch(`/api/user-comments?${qs.toString()}`);
      if (!res.ok) throw new Error("Failed to load comments");
      const data = await res.json();
      setItems((prev) => [...prev, ...(data.items as CommentItem[])]);
      setCursor(data.nextCursor || undefined);
      setInitialLoaded(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // initial load
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            if (cursor && !loading) {
              loadPage(cursor);
            }
          }
        }
      },
      { rootMargin: "200px 0px 400px 0px", threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, loading, userId]);

  const hasMore = Boolean(cursor);

  return (
    <div className="space-y-3">
      {items.length === 0 && initialLoaded && (
        <p className="text-sm text-text-secondary">No comments yet.</p>
      )}

      {items.map((c) => (
        <div key={c.id} className="card p-3 sm:p-4 space-y-1">
          <p className="text-sm whitespace-pre-wrap">{c.body}</p>
          <div className="text-xs text-text-secondary">
            on{" "}
            {c.post ? (
              <a className="underline underline-offset-2" href={`/p/${encodeURIComponent(c.post.id)}`}>
                {c.post.caption ? truncate(c.post.caption, 60) : "post"}
              </a>
            ) : (
              <span>post</span>
            )}
            <span className="ml-2">{new Date(c.created_at).toLocaleString()}</span>
          </div>
        </div>
      ))}

      {loading && (
        <div className="space-y-3">
          <div className="card p-3 sm:p-4 h-16 animate-pulse" />
          <div className="card p-3 sm:p-4 h-16 animate-pulse" />
        </div>
      )}

      <div ref={sentinelRef} aria-hidden="true" />
      <div className="flex justify-center py-4">
        <button
          type="button"
          disabled={loading || !hasMore}
          onClick={() => loadPage(cursor)}
          className="btn btn-outline disabled:opacity-60"
        >
          {loading ? "Loading…" : hasMore ? "Load more" : "No more"}
        </button>
      </div>
    </div>
  );
}

function truncate(s: string, n: number) {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}
