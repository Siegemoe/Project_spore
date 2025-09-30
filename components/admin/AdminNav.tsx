"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminUser } from "@/lib/admin/auth";
import { cn } from "@/lib/cn";

interface AdminNavProps {
  adminUser: AdminUser;
}

interface NavItem {
  href: string;
  label: string;
  icon: string;
  minRole?: "super_admin" | "moderator" | "analyst" | "support";
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: "📊",
  },
  {
    href: "/admin/moderation",
    label: "Moderation",
    icon: "⚠️",
    minRole: "moderator",
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: "👥",
    minRole: "support",
  },
  {
    href: "/admin/security",
    label: "Security",
    icon: "🔒",
    minRole: "moderator",
  },
  {
    href: "/admin/health",
    label: "Health",
    icon: "💚",
    minRole: "analyst",
  },
  {
    href: "/admin/analytics",
    label: "Analytics",
    icon: "📈",
    minRole: "analyst",
  },
  {
    href: "/admin/mcps",
    label: "MCPs",
    icon: "🔌",
    minRole: "moderator",
  },
  {
    href: "/admin/config",
    label: "Config",
    icon: "⚙️",
    minRole: "super_admin",
  },
];

const ROLE_HIERARCHY = {
  support: 1,
  analyst: 2,
  moderator: 3,
  super_admin: 4,
};

export default function AdminNav({ adminUser }: AdminNavProps) {
  const pathname = usePathname();
  const userLevel = ROLE_HIERARCHY[adminUser.role];

  // Filter nav items based on role
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.minRole) return true;
    const requiredLevel = ROLE_HIERARCHY[item.minRole];
    return userLevel >= requiredLevel;
  });

  return (
    <nav className="w-64 bg-[rgb(var(--surface-primary))] border-r border-border-subtle min-h-[calc(100vh-40px)]">
      <div className="p-4">
        {/* Back to main site */}
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-[rgb(var(--surface-muted))] text-sm text-text-secondary mb-4"
        >
          <span>←</span>
          <span>Back to Site</span>
        </Link>

        {/* Navigation items */}
        <div className="space-y-1">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href as any}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-[rgb(var(--accent))] text-white font-medium"
                    : "text-text-primary hover:bg-[rgb(var(--surface-muted))]"
                )}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* User info */}
        <div className="mt-8 pt-4 border-t border-border-subtle">
          <div className="px-3 py-2 text-xs text-text-secondary">
            <div className="font-medium text-text-primary mb-1">Admin Access</div>
            <div className="capitalize">{adminUser.role.replace("_", " ")}</div>
          </div>
        </div>
      </div>
    </nav>
  );
}
