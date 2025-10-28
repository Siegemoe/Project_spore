import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseUrl, supabaseAnon } from "@/lib/supabaseClient";
import type { CookieOptions } from "@supabase/ssr";

/**
 * Next.js Middleware
 * Ensures Supabase auth cookies are kept in sync so SSR can read the session.
 * Admin route protection is handled in app/admin/layout.tsx
 */
export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: { headers: req.headers } });

  // Skip Supabase auth sync if env vars not configured
  if (!supabaseUrl || !supabaseAnon) {
    return res;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnon, {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    });

    // Touch the session so helper refreshes cookies when needed
    await supabase.auth.getSession();
  } catch (err) {
    // Log middleware errors for debugging; request continues with stale cookies
    if (process.env.NODE_ENV === "development") {
      console.warn("[Middleware] Supabase session sync failed:", err instanceof Error ? err.message : "Unknown error");
    }
  }

  return res;
}

/**
 * Run on all routes except Next.js internals and static assets.
 */
export const config = {
  matcher: [
    // Skip static files and Next internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)",
  ],
};
