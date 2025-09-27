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

export function ProfileBadge() {
  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState<UserLite | null>(null);
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

        if (!cancelled) {
          setUser(
            row
              ? {
                  id: row.id as string,
                  handle: (row as any).handle ?? null,
                  display_name: (row as any).display_name ?? null,
                  avatar_url: (row as any).avatar_url ?? null,
                }
              : { id: uid, handle: null, display_name: null, avatar_url: null }
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
      <button
        type="button"
        className="inline-flex items-center gap-2"
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar src={user.avatar_url ?? undefined} name={user.display_name || user.handle || "@"} size="sm" />
        <span className="hidden md:inline text-sm text-text-primary max-w-[160px] truncate">
          {user.display_name || user.handle || "Profile"}
        </span>
      </button>

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
            onClick={() => {
              // Placeholder until sign-out sequence is implemented
              setOpen(false);
            }}
          >
            Log Out (placeholder)
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default ProfileBadge;
