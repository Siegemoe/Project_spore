"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ProfileUpdate } from "./contract";

/**
 * Update profile for the given user.
 */
const UpdateInput = ProfileUpdate.extend({
  userId: z.string().uuid(),
});
export type UpdateInput = z.infer<typeof UpdateInput>;

export async function updateProfile(input: UpdateInput) {
  const parsed = UpdateInput.parse(input);

  await prisma.user.update({
    where: { id: parsed.userId },
    data: {
      displayName: parsed.displayName ?? null,
      bio: parsed.bio ?? null,
    },
  });

  return { ok: true };
}

/**
 * Returns contribution counts for a user.
 * - posts: number of posts authored
 * - comments: number of comments authored
 * - total: posts + comments
 */
export async function getContributionCounts(userId: string) {
  const [posts, comments] = await Promise.all([
    prisma.post.count({ where: { userId } }),
    prisma.comment.count({ where: { userId } }),
  ]);

  return { posts, comments, total: posts + comments };
}
