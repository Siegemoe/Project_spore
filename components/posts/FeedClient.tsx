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

  // Realtime prepend on INSERT
  useEffect(() => {
    const channel = supabase
      .channel("posts-insert")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload) => {
          const row = payload.new as FeedItem;
          setItems((prev) => [row, ...prev]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadMore() {
    if (!cursor) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/feed?cursor=${encodeURIComponent(cursor)}&limit=20`);
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
