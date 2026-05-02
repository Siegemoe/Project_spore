"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  MEDIA_BUCKET,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  contentTypeToExt,
} from "@/lib/config";
import { BadRequestError, SupabaseError } from "@/lib/errors";
import { requireUser } from "@/lib/auth/session";
import { FeedQuery, UploadTargetInput, CreatePostInput } from "./contract";

type ListFeedOptions = z.infer<typeof FeedQuery> & {
  viewerId?: string;
};

export async function getUploadTarget(input: z.infer<typeof UploadTargetInput>) {
  const parsed = UploadTargetInput.safeParse(input);
  if (!parsed.success) {
    throw new BadRequestError("Invalid upload target request.", {
      issues: parsed.error.issues,
    });
  }

  const payload = parsed.data;
  const { id: userId } = await requireUser();

  const isAllowed =
    (payload.mediaType === "image" &&
      (ALLOWED_IMAGE_TYPES as readonly string[]).includes(payload.contentType)) ||
    (payload.mediaType === "video" &&
      (ALLOWED_VIDEO_TYPES as readonly string[]).includes(payload.contentType));

  if (!isAllowed) {
    throw new BadRequestError("Unsupported content type for selected media type.", {
      contentType: payload.contentType,
      mediaType: payload.mediaType,
    });
  }

  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 10);
  const ext = contentTypeToExt(payload.contentType);
  const objectPath = `${userId}/${yyyy}/${mm}/${rand}.${ext}`;

  return {
    bucket: MEDIA_BUCKET,
    objectPath,
    contentType: payload.contentType,
    maxBytes: payload.size,
  };
}

export async function createPost(input: z.infer<typeof CreatePostInput>) {
  const parsed = CreatePostInput.safeParse(input);
  if (!parsed.success) {
    throw new BadRequestError("Invalid post payload.", {
      issues: parsed.error.issues,
    });
  }

  const payload = parsed.data;
  const { id: userId } = await requireUser();

  let mediaUrl: string | null = null;
  if (payload.objectPath) {
    const admin = getSupabaseAdmin();
    const pub = admin.storage.from(MEDIA_BUCKET).getPublicUrl(payload.objectPath);
    mediaUrl = pub.data.publicUrl ?? null;
  }

  await prisma.post.create({
    data: {
      userId,
      caption: payload.caption ?? null,
      mediaUrl,
      mediaType: payload.mediaType ?? null,
    },
  });

  return { ok: true };
}

export async function listFeed(input: ListFeedOptions) {
  const parsed = FeedQuery.safeParse(input);
  if (!parsed.success) {
    throw new BadRequestError("Invalid feed query.", {
      issues: parsed.error.issues,
    });
  }

  const { cursor, limit } = parsed.data;
  const viewerId = input.viewerId;

  // Resolve allowed authors from follows
  let allowedAuthors: string[] | undefined;
  if (viewerId) {
    const followees = await prisma.follow.findMany({
      where: { followerId: viewerId },
      select: { followeeId: true },
    });
    allowedAuthors = [viewerId, ...followees.map((f) => f.followeeId)];
  }

  // Cursor pagination: find the cursor post's createdAt
  let cursorDate: Date | undefined;
  if (cursor) {
    const cursorPost = await prisma.post.findUnique({
      where: { id: cursor },
      select: { createdAt: true },
    });
    if (cursorPost) {
      cursorDate = cursorPost.createdAt;
    }
  }

  const posts = await prisma.post.findMany({
    where: {
      ...(allowedAuthors ? { userId: { in: allowedAuthors } } : {}),
      ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: {
        select: { handle: true, displayName: true, avatarUrl: true },
      },
    },
  });

  const enriched = posts.map((p) => ({
    id: p.id,
    user_id: p.userId,
    caption: p.caption,
    media_url: p.mediaUrl,
    media_type: p.mediaType,
    created_at: p.createdAt.toISOString(),
    handle: p.user.handle,
    display_name: p.user.displayName,
    avatar_url: p.user.avatarUrl,
  }));

  const nextCursor = posts.length > 0 ? posts[posts.length - 1].id : undefined;
  return { items: enriched, nextCursor };
}
