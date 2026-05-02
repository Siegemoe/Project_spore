"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useFollowState, useToggleFollow } from "@/features/follows/hooks";
import { Button } from "@/components/ui/Button";

type Props = {
  followerId?: string;
  followeeId: string;
  initialIsFollowing?: boolean;
};

export default function FollowButton({ followerId, followeeId, initialIsFollowing }: Props) {
  const { data: session } = useSession();
  const viewerId = followerId ?? session?.user?.id;

  const { data: isFollowing = false } = useFollowState({
    followerId: viewerId,
    followeeId,
    initialState: initialIsFollowing,
  });

  const toggleFollow = useToggleFollow();

  const disabled = !viewerId || toggleFollow.isPending;

  function onToggle() {
    if (!viewerId) return;
    toggleFollow.mutate({ followeeId });
  }

  return (
    <Button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      variant={isFollowing ? "outline" : "accent"}
      size="sm"
      title={!viewerId ? "Sign in to follow" : undefined}
    >
      {toggleFollow.isPending
        ? "..."
        : isFollowing
        ? "Following"
        : "Follow"}
    </Button>
  );
}
