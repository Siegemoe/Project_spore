import { getCurrentAdmin } from "@/lib/admin/auth";
import QuickStats from "@/components/admin/QuickStats";

export const metadata = {
  title: "Admin Dashboard - Spore",
};

export default async function AdminDashboardPage() {
  const adminUser = await getCurrentAdmin();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Admin Dashboard</h1>
        <p className="text-text-secondary mt-1">
          Welcome back. Here&apos;s what&apos;s happening on the platform.
        </p>
      </div>

      {/* Quick stats */}
      <QuickStats />

      {/* Recent activity / quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quick actions card */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <a
              href="/admin/moderation"
              className="block px-4 py-3 rounded-md bg-[rgb(var(--surface-muted))] hover:bg-[rgb(var(--surface-subtle))] transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-text-primary">Review Reports</span>
                <span className="text-lg">⚠️</span>
              </div>
              <p className="text-sm text-text-secondary mt-1">
                Check flagged content and user reports
              </p>
            </a>
            
            <a
              href="/admin/users"
              className="block px-4 py-3 rounded-md bg-[rgb(var(--surface-muted))] hover:bg-[rgb(var(--surface-subtle))] transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-text-primary">Manage Users</span>
                <span className="text-lg">👥</span>
              </div>
              <p className="text-sm text-text-secondary mt-1">
                Search and manage user accounts
              </p>
            </a>

            {adminUser?.role === "super_admin" && (
              <a
                href="/admin/config"
                className="block px-4 py-3 rounded-md bg-[rgb(var(--surface-muted))] hover:bg-[rgb(var(--surface-subtle))] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-text-primary">System Config</span>
                  <span className="text-lg">⚙️</span>
                </div>
                <p className="text-sm text-text-secondary mt-1">
                  Configure system settings and features
                </p>
              </a>
            )}
          </div>
        </div>

        {/* System status card */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">System Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Platform Status</span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                <span className="text-sm font-medium text-text-primary">Operational</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Database</span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                <span className="text-sm font-medium text-text-primary">Healthy</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Storage</span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                <span className="text-sm font-medium text-text-primary">Available</span>
              </span>
            </div>
            <div className="pt-4 border-t border-border-subtle">
              <a
                href="/admin/health"
                className="text-sm text-[rgb(var(--accent))] hover:underline"
              >
                View detailed health metrics →
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Admin role info */}
      <div className="card p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <span className="text-2xl">ℹ️</span>
          <div>
            <h3 className="font-semibold text-text-primary">Your Admin Role: {adminUser?.role.replace("_", " ").toUpperCase()}</h3>
            <p className="text-sm text-text-secondary mt-1">
              {adminUser?.role === "super_admin" &&
                "You have full access to all admin features and can manage other administrators."}
              {adminUser?.role === "moderator" &&
                "You can manage content, handle reports, and moderate user activity."}
              {adminUser?.role === "analyst" &&
                "You have read access to analytics, metrics, and system health data."}
              {adminUser?.role === "support" &&
                "You can assist users, manage basic user accounts, and handle support tickets."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
