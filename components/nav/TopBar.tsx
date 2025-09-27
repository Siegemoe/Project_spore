"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ProfileBadge } from "@/components/auth/ProfileBadge";

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-[rgb(var(--surface))]/80 backdrop-blur">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-black" aria-hidden />
          <span className="text-lg font-semibold tracking-tight">Spore</span>
        </Link>

        <div className="flex gap-2">
          <ProfileBadge />
        </div>
      </div>
    </header>
  );
}
