"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useFollowState, useToggleFollow } from "@/features/follows/hooks";
import { Button } from "@/components/ui/Button";

type Props = {
  followerId?: string;
  followeeId: string;
  initialIsFollowing?: boolean;
};

export default function FollowButton({ followerId, followeeId, initialIsFollowing }: Props) {
  const [viewerId, setViewerId] = useState<string | undefined>(followerId);
  
  const { data: isFollowing = false } = useFollowState({
    followerId: viewerId,
    followeeId,
    initialState: initialIsFollowing,
  });
  
  const toggleFollow = useToggleFollow();

  // Detect viewer (auth) if not provided
  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      if (viewerId) return;
      try {
        const { data } = await supabase.auth.getUser();
        if (!cancelled) {
          setViewerId(data.user?.id);
        }
      } catch {
        // ignore
      }
    }
    loadUser();
    return () => {
      cancelled = true;
    };
  }, [viewerId]);

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
      {toggleFollow.isPending ? "..." : isFollowing ? "Following" : "Follow"}
    </Button>
  );
}
