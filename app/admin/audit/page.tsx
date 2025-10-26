import { getCurrentAdmin } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import { queryAuditLogs, getAuditLogStats } from "@/lib/admin/audit";
import AuditLogViewer from "@/components/admin/AuditLogViewer";

export const metadata = {
  title: "Audit Logs - Admin",
};

export const dynamic = "force-dynamic";

const STATS_DAYS = 7;

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: {
    admin_id?: string;
    action?: string;
    resource_type?: string;
    page?: string;
  };
}) {
  const adminUser = await getCurrentAdmin();
  
  if (!adminUser) {
    redirect("/auth/signin?returnTo=/admin/audit");
  }

  // All admins can view audit logs
  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const limit = 50;
  const offset = (page - 1) * limit;
  
  // Fetch audit logs and stats with error handling
  let logsData;
  let stats;
  
  try {
    [logsData, stats] = await Promise.all([
      queryAuditLogs({
        admin_id: searchParams.admin_id,
        action: searchParams.action,
        resource_type: searchParams.resource_type,
        limit,
        offset,
      }),
      getAuditLogStats(STATS_DAYS),
    ]);
  } catch (error) {
    console.error("Failed to fetch audit logs or stats:", error);
    throw error; // Let error.tsx handle it
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Audit Logs</h1>
        <p className="text-text-secondary mt-1">
          Complete history of all admin actions
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-6">
          <div className="text-sm text-text-secondary mb-1">Total Actions ({STATS_DAYS}d)</div>
          <div className="text-3xl font-bold text-text-primary">
            {stats?.total_actions ?? 0}
          </div>
        </div>
        
        <div className="card p-6">
          <div className="text-sm text-text-secondary mb-1">Most Common Action</div>
          <div className="text-lg font-bold text-text-primary">
            {Object.entries(stats?.actions_by_type ?? {})
              .sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] || "N/A"}
          </div>
        </div>
        
        <div className="card p-6">
          <div className="text-sm text-text-secondary mb-1">Active Admins ({STATS_DAYS}d)</div>
          <div className="text-3xl font-bold text-text-primary">
            {Object.keys(stats?.actions_by_admin ?? {}).length}
          </div>
        </div>
      </div>

      {/* Audit log viewer */}
      <AuditLogViewer
        initialLogs={logsData.logs}
        totalLogs={logsData.total}
        currentPage={page}
        pageSize={limit}
        filters={{
          admin_id: searchParams.admin_id,
          action: searchParams.action,
          resource_type: searchParams.resource_type,
        }}
      />
    </div>
  );
}
