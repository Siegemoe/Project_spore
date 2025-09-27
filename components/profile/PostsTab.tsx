"use client";

import { useEffect, useRef, useState } from "react";
import PostCard, { PostCardSkeleton } from "@/components/posts/PostCard";

type FeedItem = {
  id: string;
  user_id: string;
  caption: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
};

type Props = {
  userId: string;
  initialItems: FeedItem[];
  initialNextCursor?: string;
};

export default function PostsTab({ userId, initialItems, initialNextCursor }: Props) {
  const [items, setItems] = useState<FeedItem[]>(initialItems ?? []);
  const [cursor, setCursor] = useState<string | undefined>(initialNextCursor);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    if (!cursor || loading) return;
    try {
      setLoading(true);
      const qs = new URLSearchParams();
      qs.set("user", userId);
      qs.set("limit", "20");
      if (cursor) qs.set("cursor", cursor);
      const res = await fetch(`/api/user-posts?${qs.toString()}`);
      if (!res.ok) throw new Error("Failed to load more");
      const data = await res.json();
      setItems((prev) => [...prev, ...(data.items as FeedItem[])]);
      setCursor(data.nextCursor || undefined);
    } catch {
      // leave cursor as-is to allow retry
    } finally {
      setLoading(false);
    }
  }

  // Infinite scroll via IntersectionObserver
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            if (cursor && !loading) {
              loadMore();
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
    <div className="space-y-4">
      {items.length === 0 && (
        <p className="text-sm text-text-secondary">No posts yet.</p>
      )}

      {items.map((it) => (
        <PostCard key={it.id} {...it} />
      ))}

      {loading && (
        <div className="space-y-4">
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      )}

      <div ref={sentinelRef} aria-hidden="true" />
      <div className="flex justify-center py-4">
        <button
          type="button"
          disabled={loading || !hasMore}
          onClick={loadMore}
          className="btn btn-outline disabled:opacity-60"
        >
          {loading ? "Loading…" : hasMore ? "Load more" : "No more"}
        </button>
      </div>
    </div>
  );
}
