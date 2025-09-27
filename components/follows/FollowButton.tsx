"use client";

import { useState } from "react";
import { toggleFollow } from "@/features/follows/actions";

type Props = {
  followerId?: string; // optional until auth is wired
  followeeId: string;
  initialIsFollowing: boolean;
};

export default function FollowButton({ followerId, followeeId, initialIsFollowing }: Props) {
  const [busy, setBusy] = useState(false);
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const disabled = !followerId || busy;

  async function onToggle() {
    if (!followerId) return;
    try {
      setBusy(true);
      // optimistic
      setIsFollowing((v) => !v);
      const res = await toggleFollow({ followerId, followeeId });
      setIsFollowing(res.isFollowing);
    } catch (e) {
      // revert optimistic
      setIsFollowing(initialIsFollowing);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`btn ${isFollowing ? "btn-outline" : "btn-accent"} disabled:opacity-60`}
      title={!followerId ? "Sign in to follow" : undefined}
    >
      {busy ? "..." : isFollowing ? "Following" : "Follow"}
    </button>
  );
}
