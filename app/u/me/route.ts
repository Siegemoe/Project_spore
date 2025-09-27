import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";

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

  // 2) Resolve user's handle; fall back to home if missing
  const { data: row } = await supabase
    .from("users")
    .select("handle")
    .eq("id", user.id)
    .maybeSingle();

  const handle = row?.handle?.toString().trim();
  if (!handle) {
    // No handle found (unlikely in seeded/demo env) → go home
    return NextResponse.redirect(`${origin}/`, 302);
  }

  // 3) Redirect to the public profile page
  return NextResponse.redirect(`${origin}/u/${encodeURIComponent(handle)}`, 302);
}
