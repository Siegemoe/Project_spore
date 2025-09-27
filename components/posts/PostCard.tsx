"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";

export type PostCardProps = {
  id: string;
  user_id: string;
  caption?: string | null;
  media_url?: string | null;
  media_type?: string | null;
  created_at: string; // ISO

  // Optional future-friendly fields for header (not in feed yet)
  display_name?: string | null;
  handle?: string | null;
  avatar_url?: string | null;
};

export default function PostCard({
  id,
  caption,
  media_url,
  media_type,
  created_at,
  display_name,
  handle
}: PostCardProps) {
  const when = new Date(created_at).toLocaleString();

  return (
    <article className="card max-w-2xl p-4 sm:p-6 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between text-sm text-text-secondary">
        <div className="min-w-0">
          {display_name || handle ? (
            <div className="truncate">
              <span className="font-medium text-text-primary">{display_name ?? handle}</span>
              {handle ? <span className="ml-1 text-text-secondary">@{handle}</span> : null}
            </div>
          ) : (
            <span className="text-text-secondary">Posted</span>
          )}
          <time className="block truncate" dateTime={created_at} aria-label={`Posted on ${when}`}>
            {when}
          </time>
        </div>
        <Link href={`/p/${id}`} className="underline underline-offset-2 hover:opacity-80">
          View
        </Link>
      </div>

      {/* Body */}
      <Link href={`/p/${id}`} className="block space-y-3">
        {caption && <p className="text-[15px] leading-relaxed text-text-primary">{caption}</p>}
        {media_url && media_type === "image" && (
          <div className="relative w-full overflow-hidden rounded-lg border border-border-subtle bg-[rgb(var(--surface-muted))]">
            {/* Reserve aspect ratio to avoid CLS; object-contain to preserve original */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={media_url}
              alt="post media"
              className="aspect-video w-full object-contain"
              loading="lazy"
              decoding="async"
            />
          </div>
        )}
        {media_url && media_type === "video" && (
          <div className="relative w-full overflow-hidden rounded-lg border border-border-subtle bg-black">
            <video className="aspect-video w-full" controls src={media_url} preload="metadata" />
          </div>
        )}
      </Link>

      {/* Action row (placeholders for now) */}
      <div className="flex items-center gap-4 text-sm text-text-secondary">
        <button
          type="button"
          className="hover:opacity-80"
          aria-label="Open comments"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("spore:openComments", { detail: { postId: id } }));
            }
          }}
        >
          Comment
        </button>
        <button
          type="button"
          className="hover:opacity-80"
          aria-label="Share post"
          onClick={() => {
            navigator.clipboard?.writeText(`${location.origin}/p/${id}`).catch(() => {});
          }}
        >
          Share
        </button>
      </div>
    </article>
  );
}

export function PostCardSkeleton() {
  return (
    <article className="card max-w-2xl p-4 sm:p-6 space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-4 w-28 rounded bg-[rgb(var(--surface-muted))]" />
          <div className="h-3 w-40 rounded bg-[rgb(var(--surface-muted))]" />
        </div>
        <div className="h-4 w-10 rounded bg-[rgb(var(--surface-muted))]" />
      </div>
      <div className="h-4 w-3/4 rounded bg-[rgb(var(--surface-muted))]" />
      <div className="aspect-video w-full rounded-lg border border-border-subtle bg-[rgb(var(--surface-muted))]" />
      <div className="flex items-center gap-4">
        <div className="h-4 w-16 rounded bg-[rgb(var(--surface-muted))]" />
        <div className="h-4 w-14 rounded bg-[rgb(var(--surface-muted))]" />
      </div>
    </article>
  );
}
