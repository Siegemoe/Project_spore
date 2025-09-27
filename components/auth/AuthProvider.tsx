"use client";

import * as React from "react";
import { supabase } from "@/lib/supabaseClient";

/**
 * Minimal auth bootstrapper:
 * - Ensures Supabase OAuth result in URL is processed ASAP (detectSessionInUrl)
 * - Keeps client session hydrated via getSession/auto-refresh
 * - Exposes a lightweight context should we need it later
 *
 * This fixes issues where navigating after OAuth re-prompts login because
 * no client code had imported supabase on the redirect landing page.
 */
type AuthContextValue = {
  initialized: boolean;
};

const AuthContext = React.createContext<AuthContextValue>({ initialized: false });

export function useAuthContext() {
  return React.useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    // Touch the client to trigger detectSessionInUrl when present
    const auth: any = (supabase as any).auth;
    const touch = auth?.getSession ? auth.getSession() : auth?.getUser?.();
    Promise.resolve(touch).finally(() => {
      if (mounted) setInitialized(true);
    });

    // Optional listener to keep UI responsive to auth changes
    const { data: sub } =
      auth?.onAuthStateChange?.(() => {
        // no-op for now; consumers can subscribe if needed
      }) ?? { data: { subscription: null } };

    return () => {
      mounted = false;
      try {
        sub?.subscription?.unsubscribe?.();
      } catch {}
    };
  }, []);

  return <AuthContext.Provider value={{ initialized }}>{children}</AuthContext.Provider>;
}
