"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import PostCard from "./PostCard";

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

  // Realtime prepend on INSERT
  useEffect(() => {
    // detect viewer (auth) if available
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

    const channel = (supabase as any)
      .channel("posts-insert")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload: any) => {
          const row = payload.new as FeedItem;
          setItems((prev) => [row, ...prev]);
        }
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadMore() {
    if (!cursor) return;
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
      // noop minimal UI
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {items.length === 0 && (
        <p className="text-sm text-neutral-500">No posts yet. Follow someone or share your first post.</p>
      )}
      {items.map((it) => (
        <PostCard key={it.id} {...it} />
      ))}
      <div className="flex justify-center py-4">
        <button
          type="button"
          disabled={loading || !cursor}
          onClick={loadMore}
          className="btn btn-outline disabled:opacity-60"
        >
          {loading ? "Loading…" : cursor ? "Load more" : "No more"}
        </button>
      </div>
    </div>
  );
}
