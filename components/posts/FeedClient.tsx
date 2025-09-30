"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useFeed, FeedItem, FeedResponse } from "@/features/posts/hooks";
import PostCard, { PostCardSkeleton } from "./PostCard";

type Props = {
  initialPage?: FeedResponse;
  initialCursor?: string;
  viewerId?: string;
};

export default function FeedClient({ initialPage, initialCursor, viewerId }: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isError, error } = useFeed({
    initialPage,
    initialCursor,
    viewerId,
  });

  // When new posts arrive via realtime while user is browsing, stage them behind a banner
  const [staged, setStaged] = useState<FeedItem[]>([]);
  const stagedCount = staged.length;

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

  // Infinite scroll via IntersectionObserver
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }
      },
      { rootMargin: "200px 0px 400px 0px", threshold: 0 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten all pages into a single array
  const allItems = data?.pages.flatMap((page) => page.items) ?? [];
  
  // Merge staged items with fetched items
  const displayItems = stagedCount > 0 ? [...staged, ...allItems] : allItems;

  return (
    <div className="space-y-4">
      {/* staged banner */}
      {stagedCount > 0 ? (
        <div className="sticky top-0 z-10">
          <button
            type="button"
            onClick={() => {
              // Clear staged items - they're already in displayItems
              setStaged([]);
            }}
            className="mx-auto block w-full max-w-2xl rounded-md border border-border-subtle bg-[rgb(var(--surface))] px-3 py-2 text-sm font-medium text-text-primary shadow-soft hover:bg-[rgb(var(--surface-muted))]"
          >
            {stagedCount} new {stagedCount === 1 ? "post" : "posts"} — tap to refresh
          </button>
        </div>
      ) : null}

      {isError ? (
        <div role="alert" className="mx-auto w-full max-w-2xl rounded-md border border-red-300 bg-red-50 text-red-800 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm">{error?.message ?? "Failed to load feed"}</span>
            <button
              type="button"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage || !hasNextPage}
              className="rounded border border-red-300 bg-white/60 px-2 py-1 text-sm disabled:opacity-60"
            >
              Try again
            </button>
          </div>
        </div>
      ) : null}

      {displayItems.length === 0 && !isFetchingNextPage && (
        <p className="text-sm text-text-secondary">No posts yet. Follow someone or share your first post.</p>
      )}

      {displayItems.map((it) => (
        <PostCard key={it.id} {...it} />
      ))}

      {/* loading skeletons */}
      {isFetchingNextPage && (
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
          disabled={isFetchingNextPage || !hasNextPage}
          onClick={() => fetchNextPage()}
          className="btn btn-outline disabled:opacity-60"
        >
          {isFetchingNextPage ? "Loading…" : hasNextPage ? "Load more" : "No more"}
        </button>
      </div>
    </div>
  );
}
