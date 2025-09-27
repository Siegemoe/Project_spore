"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Route } from "next";

/**
 * OAuth callback landing:
 * - Lets supabase-js parse and store the hash tokens (detectSessionInUrl:true)
 * - Redirects to returnTo or /u/me after hydration
 */
export default function AuthCallbackPage() {
  const sp = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        // Touch to trigger detectSessionInUrl; then grab current user
        await supabase.auth.getSession();
        const { data } = await supabase.auth.getUser();
        const rt = sp?.get("returnTo") ?? "/u/me";
        const safe = rt.startsWith("/") ? (rt as Route) : ("/u/me" as Route);

        if (data?.user) {
          router.replace(safe);
        } else {
          router.replace(("/auth/signin?returnTo=" + encodeURIComponent(rt)) as Route);
        }
      } catch {
        router.replace("/auth/signin" as Route);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container py-10">
      <p className="text-sm text-text-secondary">Completing sign in…</p>
    </div>
  );
}
