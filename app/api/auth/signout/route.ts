import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";

/**
 * POST /api/auth/signout
 * Server-side sign out to clear auth cookies for SSR.
 */
export const POST = async () => {
  try {
    const supa = getServerSupabase();
    await supa.auth.signOut();
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "signout_failed" }, { status: 500 });
  }
};
