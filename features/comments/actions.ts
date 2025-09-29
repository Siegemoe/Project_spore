"use server";

import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { CommentInsert } from "./contract";

const CreateInput = CommentInsert;
type CreateInput = z.infer<typeof CreateInput>;

export async function createComment(input: CreateInput) {
  const parsed = CreateInput.parse(input);
  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from("comments")
    .insert({
      post_id: parsed.postId,
      user_id: parsed.userId,
      body: parsed.body,
    })
    .select("id, post_id, user_id, body, created_at")
    .single();

  if (error) {
    throw new Error(`Create comment failed: ${error.message}`);
  }

  return { item: data };
}

export async function listComments(postId: string, limit = 50) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("comments")
    .select("id, post_id, user_id, body, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(`List comments failed: ${error.message}`);
  return data ?? [];
}
