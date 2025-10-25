/**
 * Rate limiting middleware wrapper for API routes
 * Makes it easy to add rate limiting to any route handler
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  checkRateLimit, 
  getRateLimitHeaders, 
  createRateLimitError,
  RateLimitTier 
} from "@/lib/ratelimit";
import { logSecurityEvent } from "@/features/security/actions";

/**
 * Get identifier for rate limiting
 * Uses user ID if authenticated, otherwise IP address
 */
function getRateLimitIdentifier(req: NextRequest, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }
  
  // Get IP address from headers
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : 
              req.headers.get("x-real-ip") || 
              "unknown";
  
  return `ip:${ip}`;
}

/**
 * Wrap an API route handler with rate limiting
 * 
 * @example
 * export const POST = withRateLimit(
 *   "write",
 *   async (req) => {
 *     // Your handler code
 *     return NextResponse.json({ ok: true });
 *   }
 * );
 */
export function withRateLimit(
  tier: RateLimitTier,
  handler: (req: NextRequest) => Promise<NextResponse>,
  options?: {
    getUserId?: (req: NextRequest) => Promise<string | undefined>;
  }
) {
  return async (req: NextRequest) => {
    try {
      // Get user ID if authenticated
      let userId: string | undefined;
      if (options?.getUserId) {
        userId = await options.getUserId(req);
      }

      // Check rate limit
      const identifier = getRateLimitIdentifier(req, userId);
      const rateLimit = await checkRateLimit(tier, identifier);

      // If rate limit exceeded, log security event and return 429
      if (!rateLimit.success) {
        // Log rate limit violation
        await logSecurityEvent({
          event_type: "rate_limit_exceeded",
          severity: "medium",
          user_id: userId,
          details: {
            tier,
            identifier,
            limit: rateLimit.limit,
            endpoint: req.nextUrl.pathname,
          },
        });

        return NextResponse.json(
          createRateLimitError(rateLimit),
          {
            status: 429,
            headers: getRateLimitHeaders(rateLimit),
          }
        );
      }

      // Rate limit OK - call handler and add headers
      const response = await handler(req);
      
      // Add rate limit headers to response
      const headers = getRateLimitHeaders(rateLimit);
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    } catch (error: any) {
      // If rate limiting fails, allow request through (fail open)
      console.error("Rate limit check failed:", error);
      return handler(req);
    }
  };
}

/**
 * Check rate limit in server actions
 * Throws an error if rate limit is exceeded
 */
export async function enforceRateLimit(
  tier: RateLimitTier,
  userId?: string
) {
  // Get IP from Next.js headers
  const { headers } = await import("next/headers");
  const headersList = headers();
  const forwarded = headersList.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : 
            headersList.get("x-real-ip") || 
            "unknown";

  const identifier = userId ? `user:${userId}` : `ip:${ip}`;
  const rateLimit = await checkRateLimit(tier, identifier);

  if (!rateLimit.success) {
    // Log rate limit violation
    await logSecurityEvent({
      event_type: "rate_limit_exceeded",
      severity: "medium",
      user_id: userId,
      details: {
        tier,
        identifier,
        limit: rateLimit.limit,
      },
    });

    throw new Error(
      `Rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds.`
    );
  }

  return rateLimit;
}
