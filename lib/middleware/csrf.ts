/**
 * CSRF protection middleware for API routes
 * Validates CSRF tokens and request origins
 */

import { NextRequest, NextResponse } from "next/server";
import { validateCSRF, requiresCSRFProtection } from "@/lib/csrf";
import { logSecurityEvent } from "@/features/security/actions";

/**
 * Wrap an API route handler with CSRF protection
 * 
 * @example
 * export const POST = withCSRFProtection(
 *   async (req) => {
 *     // Your handler code - CSRF already validated
 *     return NextResponse.json({ ok: true });
 *   }
 * );
 */
export function withCSRFProtection(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    // Only check CSRF for state-changing methods
    if (requiresCSRFProtection(req.method)) {
      try {
        // Get token from header or body
        let token: string | undefined;
        
        // Try to get from header first
        token = req.headers.get("x-csrf-token") || undefined;
        
        // If not in header, try to parse from body
        if (!token && req.method === "POST") {
          try {
            const body = await req.json();
            token = body.csrfToken;
            // Re-create request with original body for handler
            req = new NextRequest(req.url, {
              ...req,
              body: JSON.stringify(body),
            });
          } catch {
            // Body not JSON or already consumed - continue without token
          }
        }
        
        // Validate CSRF
        await validateCSRF(token);
      } catch (error: any) {
        // Log CSRF failure as security event
        await logSecurityEvent({
          event_type: "csrf_failure",
          severity: "high",
          details: {
            endpoint: req.nextUrl.pathname,
            method: req.method,
            error: error.message,
          },
        });
        
        return NextResponse.json(
          {
            error: "CSRF validation failed",
            message: "Invalid or missing CSRF token. Please refresh and try again.",
          },
          { status: 403 }
        );
      }
    }
    
    // CSRF validated (or not required) - proceed with handler
    return handler(req);
  };
}

/**
 * Validate CSRF for server actions
 * Call this at the start of any server action that modifies data
 */
export async function enforceCSRF(csrfToken?: string): Promise<void> {
  try {
    await validateCSRF(csrfToken);
  } catch (error: any) {
    // Log CSRF failure
    await logSecurityEvent({
      event_type: "csrf_failure",
      severity: "high",
      details: {
        error: error.message,
      },
    });
    
    throw new Error("CSRF validation failed. Please refresh and try again.");
  }
}

/**
 * Combined security middleware
 * Applies both rate limiting and CSRF protection
 */
import { withRateLimit } from "./ratelimit";
import { RateLimitTier } from "@/lib/ratelimit";

export function withSecurity(
  tier: RateLimitTier,
  handler: (req: NextRequest) => Promise<NextResponse>,
  options?: {
    getUserId?: (req: NextRequest) => Promise<string | undefined>;
    skipCSRF?: boolean;
  }
) {
  // Apply rate limiting first
  const rateLimited = withRateLimit(tier, handler, options);
  
  // Then apply CSRF if not skipped
  if (options?.skipCSRF) {
    return rateLimited;
  }
  
  return withCSRFProtection(rateLimited);
}
