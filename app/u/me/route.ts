import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Server-side resolver for "current user's profile".
 * - If authenticated, fetch user handle and redirect to /u/{handle}
 * - If not authenticated, redirect to /auth/signin?returnTo=/u/me
 *
 * Using the SSR Supabase client ensures the auth cookie is read on the server,
 * eliminating hydration timing issues on mobile/slow networks.
 */
export async function GET(req: Request) {
  const supabase = getServerSupabase();

  // 1) Get authenticated user via cookies/session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = new URL(req.url);
  const origin = url.origin;

  if (!user) {
    // Not signed in → send to sign-in and return here afterward
    const returnTo = "/u/me";
    return NextResponse.redirect(
      `${origin}/auth/signin?returnTo=${encodeURIComponent(returnTo)}`,
      302
    );
  }

  // 2) Resolve user's handle; if missing, create a user row from auth metadata (first-run onboarding)
  const { data: row } = await supabase
    .from("users")
    .select("handle")
    .eq("id", user.id)
    .maybeSingle();

  let handle = row?.handle?.toString().trim() || "";

  if (!handle) {
    // Derive a handle from GitHub username or fallback to uid suffix
    const meta: any = user.user_metadata || {};
    const gh = meta.user_name || meta.preferred_username || meta.username || "";
    const base = (gh || `user-${user.id.slice(0, 6)}`).toLowerCase().replace(/[^a-z0-9_-]/g, "");
    handle = base || `user-${user.id.slice(0, 6)}`;

    // Use admin client to bypass RLS for initial creation
    const admin = getSupabaseAdmin();

    // Ensure uniqueness: if handle exists, suffix with short id
    const { data: exists } = await admin
      .from("users")
      .select("id")
      .ilike("handle", handle)
      .limit(1);
    if (exists && exists.length > 0) {
      handle = `${handle}-${user.id.slice(0, 4)}`;
    }

    await admin.from("users").upsert(
      {
        id: user.id,
        handle,
        display_name: meta.name || gh || null,
        avatar_url: meta.avatar_url || null,
        bio: null,
        is_public: true,
      },
      { onConflict: "id" }
    );

    if (gh) {
      await admin.from("git_accounts").upsert(
        {
          user_id: user.id,
          github_login: gh,
        },
        { onConflict: "user_id" }
      );
    }
  }

  // 3) Redirect to the public profile page
  return NextResponse.redirect(`${origin}/u/${encodeURIComponent(handle)}`, 302);
}
