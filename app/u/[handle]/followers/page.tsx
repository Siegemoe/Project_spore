export const dynamic = "force-dynamic";

import { getSupabaseAdmin, hasSupabaseAdminEnv } from "@/lib/supabaseAdmin";

type PageProps = { params: { handle: string } };

export default async function FollowersPage({ params }: PageProps) {
  const admin = getSupabaseAdmin();
  const handle = decodeURIComponent(params.handle).replace(/^@/, "");

  if (!hasSupabaseAdminEnv()) {
    return (
      <div className="container py-10 space-y-4 max-w-3xl">
        <h1 className="text-2xl font-semibold text-text-primary">@{handle} • Followers</h1>
        <p className="text-sm text-text-secondary">
          Supabase environment variables are not set in this environment, so followers cannot be loaded.
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

  // List followers -> join follows(follower_id -> users.id)
  const { data: rows } = await admin
    .from("follows")
    .select("follower_id")
    .eq("followee_id", user.id);

  const followerIds = Array.from(new Set((rows ?? []).map((r: any) => r.follower_id))).filter(Boolean);
  let followers: Array<{ id: string; handle: string | null; display_name: string | null }> = [];

  if (followerIds.length > 0) {
    const { data: users } = await admin
      .from("users")
      .select("id, handle, display_name")
      .in("id", followerIds);

    followers =
      (users ?? []).map((u: any) => ({
        id: u.id as string,
        handle: (u.handle ?? null) as string | null,
        display_name: (u.display_name ?? null) as string | null
      })) ?? [];
  }

  return (
    <div className="container py-10 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">@{user.handle} • Followers</h1>
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

      {followers.length === 0 ? (
        <p className="text-sm text-text-secondary">No followers yet.</p>
      ) : (
        <ul className="space-y-2">
          {followers.map((f) => (
            <li key={f.id} className="card p-3 sm:p-4">
              <a className="underline underline-offset-2" href={`/u/${encodeURIComponent(f.handle ?? "")}`}>
                {f.display_name || f.handle || f.id}
              </a>
              {f.handle ? <span className="ml-2 text-text-secondary">@{f.handle}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
