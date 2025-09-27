"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/**
 * Connects the current Supabase-authenticated user to GitHub by upserting
 * a git_accounts row via /api/github/connect. We derive github_login and
 * github_user_id from the Supabase session identities (GitHub provider).
 */
export default function ConnectButton() {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function onConnect() {
    try {
      setBusy(true);
      setNote(null);

      // Ensure user is signed in
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        setNote("Sign in with GitHub first.");
        return;
      }

      // Try to derive GitHub identity
      // Prefer identities array (provider === 'github'), fallback to user_metadata
      const ghIdentity =
        (user.identities || []).find((i: any) => i?.provider === "github") || null;

      const github_login =
        ghIdentity?.identity_data?.user_name ||
        user.user_metadata?.user_name ||
        user.user_metadata?.preferred_username ||
        "";

      const github_user_id =
        String(ghIdentity?.identity_data?.id || user.user_metadata?.provider_id || "");

      if (!github_login || !github_user_id) {
        setNote("GitHub identity not available on this session.");
        return;
      }

      const res = await fetch("/api/github/connect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          github_login,
          github_user_id,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNote(json?.error || "Failed to connect GitHub.");
        return;
      }
      setNote("GitHub connected. Refresh to see repos.");
    } catch (e: any) {
      setNote(e?.message || "Failed to connect GitHub.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="btn btn-accent disabled:opacity-60"
        onClick={onConnect}
        disabled={busy}
      >
        {busy ? "Connecting..." : "Connect GitHub"}
      </button>
      {note && <span className="text-sm text-neutral-600">{note}</span>}
    </div>
  );
}
