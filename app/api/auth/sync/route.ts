import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/auth/sync
 * Ensures a corresponding public.users row (and git_accounts row) exists for the authenticated user.
 * Uses the service role to bypass RLS for initial creation.
 */
export async function POST() {
  try {
    const supa = getServerSupabase();
    const {
      data: { user },
    } = await supa.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const admin = getSupabaseAdmin();

    // 1) Check if user already exists
    const { data: existing, error: selErr } = await admin
      .from("users")
      .select("id, handle")
      .eq("id", user.id)
      .maybeSingle();

    if (selErr) {
      return NextResponse.json({ error: selErr.message }, { status: 500 });
    }

    // 2) Derive handle if needed
    let handle = existing?.handle as string | undefined;

    if (!handle) {
      const meta: any = user.user_metadata || {};
      const gh = meta.user_name || meta.preferred_username || meta.username || "";
      const base = (gh || `user-${user.id.slice(0, 6)}`)
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "");
      handle = base || `user-${user.id.slice(0, 6)}`;

      // Ensure uniqueness by suffixing if necessary
      const candidate = handle as string;
      const { data: hExists } = await admin
        .from("users")
        .select("id")
        .ilike("handle", candidate)
        .limit(1);
      if (hExists && hExists.length > 0) {
        handle = `${handle}-${user.id.slice(0, 4)}`;
      }
    }

    // 3) Upsert users row
    const meta: any = user.user_metadata || {};
    const { error: upErr } = await admin.from("users").upsert(
      {
        id: user.id,
        handle,
        display_name: meta.name || meta.user_name || null,
        avatar_url: meta.avatar_url || null,
        is_public: true,
      },
      { onConflict: "id" }
    );
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    // 4) Upsert git_accounts if we can read a GitHub username
    const ghLogin = meta.user_name || meta.preferred_username || meta.username || null;
    if (ghLogin) {
      const { error: ghErr } = await admin.from("git_accounts").upsert(
        {
          user_id: user.id,
          github_login: ghLogin,
        },
        { onConflict: "user_id" }
      );
      if (ghErr) {
        // Non-fatal; continue
      }
    }

    return NextResponse.json({ ok: true, handle, github_login: ghLogin }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "unknown_error" }, { status: 500 });
  }
}
