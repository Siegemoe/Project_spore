"use server";

import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { FollowToggle } from "./contract";

/**
 * Toggle follow state of the current user (follower) towards followeeId.
 * NOTE: Until auth is wired, we accept followerId explicitly.
 */
const ToggleInput = FollowToggle.extend({
  followerId: z.string().uuid(),
});
export type ToggleInput = z.infer<typeof ToggleInput>;

export async function toggleFollow(input: ToggleInput) {
  const parsed = ToggleInput.parse(input);
  const admin = getSupabaseAdmin();

  // Check if already following
  const { data: existing, error: selErr } = await admin
    .from("follows")
    .select("follower_id, followee_id")
    .eq("follower_id", parsed.followerId)
    .eq("followee_id", parsed.followeeId)
    .maybeSingle();

  if (selErr) {
    throw new Error(`Follow check failed: ${selErr.message}`);
  }

  if (existing) {
    // Unfollow
    const { error } = await admin
      .from("follows")
      .delete()
      .eq("follower_id", parsed.followerId)
      .eq("followee_id", parsed.followeeId);
    if (error) throw new Error(`Unfollow failed: ${error.message}`);
    return { isFollowing: false };
  } else {
    // Follow
    const { error } = await admin.from("follows").insert({
      follower_id: parsed.followerId,
      followee_id: parsed.followeeId,
    });
    if (error) throw new Error(`Follow failed: ${error.message}`);
    return { isFollowing: true };
  }
}
