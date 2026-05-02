"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { Route } from "next";

/**
 * Legacy callback landing — Auth.js now handles OAuth callbacks server-side.
 * This page redirects to the requested return path or /u/me.
 */
export default function AuthCallbackPage() {
  const sp = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const rt = sp?.get("returnTo") ?? "/u/me";
    const safe = rt.startsWith("/") ? rt : "/u/me";
    router.replace(safe as Route);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container py-10">
      <p className="text-sm text-text-secondary">Redirecting…</p>
    </div>
  );
}
