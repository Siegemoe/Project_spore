import NextAuth from "next-auth";
import authConfig from "./auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

/**
 * Next.js Middleware
 * Uses Auth.js to keep the session cookie in sync.
 * Admin route protection is handled in app/admin/layout.tsx
 */
export default auth((req) => {
  // req.auth contains the session if authenticated
  // For now, allow all requests; protected routes handle their own auth checks
  return NextResponse.next({
    request: { headers: req.headers },
  });
});

/**
 * Run on all routes except Next.js internals and static assets.
 */
export const config = {
  matcher: [
    // Skip static files and Next internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)",
  ],
};
