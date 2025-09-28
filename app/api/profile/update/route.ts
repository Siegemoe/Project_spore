import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { ProfileUpdate } from "@/features/profile/contract";

/**
 * POST /api/profile/update
 * Body: { displayName?: string, bio?: string }
 * Auth: required (uses SSR cookies). Updates current user's profile.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const supa = getServerSupabase();
    const {
      data: { user },
    } = await supa.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const json = await req.json().catch(() => ({}));
    const parsed = ProfileUpdate.parse(json);

    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from("users")
      .update({
        display_name: parsed.displayName ?? null,
        bio: parsed.bio ?? null,
      })
      .eq("id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "unknown_error" }, { status: 500 });
  }
}
