"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/Avatar";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  requiresAuth?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Home",
    icon: "🏠",
  },
  {
    href: "/search",
    label: "Explore",
    icon: "🔍",
  },
  {
    href: "/notifications",
    label: "Notifications",
    icon: "🔔",
    requiresAuth: true,
  },
  {
    href: "/u/me",
    label: "Profile",
    icon: "👤",
    requiresAuth: true,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: "⚙️",
    requiresAuth: true,
  },
];

export default function DesktopSidebar() {
  const pathname = usePathname();
  const { user, loading } = useCurrentUser();

  // Show nothing or a skeleton while loading
  if (loading) {
    return <aside className="hidden md:flex md:flex-col fixed left-0 top-0 h-screen w-60 bg-[rgb(var(--surface-primary))] border-r border-border-subtle" />;
  }

  // Filter items based on auth state
  const visibleItems = NAV_ITEMS.filter(item => 
    !item.requiresAuth || user
  );
  return (
    <aside className="hidden md:flex md:flex-col fixed left-0 top-0 h-screen w-60 bg-[rgb(var(--surface-primary))] border-r border-border-subtle">
      {/* Logo/Brand */}
      <div className="p-6">
        <Link href="/" className="text-xl font-bold text-text-primary">
          Spore
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        <div className="space-y-1">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || 
                            (item.href !== "/" && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href as any}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-base transition-colors",
                  isActive
                    ? "bg-[rgb(var(--accent))] text-white font-medium"
                    : "text-text-primary hover:bg-[rgb(var(--surface-muted))]"
                )}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Profile at Bottom */}
      {user && (
        <div className="p-4 border-t border-border-subtle">
          <Link
            href="/u/me"
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-[rgb(var(--surface-muted))] transition-colors"
          >
            <Avatar
              src={null}
              alt={user.email || "User"}
              name={user.email || "User"}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text-primary truncate">
                {user.email}
              </div>
              <div className="text-xs text-text-secondary">
                View profile
              </div>
            </div>
          </Link>
        </div>
      )}
    </aside>
  );
}
