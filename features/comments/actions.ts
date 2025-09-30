"use server";

import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/auth/session";
import { BadRequestError, SupabaseError } from "@/lib/errors";
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
  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from("comments")
    .insert({
      post_id: payload.postId,
      user_id: userId,
      body: payload.body,
    })
    .select("id, post_id, user_id, body, created_at")
    .single();

  if (error) {
    throw new SupabaseError(`Create comment failed: ${error.message}`, {
      hint: error.hint,
      details: error.details,
    });
  }

  return { item: data };
}

export async function listComments(postId: string, limit = 50) {
  const parsed = ListQuery.safeParse({ postId, limit });
  if (!parsed.success) {
    throw new BadRequestError("Invalid comment query.", { issues: parsed.error.issues });
  }

  const { postId: pid, limit: size } = parsed.data;
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("comments")
    .select("id, post_id, user_id, body, created_at")
    .eq("post_id", pid)
    .order("created_at", { ascending: true })
    .limit(size);

  if (error) {
    throw new SupabaseError(`List comments failed: ${error.message}`, {
      hint: error.hint,
      details: error.details,
    });
  }

  const comments = data ?? [];

  // Enrich with user data
  const userIds = Array.from(new Set(comments.map((c: any) => c.user_id))).filter(Boolean) as string[];
  
  let usersById: Record<string, { handle: string | null; display_name: string | null; avatar_url: string | null }> = {};
  
  if (userIds.length > 0) {
    const { data: users, error: usersError } = await admin
      .from("users")
      .select("id, handle, display_name, avatar_url")
      .in("id", userIds);

    if (usersError) {
      // eslint-disable-next-line no-console
      console.warn("User enrichment failed for comments", usersError);
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

  const enriched = comments.map((c: any) => {
    const u = usersById[c.user_id] || {};
    return {
      ...c,
      handle: u.handle ?? null,
      display_name: u.display_name ?? null,
      avatar_url: u.avatar_url ?? null,
    };
  });

  return enriched;
}
