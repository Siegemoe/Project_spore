"use client";

import { useSession } from "next-auth/react";

export type CurrentUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
};

/**
 * Shared hook for getting current authenticated user
 * Wraps next-auth/react useSession for consistent API across the app
 */
export function useCurrentUser() {
  const { data: session, status } = useSession();
  const user = session?.user
    ? {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
      }
    : null;

  return {
    user,
    loading: status === "loading",
    error: null,
    userId: user?.id,
  };
}

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated() {
  const { user, loading } = useCurrentUser();
  return { isAuthenticated: Boolean(user), loading };
}

/**
 * Hook to require authentication
 * Returns user or throws error
 */
export function useRequireAuth() {
  const { user, loading } = useCurrentUser();

  if (loading) {
    return { user: null, loading: true };
  }

  if (!user) {
    throw new Error("Authentication required");
  }

  return { user, loading: false };
}
