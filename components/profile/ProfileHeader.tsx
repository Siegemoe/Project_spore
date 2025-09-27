"use client";

import * as React from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import FollowButton from "@/components/follows/FollowButton";
import ConnectButton from "@/components/github/ConnectButton";

export type ProfileHeaderProps = {
  user: {
    id: string;
    handle: string | null;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
  };
  counts: { followers: number; following: number };
  viewerId?: string;
  initialIsFollowing?: boolean;
  hasGitAccount?: boolean;
};

export function ProfileHeader({
  user,
  counts,
  viewerId,
  initialIsFollowing = false,
  hasGitAccount = false
}: ProfileHeaderProps) {
  const isSelf = viewerId === user.id;

  return (
    <header className="card p-4 sm:p-6 flex items-start gap-4">
      <Avatar src={user.avatar_url || undefined} name={user.display_name || user.handle || "@"} size="lg" />

      <div className="flex-1 min-w-0">
        <h1 className="truncate text-2xl font-semibold text-text-primary">
          {user.display_name || user.handle || "Unknown"}
        </h1>
        {user.handle ? <p className="truncate text-text-secondary">@{user.handle}</p> : null}

        {user.bio ? <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-wrap">{user.bio}</p> : null}

        <div className="mt-3 flex items-center gap-4 text-sm text-text-secondary">
          <span>
            <strong className="text-text-primary">{counts.followers}</strong> followers
          </span>
          <span>
            <strong className="text-text-primary">{counts.following}</strong> following
          </span>
        </div>

        {isSelf && !hasGitAccount ? (
          <div className="mt-3">
            <ConnectButton />
          </div>
        ) : null}
      </div>

      {!isSelf ? (
        <FollowButton followerId={viewerId} followeeId={user.id} initialIsFollowing={initialIsFollowing} />
      ) : (
        <Button variant="outline" size="sm" aria-label="Edit profile" title="Edit profile" disabled>
          Edit
        </Button>
      )}
    </header>
  );
}
