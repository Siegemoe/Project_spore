import { NextResponse } from "next/server";
import { getSupabaseAdmin, hasSupabaseAdminEnv } from "@/lib/supabaseAdmin";

/**
 * Upsert a git_accounts row for the current user.
 * Phase 1 scope: client posts minimal identity fields extracted from Supabase session.
 * Body: { userId: string, github_login: string, github_user_id: string }
 */
export async function POST(req: Request) {
  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({ error: "Server env not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const userId = String(body?.userId || "");
    const github_login = String(body?.github_login || "");
    const github_user_id = String(body?.github_user_id || "");

    if (!userId || !github_login || !github_user_id) {
      return NextResponse.json({ error: "userId, github_login and github_user_id are required" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from("git_accounts")
      .upsert(
        {
          user_id: userId,
          github_login,
          github_user_id,
        },
        { onConflict: "user_id" }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to connect GitHub" }, { status: 500 });
  }
}
