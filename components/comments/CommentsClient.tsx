"use client";

import { useEffect, useState } from "react";
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
  const [busy, setBusy] = useState(false);
  const [viewerId, setViewerId] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      try {
        const qs = new URLSearchParams();
        qs.set("postId", postId);
        const res = await fetch(`/api/comments?${qs.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setItems(data.items || []);
      } catch {
        // ignore
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

    const channel = supabase
      .channel(`comments-${postId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments" },
        (payload) => {
          const row = payload.new as CommentItem;
          if (row.post_id === postId) {
            setItems((prev) => [...prev, row]);
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [postId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!viewerId) return;
    const body = text.trim();
    if (!body) return;
    try {
      setBusy(true);
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ postId, userId: viewerId, text: body }),
      });
      if (res.ok) {
        setText("");
      }
    } catch {
      // ignore minimal UI
    } finally {
      setBusy(false);
    }
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
          disabled={!viewerId || busy}
          maxLength={2000}
        />
        <button type="submit" disabled={!viewerId || busy || !text.trim()} className="btn btn-accent disabled:opacity-60">
          {busy ? "…" : "Comment"}
        </button>
      </form>

      <ul className="space-y-3">
        {items.map((c) => (
          <li key={c.id} className="card p-3 sm:p-4">
            <div className="text-sm text-neutral-500">{new Date(c.created_at).toLocaleString()}</div>
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{c.body}</p>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-sm text-neutral-500">No comments yet.</li>
        )}
      </ul>
    </div>
  );
}
