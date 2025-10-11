import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseUrl, supabaseAnon } from "@/lib/supabaseClient";

/**
 * Next.js Middleware
 * Ensures Supabase auth cookies are kept in sync so SSR can read the session.
 * Admin route protection is handled in app/admin/layout.tsx
 */
export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: { headers: req.headers } });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnon, {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: any) {
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
  } catch {
    // Ignore; request will continue
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
