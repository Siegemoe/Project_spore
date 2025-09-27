import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * GET /api/user-posts?user={userId}&limit=20&cursor={postId}
 * Returns a page of posts for a specific user (newest first).
 * Cursor is a post id; we convert it to created_at cutoff for stable paging.
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

    let cutoff: string | undefined = undefined;
    if (cursor) {
      const { data: cur, error: cErr } = await admin
        .from("posts")
        .select("created_at")
        .eq("id", cursor)
        .limit(1)
        .maybeSingle();
      if (cErr) {
        return NextResponse.json({ error: cErr.message }, { status: 500 });
      }
      cutoff = cur?.created_at as string | undefined;
    }

    let q = admin
      .from("posts")
      .select("id,user_id,caption,media_url,media_type,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (cutoff) {
      q = q.lt("created_at", cutoff);
    }

    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = data ?? [];
    const nextCursor = rows.length > 0 ? rows[rows.length - 1].id : undefined;
    return NextResponse.json({ items: rows, nextCursor }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "unknown_error" }, { status: 500 });
  }
}
