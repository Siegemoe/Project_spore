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
  // Server-side admin check with error handling
  let adminUser;
  try {
    adminUser = await getCurrentAdmin();
  } catch (error) {
    // If admin check fails (e.g., service role not configured), redirect to home
    redirect("/?error=admin_not_configured");
  }
  
  if (!adminUser) {
    redirect("/auth/signin?returnTo=/admin");
  }

  return <AdminLayout adminUser={adminUser}>{children}</AdminLayout>;
}
