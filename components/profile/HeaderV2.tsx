"use client";

import * as React from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import FollowButton from "@/components/follows/FollowButton";
import { Button } from "@/components/ui/Button";

export type HeaderV2Props = {
  user: {
    id: string;
    handle: string;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    created_at?: string | null;
  };
  counts: { followers: number; following: number };
  viewerId?: string;
  reposCount?: number;
};

export function HeaderV2({ user, counts, viewerId, reposCount }: HeaderV2Props) {
  const isSelf = viewerId === user.id;

  return (
    <section className="overflow-hidden rounded-2xl border border-border-subtle">
      {/* Banner (placeholder gradient; user-customizable later) */}
      <div className="relative h-24 w-full bg-gradient-to-r from-neutral-200 to-neutral-100 dark:from-neutral-800 dark:to-neutral-700">
        {/* Back button (always visible) */}
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              if (window.history.length > 1) window.history.back();
              else window.location.href = "/";
            }
          }}
          className="absolute left-3 top-3 inline-flex items-center rounded-md border border-border-subtle bg-[rgb(var(--surface))]/80 px-2 py-1 text-xs text-text-primary backdrop-blur hover:bg-[rgb(var(--surface))]"
          aria-label="Go back"
          title="Go back"
        >
          ← Back
        </button>
      </div>

      {/* Header content */}
      <div className="bg-[rgb(var(--surface))] px-4 pb-4 pt-2 sm:px-6">
        <div className="-mt-10 flex items-start gap-4">
          <div className="shrink-0">
            <Avatar src={user.avatar_url ?? undefined} name={user.display_name || user.handle || "@"} size="lg" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-xl font-semibold text-text-primary">
                    {user.display_name || user.handle}
                  </h1>
                  {/* Verification badge placeholder */}
                  <span
                    className="inline-flex h-5 items-center rounded-full border border-border-subtle px-2 text-[11px] text-text-secondary"
                    title="Verification (coming soon)"
                    aria-label="Verification badge (placeholder)"
                  >
                    ✓
                  </span>
                </div>
                <p className="truncate text-sm text-text-secondary">@{user.handle}</p>
              </div>

              <div className="flex items-center gap-2">
                {isSelf ? (
                  <Button variant="outline" size="sm" title="Edit Profile (placeholder)" aria-label="Edit Profile">
                    Edit Profile
                  </Button>
                ) : (
                  <FollowButton followerId={viewerId} followeeId={user.id} initialIsFollowing={false} />
                )}
              </div>
            </div>

            {user.bio ? (
              <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{user.bio}</p>
            ) : null}

            {/* Followers / Following quick links */}
            <div className="mt-3 flex items-center gap-4 text-sm">
              <Link
                href={`/u/${encodeURIComponent(user.handle)}/followers` as any}
                className="text-text-primary hover:opacity-80"
                aria-label="Followers"
              >
                <strong>{counts.followers}</strong> followers
              </Link>
              <Link
                href={`/u/${encodeURIComponent(user.handle)}/following` as any}
                className="text-text-primary hover:opacity-80"
                aria-label="Following"
              >
                <strong>{counts.following}</strong> following
              </Link>
              {typeof reposCount === "number" ? (
                <span className="text-text-secondary">
                  <strong className="text-text-primary">{reposCount}</strong> repos
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeaderV2;
