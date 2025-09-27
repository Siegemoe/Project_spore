"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import type { Route } from "next";
import * as React from "react";

export interface MobileTabBarProps {
  onCreate?: () => void;
}

function HomeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M4 10.5 12 4l8 6.5V20a2 2 0 0 1-2 2h-4v-6H10v6H6a2 2 0 0 1-2-2v-9.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function BellIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M6 9a6 6 0 1 1 12 0v4l1.5 2.5c.3.5-.06 1.1-.64 1.1H5.14c-.58 0-.94-.6-.64-1.1L6 13V9Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9.5 19a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function UserIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function MobileTabBar({ onCreate }: MobileTabBarProps) {
  const pathname = usePathname() || "/";

  // Profile routes via server resolver to avoid hydration timing issues
  // All clients can link to /u/me which redirects to /u/{handle} or Sign In preserving returnTo.

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-[rgb(var(--surface))]/90 backdrop-blur">
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        <li>
          <Link
            href="/"
            className={cn(
              "flex h-12 flex-col items-center justify-center text-xs",
              isActive("/") ? "text-text-primary" : "text-text-secondary"
            )}
            aria-label="Home"
          >
            <HomeIcon className="h-6 w-6" />
            <span className={cn("mt-0.5", { "font-medium text-text-primary": isActive("/") })}>Home</span>
          </Link>
        </li>
        <li>
          <Link
            href={"/search" as Route}
            className={cn(
              "flex h-12 flex-col items-center justify-center text-xs",
              isActive("/search") ? "text-text-primary" : "text-text-secondary"
            )}
            aria-label="Search"
          >
            <SearchIcon className="h-6 w-6" />
            <span className={cn("mt-0.5", { "font-medium text-text-primary": isActive("/search") })}>Explore</span>
          </Link>
        </li>
        <li>
          <button
            type="button"
            onClick={onCreate}
            className="flex h-12 w-full flex-col items-center justify-center text-xs text-text-primary"
            aria-label="Create"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white shadow-soft">
              <PlusIcon className="h-5 w-5" />
            </span>
            <span className="sr-only">Create</span>
          </button>
        </li>
        <li>
          <Link
            href={"/notifications" as Route}
            className={cn(
              "flex h-12 flex-col items-center justify-center text-xs",
              isActive("/notifications") ? "text-text-primary" : "text-text-secondary"
            )}
            aria-label="Notifications"
          >
            <BellIcon className="h-6 w-6" />
            <span className={cn("mt-0.5", { "font-medium text-text-primary": isActive("/notifications") })}>Alerts</span>
          </Link>
        </li>
        <li>
          <Link
            href={"/u/me" as Route}
            className={cn(
              "flex h-12 flex-col items-center justify-center text-xs",
              isActive("/u/") ? "text-text-primary" : "text-text-secondary"
            )}
            aria-label="Profile"
          >
            <UserIcon className="h-6 w-6" />
            <span className="mt-0.5">Profile</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
