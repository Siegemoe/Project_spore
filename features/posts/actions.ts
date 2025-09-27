"use server";

import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  MEDIA_BUCKET,
  MAX_UPLOAD_BYTES,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  contentTypeToExt,
} from "@/lib/config";
import { MediaType, FeedQuery } from "./contract";

/**
 * NOTE ABOUT AUTH:
 * For Phase 1 M2 we will derive userId from the authenticated session.
 * For now these actions accept a userId explicitly to keep the skeleton simple
 * and unblock UI wiring. We will replace userId params with server-side session
 * lookups before enabling posting in production.
 */

const UploadTargetInput = z.object({
  userId: z.string().uuid(),
  mediaType: MediaType,
  contentType: z.string().min(1),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

/**
 * Returns a storage object path the client can upload to.
 * Upload itself is performed client-side using the anon key.
 */
export async function getUploadTarget(input: z.infer<typeof UploadTargetInput>) {
  const parsed = UploadTargetInput.parse(input);

  const allowed =
    (parsed.mediaType === "image" && (ALLOWED_IMAGE_TYPES as readonly string[]).includes(parsed.contentType)) ||
    (parsed.mediaType === "video" && (ALLOWED_VIDEO_TYPES as readonly string[]).includes(parsed.contentType));

  if (!allowed) {
    throw new Error("Unsupported content type for selected media type");
  }

  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");

  // Minimal random segment; in final pass we may import a uuid lib.
  const rand = Math.random().toString(36).slice(2, 10);
  const ext = contentTypeToExt(parsed.contentType);
  const objectPath = `${parsed.userId}/${yyyy}/${mm}/${rand}.${ext}`;

  return {
    bucket: MEDIA_BUCKET,
    objectPath,
    contentType: parsed.contentType,
    maxBytes: MAX_UPLOAD_BYTES,
  };
}

const CreatePostInput = z.object({
  userId: z.string().uuid(),
  caption: z.string().trim().max(2000).optional(),
  objectPath: z.string().min(1).optional(),
  mediaType: MediaType.optional(),
});

/**
 * Creates a post row after the client uploaded the file to storage.
 * media_url will point to the bucket public URL if objectPath is provided.
 */
export async function createPost(input: z.infer<typeof CreatePostInput>) {
  const parsed = CreatePostInput.parse(input);

  let mediaUrl: string | null = null;
  if (parsed.objectPath) {
    const admin = getSupabaseAdmin();
    const pub = admin.storage.from(MEDIA_BUCKET).getPublicUrl(parsed.objectPath);
    mediaUrl = pub.data.publicUrl ?? null;
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("posts").insert({
    user_id: parsed.userId,
    caption: parsed.caption ?? null,
    media_url: mediaUrl,
    media_type: parsed.mediaType ?? null,
  });

  if (error) {
    throw new Error(`Failed to create post: ${error.message}`);
  }

  return { ok: true };
}

/**
 * Returns a minimal feed page. This is a placeholder skeleton to keep the
 * structure compiling; full personalization/joins will be completed in the next PR.
 */
export async function listFeed(input: z.infer<typeof FeedQuery> & { userId?: string }) {
  const parsed = FeedQuery.parse(input);

  // Placeholder: newest first, simple page without personalization.
  const admin = getSupabaseAdmin();

  // M3: personalize feed to self + followees when viewer is provided
  let allowedAuthors: string[] | null = null;
  if (input.userId) {
    const viewerId = input.userId;
    const { data: followees, error: fErr } = await admin
      .from("follows")
      .select("followee_id")
      .eq("follower_id", viewerId);

    if (fErr) {
      throw new Error(`Failed to fetch followees: ${fErr.message}`);
    }
    allowedAuthors = [viewerId, ...(followees?.map((f: any) => f.followee_id) ?? [])];
  }

  let query = admin
    .from("posts")
    .select("id,user_id,caption,media_url,media_type,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(parsed.limit);

  if (allowedAuthors && allowedAuthors.length > 0) {
    query = query.in("user_id", allowedAuthors);
  }

  if (parsed.cursor) {
    // Simple cursor by created_at cutoff; a stable (created_at,id) pair can be added later.
    const { data: cur } = await admin
      .from("posts")
      .select("created_at")
      .eq("id", parsed.cursor)
      .limit(1)
      .maybeSingle();
    if (cur?.created_at) {
      query = query.lt("created_at", cur.created_at);
    }
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch feed: ${error.message}`);
  }

  // Enrich with user display fields for better PostCard headers (no breaking change: fields are optional)
  const rows = data ?? [];
  const userIds = Array.from(new Set(rows.map((r: any) => r.user_id))).filter(Boolean) as string[];

  let usersById: Record<string, { handle: string | null; display_name: string | null; avatar_url: string | null }> = {};
  if (userIds.length > 0) {
    const { data: users, error: uErr } = await admin
      .from("users")
      .select("id, handle, display_name, avatar_url")
      .in("id", userIds);

    if (uErr) {
      // Non-fatal — return posts without user enrichment
      usersById = {};
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
