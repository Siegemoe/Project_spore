import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { isSupabaseAdminConfigured } from "@/lib/config";
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
  // Check if admin features are properly configured
  if (!isSupabaseAdminConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--bg-primary))]">
        <div className="max-w-md w-full card p-8 text-center space-y-4">
          <div className="text-4xl">🔧</div>
          <h1 className="text-2xl font-bold text-text-primary">Admin Dashboard Not Configured</h1>
          <p className="text-text-secondary">
            The admin dashboard requires additional environment variables to be set up.
          </p>
          <div className="text-left bg-[rgb(var(--surface-muted))] p-4 rounded text-sm">
            <p className="font-semibold mb-2">Required Environment Variables:</p>
            <ul className="space-y-1 text-xs text-text-secondary">
              <li>✓ NEXT_PUBLIC_SUPABASE_URL</li>
              <li>✗ SUPABASE_SERVICE_ROLE (missing)</li>
            </ul>
          </div>
          <a href="/" className="btn btn-accent">
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  // Server-side admin check with error handling
  let adminUser;
  try {
    adminUser = await getCurrentAdmin();
  } catch (error) {
    // If admin check fails but env is configured, show error
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--bg-primary))]">
        <div className="max-w-md w-full card p-8 text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-2xl font-bold text-text-primary">Admin Error</h1>
          <p className="text-text-secondary">
            Could not verify admin access. Please check your configuration.
          </p>
          <a href="/" className="btn btn-accent">
            Back to Home
          </a>
        </div>
      </div>
    );
  }
  
  if (!adminUser) {
    redirect("/auth/signin?returnTo=/admin");
  }

  return <AdminLayout adminUser={adminUser}>{children}</AdminLayout>;
}
