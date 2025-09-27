"use client";

import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export default function SignInPage() {
  async function signInWithGitHub() {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        // Return to home; UI will react to session and show appropriate chrome
        redirectTo: `${location.origin}/`,
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
