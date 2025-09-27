import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type FeedRow = {
  id: string;
  user_id: string;
  caption: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
};

/**
 * Minimal feed query (newest first). Personalization will be added in a follow-up PR.
 */
export async function feedQuery(limit: number, createdBefore?: string) {
  const admin = getSupabaseAdmin();
  let q = admin
    .from("posts")
    .select("id,user_id,caption,media_url,media_type,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (createdBefore) {
    q = q.lt("created_at", createdBefore);
  }

  const { data, error } = await q;
  if (error) {
    throw new Error(`feedQuery failed: ${error.message}`);
  }
  return (data ?? []) as FeedRow[];
}
