/**
 * Cache control utilities for optimizing response caching
 * Implements proper Cache-Control headers for different content types
 */

export type CacheStrategy = "static" | "dynamic" | "api" | "user" | "feed" | "no-cache";

/**
 * Cache control configurations
 */
const CACHE_CONFIGS: Record<CacheStrategy, string> = {
  // Static assets (images, CSS, JS) - cache for 1 year
  static: "public, max-age=31536000, immutable",
  
  // Dynamic but cacheable (public pages) - cache for 60 seconds, stale-while-revalidate for 5 minutes
  dynamic: "public, max-age=60, stale-while-revalidate=300",
  
  // API responses - cache for 30 seconds
  api: "public, max-age=30, stale-while-revalidate=60",
  
  // User-specific content - private cache for 5 minutes
  user: "private, max-age=300, must-revalidate",
  
  // Feed content - cache for 15 seconds with stale-while-revalidate
  feed: "public, max-age=15, stale-while-revalidate=60",
  
  // No cache - always fresh
  "no-cache": "no-store, no-cache, must-revalidate, max-age=0",
};

/**
 * Get cache control header for a given strategy
 */
export function getCacheHeader(strategy: CacheStrategy): string {
  return CACHE_CONFIGS[strategy];
}

/**
 * Create headers object with cache control
 */
export function getCacheHeaders(strategy: CacheStrategy, additionalHeaders?: Record<string, string>): Record<string, string> {
  return {
    "Cache-Control": getCacheHeader(strategy),
    "CDN-Cache-Control": getCacheHeader(strategy), // For Vercel CDN
    ...additionalHeaders,
  };
}

/**
 * Add cache headers to Response
 */
export function addCacheHeaders(response: Response, strategy: CacheStrategy): Response {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", getCacheHeader(strategy));
  headers.set("CDN-Cache-Control", getCacheHeader(strategy));
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Cache configuration for different routes
 */
export const ROUTE_CACHE_CONFIG = {
  // Public pages
  "/": "feed" as CacheStrategy,
  "/test": "feed" as CacheStrategy,
  "/promo": "static" as CacheStrategy,
  
  // User profiles (public but personalized)
  "/u/[handle]": "dynamic" as CacheStrategy,
  
  // Posts (public)
  "/p/[id]": "dynamic" as CacheStrategy,
  
  // API routes
  "/api/feed": "api" as CacheStrategy,
  "/api/comments": "api" as CacheStrategy,
  
  // User-specific (private)
  "/settings": "no-cache" as CacheStrategy,
  "/notifications": "user" as CacheStrategy,
  
  // Admin (never cache)
  "/admin": "no-cache" as CacheStrategy,
} as const;

/**
 * Get cache strategy for a route
 */
export function getCacheStrategyForRoute(pathname: string): CacheStrategy {
  // Check exact matches first
  if (pathname in ROUTE_CACHE_CONFIG) {
    return ROUTE_CACHE_CONFIG[pathname as keyof typeof ROUTE_CACHE_CONFIG];
  }
  
  // Check patterns
  if (pathname.startsWith("/admin")) return "no-cache";
  if (pathname.startsWith("/api")) return "api";
  if (pathname.startsWith("/u/")) return "dynamic";
  if (pathname.startsWith("/p/")) return "dynamic";
  if (pathname.startsWith("/settings")) return "no-cache";
  
  // Default to dynamic
  return "dynamic";
}

/**
 * Vercel-specific cache tags
 * Used for on-demand cache invalidation
 */
export const CACHE_TAGS = {
  FEED: "feed",
  USER_PROFILE: (handle: string) => `profile:${handle}`,
  POST: (id: string) => `post:${id}`,
  COMMENTS: (postId: string) => `comments:${postId}`,
  USER_POSTS: (userId: string) => `user-posts:${userId}`,
  USER_COMMENTS: (userId: string) => `user-comments:${userId}`,
} as const;

/**
 * Add cache tags to response
 * For Vercel's on-demand revalidation
 */
export function addCacheTags(response: Response, tags: string[]): Response {
  const headers = new Headers(response.headers);
  headers.set("Cache-Tag", tags.join(","));
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * CDN configuration recommendations
 */
export const CDN_CONFIG = {
  // Vercel Edge Network (automatic for static files)
  staticAssets: {
    cacheControl: CACHE_CONFIGS.static,
    regions: ["iad1"], // Expand to more regions as needed
  },
  
  // Supabase Storage CDN
  media: {
    domain: "aehiqptugvakjtlvuixb.supabase.co",
    cacheControl: "public, max-age=31536000", // 1 year
    transforms: {
      enabled: true,
      quality: 85,
      format: "webp", // Auto-convert to WebP
    },
  },
  
  // API responses
  api: {
    cacheControl: CACHE_CONFIGS.api,
    staleWhileRevalidate: 60,
  },
} as const;
