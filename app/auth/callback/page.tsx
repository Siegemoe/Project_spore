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
        // 1) Trigger detectSessionInUrl and confirm client session
        await supabase.auth.getSession();
        const { data } = await supabase.auth.getUser();
        const rt = sp?.get("returnTo") ?? "/u/me";

        if (!data?.user) {
          router.replace(("/auth/signin?returnTo=" + encodeURIComponent(rt)) as Route);
          return;
        }

        // 2) Sync database identity (users + git_accounts) via service-role API
        //    This ensures handle + github_login exist immediately after first OAuth login.
        let targetHandle: string | undefined;
        try {
          const res = await fetch("/api/auth/sync", { method: "POST" });
          if (res.ok) {
            const j = await res.json().catch(() => ({}));
            if (j?.handle && typeof j.handle === "string") {
              targetHandle = j.handle;
            }
          }
        } catch {
          // ignore, will fall back to /u/me
        }

        // 3) Prefer direct profile if we know handle; otherwise go to /u/me
        if (targetHandle) {
          router.replace(("/u/" + encodeURIComponent(targetHandle)) as Route);
        } else {
          const safe = rt.startsWith("/") ? (rt as Route) : ("/u/me" as Route);
          router.replace(safe);
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
