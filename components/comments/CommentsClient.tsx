"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useComments, useCreateComment, Comment } from "@/features/comments/hooks";
import { Avatar } from "@/components/ui/Avatar";

type Props = {
  postId: string;
  initialComments?: Comment[];
};

export default function CommentsClient({ postId, initialComments }: Props) {
  const { data: session } = useSession();
  const { data: comments = [], isError, error } = useComments({
    postId,
    initialData: initialComments,
  });
  const createComment = useCreateComment();

  const [text, setText] = useState("");
  const viewerId = session?.user?.id;
  const [localError, setLocalError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    if (!viewerId) {
      setLocalError("Sign in to comment.");
      return;
    }
    setLocalError(null);
    try {
      await createComment.mutateAsync({ postId, body: text.trim() });
      setText("");
    } catch (err: any) {
      setLocalError(err?.message || "Failed to post comment.");
    }
  }

  if (isError) {
    return (
      <div className="py-4 text-sm text-red-500">
        Failed to load comments: {(error as any)?.message || "Unknown error"}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={viewerId ? "Write a comment..." : "Sign in to comment"}
          disabled={!viewerId || createComment.isPending}
          className="flex-1 rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!viewerId || !text.trim() || createComment.isPending}
          className="btn btn-accent btn-sm disabled:opacity-50"
        >
          {createComment.isPending ? "Posting..." : "Post"}
        </button>
      </form>

      {localError && (
        <p className="text-sm text-red-500">{localError}</p>
      )}

      <ul className="space-y-3">
        {comments.map((c) => (
          <li key={c.id} className="flex gap-3">
            <Avatar
              src={c.user?.avatar_url ?? undefined}
              name={c.user?.display_name || c.user?.handle || "?"}
              size="sm"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Link
                  href={`/u/${c.user?.handle}` as any}
                  className="text-sm font-medium text-text-primary hover:underline"
                >
                  @{c.user?.handle}
                </Link>
                <span className="text-xs text-text-tertiary">
                  {new Date(c.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-text-secondary">{c.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
