export const dynamic = "force-dynamic";

import { getSupabaseAdmin, hasSupabaseAdminEnv } from "@/lib/supabaseAdmin";
import { Avatar } from "@/components/ui/Avatar";

type PageProps = { params: { handle: string } };

export default async function FollowingPage({ params }: PageProps) {
  const admin = getSupabaseAdmin();
  const handle = decodeURIComponent(params.handle).replace(/^@/, "");

  if (!hasSupabaseAdminEnv()) {
    return (
      <div className="container py-10 space-y-4 max-w-3xl">
        <h1 className="text-2xl font-semibold text-text-primary">@{handle} • Following</h1>
        <p className="text-sm text-text-secondary">
          Supabase environment variables are not set in this environment, so following cannot be loaded.
        </p>
      </div>
    );
  }

  // Resolve user id by handle
  const { data: user } = await admin
    .from("users")
    .select("id, handle, display_name")
    .ilike("handle", handle)
    .maybeSingle();

  if (!user) {
    return (
      <div className="container py-10 max-w-3xl">
        <h1 className="text-2xl font-semibold text-text-primary">User not found</h1>
      </div>
    );
  }

  // List following -> join follows(followee_id -> users.id) where follower_id = user.id
  const { data: rows } = await admin
    .from("follows")
    .select("followee_id")
    .eq("follower_id", user.id);

  const followeeIds = Array.from(new Set((rows ?? []).map((r: any) => r.followee_id))).filter(Boolean);
  let followees: Array<{ id: string; handle: string | null; display_name: string | null; avatar_url: string | null }> = [];

  if (followeeIds.length > 0) {
    const { data: users } = await admin
      .from("users")
      .select("id, handle, display_name, avatar_url")
      .in("id", followeeIds);

    followees =
      (users ?? []).map((u: any) => ({
        id: u.id as string,
        handle: (u.handle ?? null) as string | null,
        display_name: (u.display_name ?? null) as string | null,
        avatar_url: (u.avatar_url ?? null) as string | null,
      })) ?? [];
  }

  return (
    <div className="container py-10 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">@{user.handle} • Following</h1>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              if (window.history.length > 1) window.history.back();
              else window.location.href = `/u/${encodeURIComponent(user.handle)}`;
            }
          }}
          className="rounded-md border border-border-subtle px-3 py-1.5 text-sm hover:bg-[rgb(var(--surface-muted))]"
          aria-label="Back to profile"
        >
          Back
        </button>
      </div>

      {followees.length === 0 ? (
        <p className="text-sm text-text-secondary">Not following anyone yet.</p>
      ) : (
        <ul className="space-y-2">
          {followees.map((f) => (
            <li key={f.id} className="card p-3 sm:p-4">
              <a href={`/u/${encodeURIComponent(f.handle ?? "")}`} className="flex items-center gap-3">
                <Avatar src={f.avatar_url ?? undefined} name={f.display_name || f.handle || "@"} size="sm" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-text-primary truncate">
                    {f.display_name || f.handle || f.id}
                  </div>
                  {f.handle ? (
                    <div className="text-xs text-text-secondary truncate">@{f.handle}</div>
                  ) : null}
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
