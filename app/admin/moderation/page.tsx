import { getCurrentAdmin } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import ModerationQueue from "@/components/admin/ModerationQueue";
import { listReports, getReportStats } from "@/features/moderation/actions";

export const metadata = {
  title: "Content Moderation - Admin",
};

// Disable static generation - this page must be dynamic
export const dynamic = "force-dynamic";

export default async function ModerationPage({
  searchParams,
}: {
  searchParams: { status?: string; type?: string; page?: string };
}) {
  const adminUser = await getCurrentAdmin();
  
  if (!adminUser) {
    redirect("/auth/signin?returnTo=/admin/moderation");
  }

  // Check if user has moderator role or higher
  const hasModeratorAccess = ["moderator", "super_admin"].includes(adminUser.role);
  
  if (!hasModeratorAccess) {
    redirect("/admin");
  }

  // Get filters from search params
  const status = searchParams.status as any;
  const content_type = searchParams.type as any;
  const page = parseInt(searchParams.page || "1");
  const limit = 25;
  const offset = (page - 1) * limit;

  // Fetch reports and stats
  const [reportsData, stats] = await Promise.all([
    listReports({ status, content_type, limit, offset }),
    getReportStats(),
  ]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Content Moderation</h1>
        <p className="text-text-secondary mt-1">
          Review and moderate reported content
        </p>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-6">
          <div className="text-sm text-text-secondary mb-1">Pending</div>
          <div className="text-3xl font-bold text-orange-600">
            {stats.total_pending || 0}
          </div>
        </div>
        
        <div className="card p-6">
          <div className="text-sm text-text-secondary mb-1">In Review</div>
          <div className="text-3xl font-bold text-blue-600">
            {stats.total_reviewing || 0}
          </div>
        </div>
        
        <div className="card p-6">
          <div className="text-sm text-text-secondary mb-1">Resolved Today</div>
          <div className="text-3xl font-bold text-green-600">
            {stats.total_resolved_today || 0}
          </div>
        </div>
        
        <div className="card p-6">
          <div className="text-sm text-text-secondary mb-1">Avg Resolution Time</div>
          <div className="text-3xl font-bold text-purple-600">
            {stats.avg_resolution_time_hours 
              ? `${Math.round(stats.avg_resolution_time_hours)}h`
              : "N/A"}
          </div>
        </div>
      </div>

      {/* Moderation queue */}
      <ModerationQueue
        initialReports={reportsData.reports}
        totalReports={reportsData.total}
        currentPage={page}
        pageSize={limit}
        filters={{ status, content_type }}
      />
    </div>
  );
}
