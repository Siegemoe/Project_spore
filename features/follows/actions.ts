"use server";

import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/auth/session";
import { BadRequestError, SupabaseError } from "@/lib/errors";
import { FollowToggle } from "./contract";

export async function toggleFollow(input: z.infer<typeof FollowToggle>) {
  const parsed = FollowToggle.safeParse(input);
  if (!parsed.success) {
    throw new BadRequestError("Invalid follow payload.", { issues: parsed.error.issues });
  }

  const admin = getSupabaseAdmin();
  const { id: followerId } = await requireUser();
  const { followeeId } = parsed.data;

  const { data: existing, error: selectError } = await admin
    .from("follows")
    .select("follower_id, followee_id")
    .eq("follower_id", followerId)
    .eq("followee_id", followeeId)
    .maybeSingle();

  if (selectError) {
    throw new SupabaseError(`Follow check failed: ${selectError.message}`, {
      hint: selectError.hint,
      details: selectError.details,
    });
  }

  if (existing) {
    const { error: deleteError } = await admin
      .from("follows")
      .delete()
      .eq("follower_id", followerId)
      .eq("followee_id", followeeId);

    if (deleteError) {
      throw new SupabaseError(`Unfollow failed: ${deleteError.message}`, {
        hint: deleteError.hint,
        details: deleteError.details,
      });
    }
    return { isFollowing: false };
  }

  const { error: insertError } = await admin.from("follows").insert({
    follower_id: followerId,
    followee_id: followeeId,
  });

  if (insertError) {
    throw new SupabaseError(`Follow failed: ${insertError.message}`, {
      hint: insertError.hint,
      details: insertError.details,
    });
  }

  return { isFollowing: true };
}
