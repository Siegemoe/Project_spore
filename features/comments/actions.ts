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

  return data ?? [];
}
