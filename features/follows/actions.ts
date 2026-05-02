"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { BadRequestError } from "@/lib/errors";
import { FollowToggle } from "./contract";

export async function toggleFollow(input: z.infer<typeof FollowToggle>) {
  const parsed = FollowToggle.safeParse(input);
  if (!parsed.success) {
    throw new BadRequestError("Invalid follow payload.", { issues: parsed.error.issues });
  }

  const { id: followerId } = await requireUser();
  const { followeeId } = parsed.data;

  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followeeId: { followerId, followeeId },
    },
  });

  if (existing) {
    await prisma.follow.delete({
      where: {
        followerId_followeeId: { followerId, followeeId },
      },
    });
    return { isFollowing: false };
  }

  await prisma.follow.create({
    data: {
      followerId,
      followeeId,
    },
  });

  return { isFollowing: true };
}
