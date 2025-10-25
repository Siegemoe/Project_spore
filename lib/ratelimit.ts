/**
 * Rate limiting utilities using Upstash Redis
 * Implements tiered rate limits for different user types
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Redis client (lazy - only if env vars present)
let redis: Redis | null = null;
let rateLimiters: Record<string, Ratelimit> | null = null;

function getRedis() {
  if (!redis && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}

function getRateLimiters() {
  if (rateLimiters) return rateLimiters;
  
  const redisClient = getRedis();
  if (!redisClient) return null;

  rateLimiters = {
    // Anonymous users: 10 requests per minute
    anonymous: new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      analytics: true,
      prefix: "ratelimit:anon",
    }),

    // Authenticated users: 100 requests per minute
    authenticated: new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(100, "1 m"),
      analytics: true,
      prefix: "ratelimit:auth",
    }),

    // Premium users: 1000 requests per minute
    premium: new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(1000, "1 m"),
      analytics: true,
      prefix: "ratelimit:premium",
    }),

    // Sensitive operations (login, signup): 5 per minute
    sensitive: new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      analytics: true,
      prefix: "ratelimit:sensitive",
    }),

    // Write operations (post, comment): 20 per minute
    write: new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(20, "1 m"),
      analytics: true,
      prefix: "ratelimit:write",
    }),
  };

  return rateLimiters;
}

export type RateLimitTier = "anonymous" | "authenticated" | "premium" | "sensitive" | "write";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

/**
 * Check rate limit for an identifier
 * @param tier - Rate limit tier to apply
 * @param identifier - Unique identifier (IP, user ID, etc.)
 * @returns Rate limit result
 */
export async function checkRateLimit(
  tier: RateLimitTier,
  identifier: string
): Promise<RateLimitResult> {
  const limiters = getRateLimiters();
  
  // If Redis not configured, allow all requests (fail open for dev)
  if (!limiters) {
    return {
      success: true,
      limit: 999999,
      remaining: 999999,
      reset: Date.now() + 60000,
    };
  }

  const limiter = limiters[tier];
  const result = await limiter.limit(identifier);

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
    retryAfter: result.success ? undefined : Math.ceil((result.reset - Date.now()) / 1000),
  };
}

/**
 * Get rate limit headers for HTTP response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.reset),
  };

  if (result.retryAfter) {
    headers["Retry-After"] = String(result.retryAfter);
  }

  return headers;
}

/**
 * Create a rate limit error response
 */
export function createRateLimitError(result: RateLimitResult) {
  return {
    error: "Rate limit exceeded",
    message: `Too many requests. Please try again in ${result.retryAfter} seconds.`,
    retryAfter: result.retryAfter,
    limit: result.limit,
    reset: result.reset,
  };
}

/**
 * Check if rate limiting is enabled
 */
export function isRateLimitingEnabled(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}
