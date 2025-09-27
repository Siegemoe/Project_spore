import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * GET /api/user-comments?user={userId}&limit=20&cursor={commentId}
 * Returns comments authored by a user (newest first) with minimal post context.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("user");
    const limit = Math.max(1, Math.min(Number(url.searchParams.get("limit") || 20), 50));
    const cursor = url.searchParams.get("cursor") || undefined;

    if (!userId) {
      return NextResponse.json({ error: "Missing user param" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    let cutoff: string | undefined;
    if (cursor) {
      const { data: cur, error: cErr } = await admin
        .from("comments")
        .select("created_at")
        .eq("id", cursor)
        .limit(1)
        .maybeSingle();
      if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
      cutoff = cur?.created_at as string | undefined;
    }

    let q = admin
      .from("comments")
      .select("id,post_id,user_id,body,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (cutoff) {
      q = q.lt("created_at", cutoff);
    }

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = data ?? [];
    const postIds = Array.from(new Set(rows.map((r: any) => r.post_id))).filter(Boolean) as string[];

    let postsById: Record<string, { id: string; user_id: string; caption: string | null }> = {};
    if (postIds.length > 0) {
      const { data: posts, error: pErr } = await admin
        .from("posts")
        .select("id,user_id,caption")
        .in("id", postIds);
      if (!pErr) {
        for (const p of posts ?? []) {
          postsById[p.id as string] = {
            id: p.id as string,
            user_id: p.user_id as string,
            caption: (p as any).caption ?? null,
          };
        }
      }
    }

    const enriched = rows.map((c: any) => ({
      ...c,
      post: postsById[c.post_id] || null,
    }));

    const nextCursor = rows.length > 0 ? rows[rows.length - 1].id : undefined;
    return NextResponse.json({ items: enriched, nextCursor }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "unknown_error" }, { status: 500 });
  }
}
