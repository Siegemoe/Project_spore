import { getCurrentAdmin } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import { 
  listSecurityEvents, 
  getSecurityStats, 
  getHighRiskAlerts,
  listBlockedIPs 
} from "@/features/security/actions";
import SecurityDashboard from "@/components/admin/SecurityDashboard";

export const metadata = {
  title: "Security Alerts - Admin",
};

export const dynamic = "force-dynamic";

export default async function SecurityPage({
  searchParams,
}: {
  searchParams: {
    severity?: string;
    type?: string;
    resolved?: string;
    page?: string;
  };
}) {
  const adminUser = await getCurrentAdmin();
  
  if (!adminUser) {
    redirect("/auth/signin?returnTo=/admin/security");
  }

  // Check if user has moderator role or higher
  const hasModeratorAccess = ["moderator", "super_admin"].includes(adminUser.role);
  
  if (!hasModeratorAccess) {
    redirect("/admin");
  }

  // Parse search params
  const severity = searchParams.severity as any;
  const event_type = searchParams.type as any;
  const resolved = searchParams.resolved === "true" ? true : searchParams.resolved === "false" ? false : undefined;
  const page = parseInt(searchParams.page || "1");
  const limit = 25;
  const offset = (page - 1) * limit;

  // Fetch security data
  const [eventsData, stats, highRiskAlerts, blockedIPs] = await Promise.all([
    listSecurityEvents({ severity, event_type, resolved, limit, offset }),
    getSecurityStats(7),
    getHighRiskAlerts(10),
    listBlockedIPs(true),
  ]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Security Alerts</h1>
        <p className="text-text-secondary mt-1">
          Monitor and respond to security threats
        </p>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-6">
          <div className="text-sm text-text-secondary mb-1">Total Events (7d)</div>
          <div className="text-3xl font-bold text-text-primary">
            {stats.total_events || 0}
          </div>
        </div>
        
        <div className="card p-6">
          <div className="text-sm text-text-secondary mb-1">Critical</div>
          <div className="text-3xl font-bold text-red-600">
            {stats.critical_events || 0}
          </div>
        </div>
        
        <div className="card p-6">
          <div className="text-sm text-text-secondary mb-1">Unresolved</div>
          <div className="text-3xl font-bold text-orange-600">
            {stats.unresolved_events || 0}
          </div>
        </div>
        
        <div className="card p-6">
          <div className="text-sm text-text-secondary mb-1">Blocked IPs</div>
          <div className="text-3xl font-bold text-purple-600">
            {blockedIPs.length}
          </div>
        </div>
      </div>

      {/* Security Dashboard */}
      <SecurityDashboard
        initialEvents={eventsData.events}
        totalEvents={eventsData.total}
        highRiskAlerts={highRiskAlerts}
        blockedIPs={blockedIPs}
        currentPage={page}
        pageSize={limit}
        filters={{ severity, event_type, resolved }}
      />
    </div>
  );
}
