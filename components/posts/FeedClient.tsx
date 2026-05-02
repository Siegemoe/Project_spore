"use client";

import { useEffect, useRef } from "react";
import { useFeed, FeedResponse } from "@/features/posts/hooks";
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

  return (
    <div className="space-y-4">
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

      {allItems.length === 0 && !isFetchingNextPage && (
        <p className="text-sm text-text-secondary">No posts yet. Follow someone or share your first post.</p>
      )}

      {allItems.map((it) => (
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
