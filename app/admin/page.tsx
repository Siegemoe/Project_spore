import Link from "next/link";
import { getCurrentAdmin } from "@/lib/admin/auth";
import QuickStats from "@/components/admin/QuickStats";

export const metadata = {
  title: "Admin Dashboard - Spore",
};

// Disable static generation - this page must be dynamic
export const dynamic = "force-dynamic";

// AdminFeatureCard component for consistent card styling
function AdminFeatureCard({
  href,
  icon,
  title,
  description,
  features,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
  features: string;
}) {
  return (
    <Link href={href as any} className="card p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{icon}</span>
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
      </div>
      <p className="text-sm text-text-secondary mb-3">{description}</p>
      <div className="text-xs text-text-secondary">{features}</div>
    </Link>
  );
}

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

      {/* Admin Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Content Moderation */}
        <AdminFeatureCard
          href="/admin/moderation"
          icon="⚠️"
          title="Moderation"
          description="Review reported content, manage user warnings, suspensions, and bans"
          features="• Report workflow • Bulk actions • User moderation"
        />

        {/* User Management */}
        <AdminFeatureCard
          href="/admin/users"
          icon="👥"
          title="Users"
          description="Search users, view profiles, manage accounts and permissions"
          features="• Advanced search • User details • Account actions"
        />

        {/* Security Alerts */}
        <AdminFeatureCard
          href="/admin/security"
          icon="🔒"
          title="Security"
          description="Monitor security events, block IPs, track threat scores"
          features="• Real-time alerts • IP blocking • Threat detection"
        />

        {/* Platform Health */}
        <AdminFeatureCard
          href="/admin/health"
          icon="💚"
          title="Health"
          description="Monitor active users, API performance, system components"
          features="• Active users • API metrics • Database stats"
        />

        {/* Audit Logs */}
        <AdminFeatureCard
          href="/admin/audit"
          icon="📋"
          title="Audit Logs"
          description="View all admin actions with full audit trail"
          features="• Action history • Filter by admin • Export logs"
        />

        {/* Analytics (Analyst+) */}
        {adminUser?.role && ["analyst", "moderator", "super_admin"].includes(adminUser.role) && (
          <AdminFeatureCard
            href="/admin/analytics"
            icon="📈"
            title="Analytics"
            description="Platform analytics, growth metrics, and insights"
            features="• User growth • Engagement • Trends"
          />
        )}
      </div>

      {/* Admin role info */}
      <div className="card p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <span className="text-2xl">ℹ️</span>
          <div>
            <h3 className="font-semibold text-text-primary">Your Admin Role: {(adminUser?.role ?? "unknown").replace("_", " ").toUpperCase()}</h3>
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
