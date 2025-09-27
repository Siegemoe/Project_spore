import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * GET /api/auth/debug
 * Observability endpoint (server-only) to verify SSR sees the session and user rows exist.
 * Safe to keep in preview/prod; returns only booleans/ids and current handle.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supa = getServerSupabase();
    const {
      data: { user },
    } = await supa.auth.getUser();

    const serverUser = Boolean(user);
    const userId = user?.id ?? null;

    let handle: string | null = null;
    let githubLogin: string | null = null;

    if (userId) {
      const admin = getSupabaseAdmin();
      const { data: u } = await admin
        .from("users")
        .select("handle")
        .eq("id", userId)
        .maybeSingle();
      handle = (u?.handle as string | undefined) ?? null;

      const { data: ga } = await admin
        .from("git_accounts")
        .select("github_login")
        .eq("user_id", userId)
        .maybeSingle();
      githubLogin = (ga?.github_login as string | undefined) ?? null;
    }

    return NextResponse.json(
      { serverUser, userId, handle, githubLogin },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { serverUser: false, error: e?.message || "debug_failed" },
      { status: 200 }
    );
  }
}
