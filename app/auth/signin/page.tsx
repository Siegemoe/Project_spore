"use client";

import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Route } from "next";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // If already authenticated, bounce to returnTo (or /u/me) immediately
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          const rt = searchParams?.get("returnTo") ?? "/u/me";
          const safePath = rt.startsWith("/") ? rt : `/${rt}`;
          router.replace(safePath as Route);
        }
      } catch {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signInWithGitHub() {
    const rt = searchParams?.get("returnTo") ?? "/";
    const safePath = rt.startsWith("/") ? rt : `/${rt}`;
    const redirectTo = `${location.origin}/auth/callback?returnTo=${encodeURIComponent(safePath)}`;

    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo
      } as any,
    } as any);
  }

  return (
    <section className="container space-y-4">
      <h1 className="hero-title">Sign in</h1>
      <p className="hero-subtitle">Use your GitHub account to sign in.</p>

      <button
        type="button"
        className="btn btn-accent disabled:opacity-60"
        onClick={signInWithGitHub}
        disabled={!isSupabaseConfigured}
      >
        Continue with GitHub
      </button>

      {!isSupabaseConfigured && (
        <p className="text-sm text-neutral-600">
          Supabase env not configured in this environment. OAuth button disabled.
        </p>
      )}
    </section>
  );
}
