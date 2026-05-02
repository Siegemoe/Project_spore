"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams?.get("error");

  const message =
    error === "Configuration"
      ? "There is a problem with the server configuration."
      : error === "AccessDenied"
      ? "You do not have permission to sign in."
      : error === "Verification"
      ? "The verification token has expired or has already been used."
      : "An error occurred during authentication.";

  return (
    <section className="container py-10 space-y-4 text-center">
      <h1 className="hero-title">Authentication Error</h1>
      <p className="text-text-secondary">{message}</p>
      <Link href="/auth/signin" className="btn btn-accent">
        Try Again
      </Link>
    </section>
  );
}
