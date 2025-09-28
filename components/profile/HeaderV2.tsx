"use client";

import * as React from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import FollowButton from "@/components/follows/FollowButton";
import { Button } from "@/components/ui/Button";
import EditProfileSheet from "@/components/profile/EditProfileSheet";

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
  initialIsFollowing?: boolean;
  reposCount?: number;
  githubLogin?: string | null;
  accountAgeText?: string | undefined;
  contributionsTotal?: number | undefined;
};

export function HeaderV2({ user, counts, viewerId, initialIsFollowing, reposCount, githubLogin, accountAgeText, contributionsTotal }: HeaderV2Props) {
  const isSelf = viewerId === user.id;
  const [openEdit, setOpenEdit] = React.useState(false);

  return (
<section className="relative w-full overflow-hidden">
      {/* Banner (readable flair, mobile-first) */}
      <div
        className="relative z-0 h-52 sm:h-60 w-full overflow-hidden bg-white"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(16,185,129,0.9), rgba(5,150,105,0.95)), radial-gradient(600px 180px at -10% -20%, rgba(255,255,255,0.9), transparent 60%), radial-gradient(800px 220px at 110% -10%, rgba(255,255,255,0.7), transparent 60%)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {githubLogin ? (
          <a
            href={`https://github.com/${encodeURIComponent(githubLogin)}`}
            target="_blank"
            rel="noreferrer"
            className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-white/50 bg-white/20 px-2 py-1 text-xs text-white backdrop-blur hover:bg-white/30"
            aria-label="Open GitHub profile"
            title="Open GitHub profile"
            style={{ zIndex: 10 }}
          >
            <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
              <path
                fill="currentColor"
                d="M8 0C3.58 0 0 3.64 0 8.13c0 3.6 2.29 6.65 5.47 7.73.4.08.55-.18.55-.39 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.5-2.69-.96-.09-.23-.48-.96-.82-1.16-.28-.15-.68-.52-.01-.53.63-.01 1.08.59 1.23.84.72 1.21 1.87.87 2.33.66.07-.53.28-.87.51-1.07-1.78-.2-3.64-.9-3.64-4.01 0-.89.31-1.62.82-2.19-.08-.2-.36-1.02.08-2.12 0 0 .67-.22 2.2.84.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.06 2.2-.84 2.2-.84.44 1.1.16 1.92.08 2.12.51.57.82 1.3.82 2.19 0 3.12-1.87 3.8-3.65 4 .29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.19 0 .21.15.47.55.39A8.14 8.14 0 0 0 16 8.13C16 3.64 12.42 0 8 0Z"
              />
            </svg>
            @{githubLogin}
          </a>
        ) : null}
      </div>

      {/* Header content */}
      <div className="relative z-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-16 sm:-mt-20 grid grid-cols-[5rem,1fr] items-end gap-4 sm:gap-6">
          <div className="shrink-0">
            <Avatar src={user.avatar_url ?? undefined} name={user.display_name || user.handle || "@"} size="lg" className="h-20 w-20 sm:h-24 sm:w-24 ring-2 ring-white rounded-full" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                  <h1 className="truncate text-xl sm:text-2xl leading-tight font-semibold text-text-primary">
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
                <p className="truncate text-sm text-text-secondary">
                  @{user.handle}
                  {githubLogin ? (
                    <a
                      href={`https://github.com/${encodeURIComponent(githubLogin)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-2 inline-flex items-center gap-1 rounded-full border border-border-subtle px-2 py-0.5 text-[11px] text-text-primary hover:bg-[rgb(var(--surface-muted))]"
                      title="GitHub profile"
                      aria-label="GitHub profile"
                    >
                      <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M8 0C3.58 0 0 3.64 0 8.13c0 3.6 2.29 6.65 5.47 7.73.4.08.55-.18.55-.39 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.5-2.69-.96-.09-.23-.48-.96-.82-1.16-.28-.15-.68-.52-.01-.53.63-.01 1.08.59 1.23.84.72 1.21 1.87.87 2.33.66.07-.53.28-.87.51-1.07-1.78-.2-3.64-.9-3.64-4.01 0-.89.31-1.62.82-2.19-.08-.2-.36-1.02.08-2.12 0 0 .67-.22 2.2.84.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.06 2.2-.84 2.2-.84.44 1.1.16 1.92.08 2.12.51.57.82 1.3.82 2.19 0 3.12-1.87 3.8-3.65 4 .29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.19 0 .21.15.47.55.39A8.14 8.14 0 0 0 16 8.13C16 3.64 12.42 0 8 0Z"
                        />
                      </svg>
                      {githubLogin}
                    </a>
                  ) : null}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isSelf ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      title="Edit Profile"
                      aria-label="Edit Profile"
                      onClick={() => setOpenEdit(true)}
                    >
                      Edit Profile
                    </Button>
                    <EditProfileSheet
                      open={openEdit}
                      onOpenChange={setOpenEdit}
                      initial={{
                        display_name: user.display_name ?? null,
                        bio: user.bio ?? null,
                      }}
                    />
                  </>
                ) : (
                  <FollowButton followerId={viewerId} followeeId={user.id} initialIsFollowing={initialIsFollowing ?? false} />
                )}
              </div>
            </div>

            {user.bio ? (
              <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed line-clamp-3">{user.bio}</p>
            ) : null}

            {/* Followers / Following / Repos / Age */}
            <div className="mt-3 flex flex-wrap items-center gap-4 sm:gap-6 text-sm">
              <Link
                href={`/u/${encodeURIComponent(user.handle)}/followers` as any}
                className="text-text-primary hover:opacity-80"
                aria-label="Followers"
              >
                <strong className="font-semibold">{counts.followers}</strong> followers
              </Link>
              <Link
                href={`/u/${encodeURIComponent(user.handle)}/following` as any}
                className="text-text-primary hover:opacity-80"
                aria-label="Following"
              >
                <strong className="font-semibold">{counts.following}</strong> following
              </Link>
              {typeof reposCount === "number" ? (
                <span className="text-text-secondary">
                  <strong className="text-text-primary font-semibold">{reposCount}</strong> repos
                </span>
              ) : null}
              {typeof contributionsTotal === "number" ? (
                <span className="text-text-secondary">
                  <strong className="text-text-primary font-semibold">{contributionsTotal}</strong> contributions
                </span>
              ) : null}
              {accountAgeText ? (
                <span className="text-text-secondary">
                  <strong className="text-text-primary font-semibold">{accountAgeText}</strong> age
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
