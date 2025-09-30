"use client";

import { ReactNode } from "react";
import { AdminUser } from "@/lib/admin/auth";
import AdminNav from "./AdminNav";

interface AdminLayoutProps {
  children: ReactNode;
  adminUser: AdminUser;
}

export default function AdminLayout({ children, adminUser }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-[rgb(var(--bg-primary))]">
      {/* Admin indicator banner */}
      <div className="bg-yellow-500 text-black px-4 py-2 text-sm font-medium text-center">
        🔒 Admin Mode - {adminUser.role.replace("_", " ").toUpperCase()}
      </div>

      <div className="flex">
        {/* Sidebar navigation */}
        <AdminNav adminUser={adminUser} />

        {/* Main content area */}
        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
