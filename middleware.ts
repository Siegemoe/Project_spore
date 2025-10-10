import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseUrl, supabaseAnon } from "@/lib/supabaseClient";

/**
 * Next.js Middleware
 * 1. Ensures Supabase auth cookies are kept in sync so SSR can read the session
 * 2. Protects /admin routes - requires admin authentication
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
    const { data: { session } } = await supabase.auth.getSession();

    // Protect admin routes
    if (req.nextUrl.pathname.startsWith("/admin")) {
      if (!session?.user) {
        // Not authenticated - redirect to signin
        const signInUrl = new URL("/auth/signin", req.url);
        signInUrl.searchParams.set("redirect", req.nextUrl.pathname);
        return NextResponse.redirect(signInUrl);
      }

      // Check if user is an admin using service role (bypasses RLS)
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE;
      if (!serviceKey) {
        throw new Error("SUPABASE_SERVICE_ROLE not configured");
      }

      const adminClient = createServerClient(supabaseUrl, serviceKey, {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      });

      const { data: adminData } = await adminClient
        .from("admins")
        .select("id, role")
        .eq("user_id", session.user.id)
        .is("revoked_at", null)
        .single();

      if (!adminData) {
        // User is not an admin - return 403
        return new NextResponse(
          JSON.stringify({
            error: "Forbidden",
            message: "Admin access required. You do not have permission to access this resource.",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // User is an admin - allow access
      // Add admin info to headers for downstream use
      res.headers.set("x-admin-id", adminData.id);
      res.headers.set("x-admin-role", adminData.role);
    }
  } catch (err) {
    // Log error but don't block request
    console.error("Middleware error:", err);
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
