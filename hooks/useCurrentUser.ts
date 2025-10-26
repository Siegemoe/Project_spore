"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

/**
 * Shared hook for getting current authenticated user
 * Replaces duplicate user detection logic across components
 */
export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        const response = await supabase.auth.getUser();
        
        if (cancelled) return;
        
        const data = "data" in response ? response.data : response;
        const error = "error" in response ? response.error : null;
        
        if (error) {
          setError(error as Error);
          setUser(null);
        } else {
          setUser(data.user);
          setError(null);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err as Error);
        setUser(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadUser();

    // Listen for auth changes (only if real Supabase client)
    if ("onAuthStateChange" in supabase.auth) {
      const { data } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
        if (cancelled) return;
        setUser(session?.user ?? null);
      });

      return () => {
        cancelled = true;
        data.subscription.unsubscribe();
      };
    }

    return () => {
      cancelled = true;
    };
  }, []);

  return { user, loading, error, userId: user?.id };
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
  const { user, loading, error } = useCurrentUser();
  
  if (loading) {
    return { user: null, loading: true };
  }
  
  if (!user) {
    throw new Error("Authentication required");
  }
  
  return { user, loading: false };
}
