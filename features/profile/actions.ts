"use server";

import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { ProfileUpdate } from "./contract";

/**
 * Update profile for the given user.
 * NOTE: Until auth is wired, we accept userId explicitly.
 */
const UpdateInput = ProfileUpdate.extend({
  userId: z.string().uuid(),
});
export type UpdateInput = z.infer<typeof UpdateInput>;

export async function updateProfile(input: UpdateInput) {
  const parsed = UpdateInput.parse(input);
  const admin = getSupabaseAdmin();

  const { error } = await admin
    .from("users")
    .update({
      display_name: parsed.displayName ?? null,
      bio: parsed.bio ?? null,
    })
    .eq("id", parsed.userId);

  if (error) {
    throw new Error(`Profile update failed: ${error.message}`);
  }
  return { ok: true };
}

/**
 * Returns contribution counts for a user.
 * - posts: number of posts authored
 * - comments: number of comments authored
 * - total: posts + comments
 */
export async function getContributionCounts(userId: string) {
  const admin = getSupabaseAdmin();

  const postsRes = await admin
    .from("posts")
    .select("*", { head: true, count: "exact" })
    .eq("user_id", userId);

  const commentsRes = await admin
    .from("comments")
    .select("*", { head: true, count: "exact" })
    .eq("user_id", userId);

  const posts = (postsRes as any)?.count ?? 0;
  const comments = (commentsRes as any)?.count ?? 0;

  return { posts, comments, total: posts + comments };
}
