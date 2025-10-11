import { getCurrentAdmin } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import { searchUsers } from "@/features/admin/user-actions";
import UserSearch from "@/components/admin/UserSearch";

export const metadata = {
  title: "User Management - Admin",
};

// Disable static generation - this page must be dynamic
export const dynamic = "force-dynamic";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    status?: string;
    verified?: string;
    page?: string;
  };
}) {
  const adminUser = await getCurrentAdmin();
  
  if (!adminUser) {
    redirect("/auth/signin?redirect=/admin/users");
  }

  // Check if user has support role or higher
  const hasSupportAccess = ["support", "analyst", "moderator", "super_admin"].includes(adminUser.role);
  
  if (!hasSupportAccess) {
    redirect("/admin");
  }

  // Parse search params
  const query = searchParams.q;
  const status = searchParams.status as "active" | "suspended" | "banned" | undefined;
  const verified = searchParams.verified === "true" ? true : searchParams.verified === "false" ? false : undefined;
  const page = parseInt(searchParams.page || "1");
  const limit = 50;
  const offset = (page - 1) * limit;

  // Search users
  const { users, total } = await searchUsers({
    query,
    status,
    verified,
    limit,
    offset,
  });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary">User Management</h1>
        <p className="text-text-secondary mt-1">
          Search and manage user accounts
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-6">
          <div className="text-sm text-text-secondary mb-1">Total Users</div>
          <div className="text-3xl font-bold text-text-primary">
            {total.toLocaleString()}
          </div>
        </div>
        
        <div className="card p-6">
          <div className="text-sm text-text-secondary mb-1">Active</div>
          <div className="text-3xl font-bold text-green-600">
            {users.filter((u: any) => !u.moderation?.is_suspended && !u.moderation?.is_banned).length}
          </div>
        </div>
        
        <div className="card p-6">
          <div className="text-sm text-text-secondary mb-1">Suspended/Banned</div>
          <div className="text-3xl font-bold text-red-600">
            {users.filter((u: any) => u.moderation?.is_suspended || u.moderation?.is_banned).length}
          </div>
        </div>
      </div>

      {/* User search component */}
      <UserSearch
        initialUsers={users}
        totalUsers={total}
        currentPage={page}
        pageSize={limit}
        filters={{ query, status, verified }}
      />
    </div>
  );
}
