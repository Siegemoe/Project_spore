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
