"use client";

import { useEffect, useState, useTransition } from "react";
import { toggleFollow } from "@/features/follows/actions";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/Button";

type Props = {
  followerId?: string; // optional until auth is wired
  followeeId: string;
  initialIsFollowing: boolean;
};

export default function FollowButton({ followerId, followeeId, initialIsFollowing }: Props) {
  const [busy, setBusy] = useState(false);
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [viewerId, setViewerId] = useState<string | undefined>(followerId);
  const [isPending, startTransition] = useTransition();

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

  const disabled = !viewerId || busy || isPending;

  function onToggle() {
    if (!viewerId || busy) return;
    setBusy(true);
    const optimistic = !isFollowing;
    setIsFollowing(optimistic);

    startTransition(async () => {
      try {
        const res = await toggleFollow({ followeeId });
        setIsFollowing(res.isFollowing);
      } catch {
        setIsFollowing(initialIsFollowing);
      } finally {
        setBusy(false);
      }
    });
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
      {busy || isPending ? "..." : isFollowing ? "Following" : "Follow"}
    </Button>
  );
}
