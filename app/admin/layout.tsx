import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/admin/auth";
import AdminLayout from "@/components/admin/AdminLayout";

export const metadata = {
  title: "Admin Dashboard - Spore",
  description: "Administrative control panel for Spore platform",
};

// Disable static generation - admin pages must be dynamic
export const dynamic = "force-dynamic";

export default async function AdminRootLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Server-side admin check
  const adminUser = await getCurrentAdmin();
  
  if (!adminUser) {
    redirect("/auth/signin?redirect=/admin");
  }

  return <AdminLayout adminUser={adminUser}>{children}</AdminLayout>;
}
