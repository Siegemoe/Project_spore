import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export default async function QuickStats() {
  const admin = getSupabaseAdmin();

  // Fetch quick stats in parallel
  const [usersResult, postsResult, commentsResult] = await Promise.allSettled([
    admin.from("users").select("id", { count: "exact", head: true }),
    admin.from("posts").select("id", { count: "exact", head: true }),
    admin.from("comments").select("id", { count: "exact", head: true }),
  ]);

  const userCount = usersResult.status === "fulfilled" ? usersResult.value.count || 0 : 0;
  const postCount = postsResult.status === "fulfilled" ? postsResult.value.count || 0 : 0;
  const commentCount = commentsResult.status === "fulfilled" ? commentsResult.value.count || 0 : 0;

  // Calculate growth (placeholder - you'd want to compare with previous period)
  const userGrowth = "+12%"; // TODO: Calculate actual growth
  const postGrowth = "+8%";
  const commentGrowth = "+15%";

  const stats = [
    {
      label: "Total Users",
      value: userCount.toLocaleString(),
      change: userGrowth,
      icon: "👥",
      color: "blue",
    },
    {
      label: "Total Posts",
      value: postCount.toLocaleString(),
      change: postGrowth,
      icon: "📝",
      color: "green",
    },
    {
      label: "Total Comments",
      value: commentCount.toLocaleString(),
      change: commentGrowth,
      icon: "💬",
      color: "purple",
    },
    {
      label: "Engagement Rate",
      value: postCount > 0 ? `${Math.round((commentCount / postCount) * 100)}%` : "0%",
      change: "+2%",
      icon: "📊",
      color: "orange",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">{stat.icon}</span>
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
              {stat.change}
            </span>
          </div>
          <div className="text-2xl font-bold text-text-primary mb-1">{stat.value}</div>
          <div className="text-sm text-text-secondary">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
