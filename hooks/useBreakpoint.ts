"use client";

import { useMediaQuery } from "./useMediaQuery";

/**
 * Breakpoint definitions
 * Matches Tailwind's default breakpoints
 */
export const BREAKPOINTS = {
  mobile: 0,      // 0-767px
  tablet: 768,    // 768-1023px  
  desktop: 1024,  // 1024px+
  wide: 1440,     // 1440px+
} as const;

export type Breakpoint = "mobile" | "tablet" | "desktop" | "wide";

/**
 * Hook to get current breakpoint
 * 
 * @example
 * const breakpoint = useBreakpoint();
 * if (breakpoint === 'mobile') { ... }
 */
export function useBreakpoint(): Breakpoint {
  const isWide = useMediaQuery(`(min-width: ${BREAKPOINTS.wide}px)`);
  const isDesktop = useMediaQuery(`(min-width: ${BREAKPOINTS.desktop}px)`);
  const isTablet = useMediaQuery(`(min-width: ${BREAKPOINTS.tablet}px)`);

  if (isWide) return "wide";
  if (isDesktop) return "desktop";
  if (isTablet) return "tablet";
  return "mobile";
}

/**
 * Individual breakpoint hooks for convenience
 */
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${BREAKPOINTS.tablet - 1}px)`);
}

export function useIsTablet(): boolean {
  return useMediaQuery(
    `(min-width: ${BREAKPOINTS.tablet}px) and (max-width: ${BREAKPOINTS.desktop - 1}px)`
  );
}

export function useIsDesktop(): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.desktop}px)`);
}

export function useIsWide(): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.wide}px)`);
}
