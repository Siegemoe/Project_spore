"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [handle, setHandle] = useState("");
  const [publishMcp, setPublishMcp] = useState(true);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<null | { type: "ok" | "err"; text: string }>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, handle: handle || undefined, publishMcp })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ type: "err", text: data?.error ?? "Something went wrong" });
      } else {
        setMsg({ type: "ok", text: "You’re on the list. We’ll be in touch." });
        setEmail("");
        setHandle("");
        setPublishMcp(true);
      }
    } catch (err: any) {
      setMsg({ type: "err", text: err?.message ?? "Network error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-10 md:grid-cols-2 items-center">
      <section className="space-y-6">
        <h1 className="hero-title">Vibe coders build in public.</h1>
        <p className="hero-subtitle">
          Spore is where devs publish MCPs, share projects, and connect. Simple, light, and fast.
        </p>

        <form onSubmit={onSubmit} className="card p-4 sm:p-6 max-w-lg">
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium" htmlFor="email">Email</label>
            <input
              id="email"
              required
              type="email"
              className="w-full rounded-md border border-neutral-200 px-3 py-2 outline-none focus:ring-2 focus:ring-[rgb(var(--accent))]"
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label className="text-sm font-medium mt-2" htmlFor="handle">Handle (optional)</label>
            <input
              id="handle"
              type="text"
              className="w-full rounded-md border border-neutral-200 px-3 py-2 outline-none focus:ring-2 focus:ring-[rgb(var(--accent))]"
              placeholder="@handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
            />

            <label className="inline-flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={publishMcp}
                onChange={(e) => setPublishMcp(e.target.checked)}
              />
              <span className="text-sm">I want to publish MCPs</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-accent mt-2 disabled:opacity-60"
            >
              {loading ? "Joining..." : "Join the waitlist"}
            </button>

            {msg && (
              <p
                className={
                  msg.type === "ok"
                    ? "text-sm text-emerald-600 mt-2"
                    : "text-sm text-red-600 mt-2"
                }
              >
                {msg.text}
              </p>
            )}
          </div>
        </form>

        <div className="flex items-center gap-2">
          <Link href={"/auth/signup" as Route} className="btn btn-outline">Sign Up</Link>
          <Link href={"/auth/signin" as Route} className="btn btn-outline">Login</Link>
        </div>
      </section>

      <section className="relative aspect-[4/3] w-full">
        {/* Placeholder mascot area; replace with public/mascot.png from Image_1 later */}
        <div className="absolute inset-0 rounded-2xl bg-neutral-100 border border-neutral-200 grid place-items-center">
          <div className="text-neutral-400 text-sm">Mascot / hero image</div>
        </div>
        {/* Example if mascot present:
        <Image src="/mascot.png" alt="Spore mascot" fill className="object-contain" priority />
        */}
      </section>
    </div>
  );
}
