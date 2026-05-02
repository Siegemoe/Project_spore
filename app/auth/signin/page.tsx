"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const returnTo = searchParams?.get("returnTo") ?? "/u/me";
  const safePath = returnTo.startsWith("/") ? returnTo : `/${returnTo}`;

  return (
    <section className="container space-y-4">
      <h1 className="hero-title">Sign in</h1>
      <p className="hero-subtitle">Use your GitHub account to sign in.</p>

      <button
        type="button"
        className="btn btn-accent"
        onClick={() => signIn("github", { callbackUrl: safePath })}
      >
        Continue with GitHub
      </button>
    </section>
  );
}
