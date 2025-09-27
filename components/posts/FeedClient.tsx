"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import PostCard, { PostCardSkeleton } from "./PostCard";

type FeedItem = {
  id: string;
  user_id: string;
  caption: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
};

type Props = {
  initialItems: FeedItem[];
  initialNextCursor?: string;
};

export default function FeedClient({ initialItems, initialNextCursor }: Props) {
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [cursor, setCursor] = useState<string | undefined>(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const [viewerId, setViewerId] = useState<string | undefined>(undefined);

  // When new posts arrive via realtime while user is browsing, stage them behind a banner
  const [staged, setStaged] = useState<FeedItem[]>([]);
  const stagedCount = staged.length;

  // detect viewer (auth) if available
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

  // Realtime prepend: stage new items to avoid content shift; user can tap "New posts"
  useEffect(() => {
    const channel = (supabase as any)
      .channel("posts-insert")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload: any) => {
          const row = payload.new as FeedItem;
          setStaged((prev) => [row, ...prev]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadMore() {
    if (!cursor || loading) return;
    try {
      setLoading(true);
      const qs = new URLSearchParams();
      qs.set("cursor", cursor);
      qs.set("limit", "20");
      if (viewerId) qs.set("viewer", viewerId);
      const res = await fetch(`/api/feed?${qs.toString()}`);
      if (!res.ok) throw new Error("Failed to load more");
      const data = await res.json();
      setItems((prev) => [...prev, ...(data.items as FeedItem[])]);
      setCursor(data.nextCursor || undefined);
    } catch {
      // minimal UI: leave cursor as-is to allow retry
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
            // auto-load when the sentinel is visible and we have a next cursor
            if (cursor && !loading) {
              loadMore();
            }
          }
        }
      },
      { rootMargin: "200px 0px 400px 0px", threshold: 0 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, loading, viewerId]);

  const hasMore = Boolean(cursor);

  return (
    <div className="space-y-4">
      {/* staged banner */}
      {stagedCount > 0 ? (
        <div className="sticky top-0 z-10">
          <button
            type="button"
            onClick={() => {
              setItems((prev) => [...staged, ...prev]);
              setStaged([]);
              // keep cursor unaffected
            }}
            className="mx-auto block w-full max-w-2xl rounded-md border border-border-subtle bg-[rgb(var(--surface))] px-3 py-2 text-sm font-medium text-text-primary shadow-soft hover:bg-[rgb(var(--surface-muted))]"
          >
            {stagedCount} new {stagedCount === 1 ? "post" : "posts"} — tap to view
          </button>
        </div>
      ) : null}

      {items.length === 0 && (
        <p className="text-sm text-text-secondary">No posts yet. Follow someone or share your first post.</p>
      )}

      {items.map((it) => (
        <PostCard key={it.id} {...it} />
      ))}

      {/* loading skeletons */}
      {loading && (
        <div className="space-y-4">
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      )}

      {/* Sentinel for infinite scroll; also keep a fallback button */}
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
