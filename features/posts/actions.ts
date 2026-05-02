"use server";

import { z } from "zod";
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

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("posts").insert({
    user_id: userId,
    caption: payload.caption ?? null,
    media_url: mediaUrl,
    media_type: payload.mediaType ?? null,
  });

  if (error) {
    throw new SupabaseError(`Failed to create post: ${error.message}`, {
      hint: error.hint,
      details: error.details,
    });
  }

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
  
  // Use admin client for feed queries (bypasses RLS)
  const client = getSupabaseAdmin();

  let allowedAuthors: string[] | null = null;
  if (viewerId) {
    const { data: followees, error: followError } = await client
      .from("follows")
      .select("followee_id")
      .eq("follower_id", viewerId);

    if (followError) {
      throw new SupabaseError(`Failed to fetch followees: ${followError.message}`, {
        hint: followError.hint,
        details: followError.details,
      });
    }

    allowedAuthors = [viewerId, ...(followees?.map((f: any) => f.followee_id) ?? [])];
  }

  let query = client
    .from("posts")
    .select("id,user_id,caption,media_url,media_type,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (allowedAuthors && allowedAuthors.length > 0) {
    query = query.in("user_id", allowedAuthors);
  }

  if (cursor) {
    const { data: cursorRow, error: cursorError } = await client
      .from("posts")
      .select("created_at")
      .eq("id", cursor)
      .limit(1)
      .maybeSingle();

    if (cursorError) {
      throw new SupabaseError(`Failed to resolve feed cursor: ${cursorError.message}`, {
        hint: cursorError.hint,
        details: cursorError.details,
      });
    }

    if (cursorRow?.created_at) {
      query = query.lt("created_at", cursorRow.created_at);
    }
  }

  const { data, error } = await query;
  if (error) {
    throw new SupabaseError(`Failed to fetch feed: ${error.message}`, {
      hint: error.hint,
      details: error.details,
    });
  }

  const rows = data ?? [];
  const userIds = Array.from(new Set(rows.map((r: any) => r.user_id))).filter(Boolean) as string[];

  let usersById: Record<
    string,
    { handle: string | null; display_name: string | null; avatar_url: string | null }
  > = {};

  if (userIds.length > 0) {
    const { data: users, error: usersError } = await client
      .from("users")
      .select("id, handle, display_name, avatar_url")
      .in("id", userIds);

    if (usersError) {
      // eslint-disable-next-line no-console
      console.warn("User enrichment failed", usersError);
    } else {
      for (const u of users ?? []) {
        usersById[u.id as string] = {
          handle: (u as any).handle ?? null,
          display_name: (u as any).display_name ?? null,
          avatar_url: (u as any).avatar_url ?? null,
        };
      }
    }
  }

  const enriched = rows.map((r: any) => {
    const u = usersById[r.user_id] || {};
    return {
      ...r,
      handle: u.handle ?? null,
      display_name: u.display_name ?? null,
      avatar_url: u.avatar_url ?? null,
    };
  });

  const nextCursor = rows.length > 0 ? rows[rows.length - 1].id : undefined;
  return { items: enriched, nextCursor };
}
