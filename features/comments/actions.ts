"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { BadRequestError } from "@/lib/errors";
import { CommentInsert } from "./contract";

const ListQuery = z.object({
  postId: z.string().uuid(),
  limit: z.number().int().min(1).max(100).default(50),
});

export async function createComment(input: z.infer<typeof CommentInsert>) {
  const parsed = CommentInsert.safeParse(input);
  if (!parsed.success) {
    throw new BadRequestError("Invalid comment payload.", { issues: parsed.error.issues });
  }

  const payload = parsed.data;
  const { id: userId } = await requireUser();

  const comment = await prisma.comment.create({
    data: {
      postId: payload.postId,
      userId,
      body: payload.body,
    },
    include: {
      user: {
        select: { handle: true, displayName: true, avatarUrl: true },
      },
    },
  });

  return {
    item: {
      id: comment.id,
      post_id: comment.postId,
      user_id: comment.userId,
      body: comment.body,
      created_at: comment.createdAt.toISOString(),
      handle: comment.user.handle,
      display_name: comment.user.displayName,
      avatar_url: comment.user.avatarUrl,
    },
  };
}

export async function listComments(postId: string, limit = 50) {
  const parsed = ListQuery.safeParse({ postId, limit });
  if (!parsed.success) {
    throw new BadRequestError("Invalid comment query.", { issues: parsed.error.issues });
  }

  const { postId: pid, limit: size } = parsed.data;

  const comments = await prisma.comment.findMany({
    where: { postId: pid },
    orderBy: { createdAt: "asc" },
    take: size,
    include: {
      user: {
        select: { handle: true, displayName: true, avatarUrl: true },
      },
    },
  });

  return comments.map((c) => ({
    id: c.id,
    post_id: c.postId,
    user_id: c.userId,
    body: c.body,
    created_at: c.createdAt.toISOString(),
    handle: c.user.handle,
    display_name: c.user.displayName,
    avatar_url: c.user.avatarUrl,
  }));
}
