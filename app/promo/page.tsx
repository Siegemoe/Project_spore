"use client";

import Link from "next/link";
import type { Route } from "next";
import Image from "next/image";
import Hero from "../../Cline_Info/image.png";
import { useState } from "react";

/**
 * Promo (marketing) page — moved from old Home.
 */
export default function PromoPage() {
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
        body: JSON.stringify({ email, handle: handle || undefined, publishMcp }),
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
        <h1 className="hero-title">Build in public.</h1>
        <p className="hero-subtitle">
          Spore is reputation infrastructure for the next generation of builders. Start projects, find collaborators, and build your reputation.
        </p>

        <form onSubmit={onSubmit} className="card p-4 sm:p-6 max-w-lg">
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              required
              type="email"
              className="w-full rounded-md border border-neutral-200 px-3 py-2 outline-none focus:ring-2 focus:ring-[rgb(var(--accent))]"
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label className="text-sm font-medium mt-2" htmlFor="handle">
              Handle (optional)
            </label>
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
              <span className="text-sm">I want to be kept up to date on Project Spore.</span>
            </label>

            <button type="submit" disabled={loading} className="btn btn-accent mt-2 disabled:opacity-60">
              {loading ? "Joining..." : "Join the waitlist"}
            </button>

            {msg && (
              <p className={msg.type === "ok" ? "text-sm text-emerald-600 mt-2" : "text-sm text-red-600 mt-2"}>
                {msg.text}
              </p>
            )}
          </div>
        </form>

      </section>

      <section className="relative aspect-[1/1] w-full">
        <Image
          src={Hero}
          alt="Spore mascot"
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-contain rounded-2xl border border-neutral-200 bg-neutral-50"
          priority
        />
      </section>
    </div>
  );
}
