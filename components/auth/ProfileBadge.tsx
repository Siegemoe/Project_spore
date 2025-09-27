"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

type UserLite = {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type BadgeState = UserLite & {
  github_login: string | null;
};

export function ProfileBadge() {
  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState<BadgeState | null>(null);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await supabase.auth.getUser();
        const uid = (data as any)?.user?.id as string | undefined;
        if (!uid) {
          if (!cancelled) {
            setUser(null);
          }
          return;
        }
        const { data: row } = await (supabase as any)
          .from("users")
          .select("id, handle, display_name, avatar_url")
          .eq("id", uid)
          .maybeSingle();

        // Resolve GitHub login from git_accounts or auth metadata as fallback
        let github_login: string | null = null;
        const { data: ga } = await (supabase as any)
          .from("git_accounts")
          .select("github_login")
          .eq("user_id", uid)
          .maybeSingle();
        if (ga?.github_login) {
          github_login = String(ga.github_login);
        } else {
          const meta: any = (data as any)?.user?.user_metadata || {};
          github_login = meta?.user_name || meta?.preferred_username || meta?.username || null;
        }

        if (!cancelled) {
          setUser(
            row
              ? {
                  id: row.id as string,
                  handle: (row as any).handle ?? null,
                  display_name: (row as any).display_name ?? null,
                  avatar_url: (row as any).avatar_url ?? null,
                  github_login,
                }
              : { id: uid, handle: null, display_name: null, avatar_url: null, github_login }
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="hidden sm:flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-[rgb(var(--surface-muted))] animate-pulse" />
      </div>
    );
  }

  // Not authenticated → show Login / Sign Up
  if (!user) {
    return (
      <div className="hidden sm:flex gap-2">
        <Link href="/auth/signin">
          <Button variant="outline" size="sm">
            Login
          </Button>
        </Link>
        <Link href="/auth/signup">
          <Button variant="accent" size="sm">
            Sign Up
          </Button>
        </Link>
      </div>
    );
  }

  // Authenticated → badge with dropdown (placeholders)
  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <a
          href={
            user.github_login
              ? `https://github.com/${encodeURIComponent(user.github_login)}`
              : user.handle
              ? `/u/${encodeURIComponent(user.handle)}`
              : "/u/me"
          }
          target={user.github_login ? "_blank" : undefined}
          rel={user.github_login ? "noreferrer" : undefined}
          className="inline-flex items-center gap-2"
          aria-label={user.github_login ? `Open @${user.github_login} on GitHub` : "Open profile"}
          title={user.github_login ? `@${user.github_login}` : "Profile"}
        >
          <Avatar
            src={user.github_login ? `https://github.com/${user.github_login}.png` : user.avatar_url ?? undefined}
            name={user.display_name || user.github_login || user.handle || "@"}
            size="sm"
          />
          <span className="hidden md:inline text-sm text-text-primary max-w-[160px] truncate">
            {user.github_login ? `@${user.github_login}` : user.display_name || user.handle || "Profile"}
          </span>
        </a>

        <button
          type="button"
          className="rounded-md border border-border-subtle px-2 py-1 text-xs text-text-secondary hover:bg-[rgb(var(--surface-muted))]"
          onClick={() => setOpen((s) => !s)}
          aria-haspopup="menu"
          aria-expanded={open}
          title="Account"
        >
          •••
        </button>
      </div>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-44 rounded-md border border-border-subtle bg-[rgb(var(--surface))] shadow-soft p-1"
        >
          <Link
            role="menuitem"
            className="block w-full rounded-md px-3 py-2 text-sm text-text-primary hover:bg-[rgb(var(--surface-muted))]"
            href={"/settings" as Route}
            onClick={() => setOpen(false)}
          >
            Settings
          </Link>
          <button
            role="menuitem"
            className="w-full rounded-md px-3 py-2 text-left text-sm text-text-secondary hover:bg-[rgb(var(--surface-muted))]"
            onClick={async () => {
              setOpen(false);
              try {
                // Client sign out clears local storage; server endpoint clears SSR cookies
                await (supabase as any).auth.signOut?.();
                await fetch("/api/auth/signout", { method: "POST" });
              } finally {
                // Send user to sign-in, preserving current path for easy return
                const rt =
                  typeof window !== "undefined"
                    ? `${window.location.pathname}${window.location.search || ""}`
                    : "/";
                window.location.href = `/auth/signin?returnTo=${encodeURIComponent(rt)}`;
              }
            }}
          >
            Log Out
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default ProfileBadge;
