"use client";

import * as React from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

export function ProfileBadge() {
  const { data: session, status } = useSession();
  const [open, setOpen] = React.useState(false);

  if (status === "loading") {
    return (
      <div className="hidden sm:flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-[rgb(var(--surface-muted))] animate-pulse" />
      </div>
    );
  }

  const user = session?.user;

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

  // Authenticated → badge with dropdown
  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <Link
          href={"/u/me"}
          className="inline-flex items-center gap-2"
          aria-label="Open profile"
          title="Profile"
        >
          <Avatar
            src={user.image ?? undefined}
            name={user.name || user.email || "@"}
            size="sm"
          />
          <span className="hidden md:inline text-sm text-text-primary max-w-[160px] truncate">
            {user.name || user.email || "Profile"}
          </span>
        </Link>

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
            href="/settings"
            onClick={() => setOpen(false)}
          >
            Settings
          </Link>
          <button
            role="menuitem"
            className="w-full rounded-md px-3 py-2 text-left text-sm text-text-secondary hover:bg-[rgb(var(--surface-muted))]"
            onClick={async () => {
              setOpen(false);
              await signOut({ callbackUrl: "/" });
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
