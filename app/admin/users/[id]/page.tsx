import { getCurrentAdmin } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import { getUserDetails } from "@/features/admin/user-actions";
import UserDetailView from "@/components/admin/UserDetailView";

export const metadata = {
  title: "User Details - Admin",
};

export const dynamic = "force-dynamic";

export default async function UserDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const adminUser = await getCurrentAdmin();
  
  if (!adminUser) {
    redirect("/auth/signin?returnTo=/admin/users");
  }

  // Check if user has support role or higher
  const hasSupportAccess = ["support", "analyst", "moderator", "super_admin"].includes(adminUser.role);
  
  if (!hasSupportAccess) {
    redirect("/admin");
  }

  // Get user details
  const userDetails = await getUserDetails(params.id);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <a href="/admin/users" className="text-sm text-[rgb(var(--accent))] hover:underline">
        ← Back to User Management
      </a>

      <UserDetailView userDetails={userDetails} adminUser={adminUser} />
    </div>
  );
}
