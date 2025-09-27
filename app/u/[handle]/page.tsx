export const dynamic = "force-dynamic";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import FollowButton from "@/components/follows/FollowButton";

type PageProps = {
  params: { handle: string };
  searchParams?: { [key: string]: string | string[] | undefined };
};

async function getCounts(userId: string) {
  const admin = getSupabaseAdmin();
  const followers = await admin
    .from("follows")
    .select("*", { head: true, count: "exact" })
    .eq("followee_id", userId);
  const following = await admin
    .from("follows")
    .select("*", { head: true, count: "exact" })
    .eq("follower_id", userId);
  return {
    followers: followers.count ?? 0,
    following: following.count ?? 0,
  };
}

export default async function ProfilePage({ params, searchParams }: PageProps) {
  const admin = getSupabaseAdmin();

  const handle = decodeURIComponent(params.handle).replace(/^@/, "");
  const { data: user, error } = await admin
    .from("users")
    .select("id, handle, display_name, avatar_url, bio")
    .ilike("handle", handle)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!user) {
    return (
      <div className="container py-10">
        <h1 className="text-xl font-semibold">User not found</h1>
      </div>
    );
  }

  const counts = await getCounts(user.id);

  // Dev-only viewer id: provide ?uid=... to enable Follow button while auth is not wired
  const viewerId = typeof searchParams?.uid === "string" ? searchParams?.uid : undefined;

  let initialIsFollowing = false;
  if (viewerId) {
    const exists = await admin
      .from("follows")
      .select("follower_id", { head: true, count: "exact" })
      .eq("follower_id", viewerId)
      .eq("followee_id", user.id);
    initialIsFollowing = (exists.count ?? 0) > 0;
  }

  return (
    <div className="container py-10 space-y-6 max-w-3xl">
      <header className="card p-4 sm:p-6 flex items-start gap-4">
        {/* Avatar placeholder */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={user.avatar_url || "https://placehold.co/80x80?text=@"}
          alt={user.handle || ""}
          className="h-20 w-20 rounded-full border border-neutral-200 bg-neutral-100 object-cover"
        />
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">
            {user.display_name || user.handle}
          </h1>
          <p className="text-neutral-500">@{user.handle}</p>
          {user.bio && <p className="mt-2 text-[15px] leading-relaxed">{user.bio}</p>}
          <div className="mt-3 flex items-center gap-4 text-sm text-neutral-600">
            <span>
              <strong>{counts.followers}</strong> followers
            </span>
            <span>
              <strong>{counts.following}</strong> following
            </span>
          </div>
        </div>

        <FollowButton
          followerId={viewerId}
          followeeId={user.id}
          initialIsFollowing={initialIsFollowing}
        />
      </header>

      <section>
        <h2 className="text-lg font-medium mb-2">Posts</h2>
        <p className="text-sm text-neutral-500">User posts will appear here in a later milestone.</p>
      </section>
    </div>
  );
}
