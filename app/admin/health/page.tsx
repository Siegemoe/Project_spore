import { getCurrentAdmin } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import { 
  getHealthMetrics,
  getSystemHealth,
  getAPIPerformance,
  getDatabaseStats
} from "@/features/health/actions";
import HealthDashboard from "@/components/admin/HealthDashboard";

export const metadata = {
  title: "Platform Health - Admin",
};

export const dynamic = "force-dynamic";
export const revalidate = 30; // Refresh every 30 seconds

export default async function HealthPage() {
  const adminUser = await getCurrentAdmin();
  
  if (!adminUser) {
    redirect("/auth/signin?returnTo=/admin/health");
  }

  // Check if user has analyst role or higher
  const hasAnalystAccess = ["analyst", "moderator", "super_admin"].includes(adminUser.role);
  
  if (!hasAnalystAccess) {
    redirect("/admin");
  }

  // Fetch health data
  const [metrics, systemHealth, apiPerf, dbStats] = await Promise.all([
    getHealthMetrics(),
    getSystemHealth(),
    getAPIPerformance(1),
    getDatabaseStats(),
  ]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Platform Health</h1>
          <p className="text-text-secondary mt-1">
            Real-time system performance and health monitoring
          </p>
        </div>
        <div className="text-xs text-text-secondary">
          Auto-refreshes every 30 seconds
        </div>
      </div>

      {/* Health Dashboard */}
      <HealthDashboard
        metrics={metrics}
        systemHealth={systemHealth}
        apiPerformance={apiPerf}
        databaseStats={dbStats}
      />
    </div>
  );
}
