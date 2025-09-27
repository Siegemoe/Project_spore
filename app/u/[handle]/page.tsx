export const dynamic = "force-dynamic";

import { getSupabaseAdmin, hasSupabaseAdminEnv } from "@/lib/supabaseAdmin";
import FollowButton from "@/components/follows/FollowButton";
import ConnectButton from "@/components/github/ConnectButton";
import { fetchPublicRepos } from "@/features/github/actions";

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
  if (!hasSupabaseAdminEnv()) {
    const handle = decodeURIComponent(params.handle).replace(/^@/, "");
    return (
      <div className="container py-10">
        <h1 className="text-xl font-semibold">Profile</h1>
        <p className="text-sm text-neutral-600 mt-2">
          Supabase environment variables are not set in this environment, so profile data cannot be loaded.
        </p>
        <p className="text-sm text-neutral-600">
          If you are running locally, set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE, then refresh.
        </p>
        <p className="text-sm text-neutral-600 mt-4">
          You can still navigate to known profiles:
        </p>
        <ul className="list-disc list-inside text-sm mt-1">
          <li><a className="link" href="/u/alice">/u/alice</a></li>
          <li><a className="link" href="/u/bob">/u/bob</a></li>
        </ul>
      </div>
    );
  }

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

  // GitHub connect state
  const { data: gitAccount } = await admin
    .from("git_accounts")
    .select("github_login")
    .eq("user_id", user.id)
    .maybeSingle();

  const repos = gitAccount?.github_login
    ? await fetchPublicRepos(gitAccount.github_login, 10)
    : [];

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
          {/* If viewer is profile owner and no git account, offer connect */}
          {viewerId === user.id && !gitAccount && (
            <div className="mt-3">
              <ConnectButton />
            </div>
          )}
        </div>

        <FollowButton
          followerId={viewerId}
          followeeId={user.id}
          initialIsFollowing={initialIsFollowing}
        />
      </header>

      <section>
        <h2 className="text-lg font-medium mb-2">GitHub Repos</h2>
        {gitAccount?.github_login ? (
          repos.length > 0 ? (
            <ul className="space-y-2">
              {repos.map((r) => (
                <li key={r.fullName} className="text-sm">
                  <a href={r.htmlUrl} target="_blank" rel="noreferrer" className="link">
                    {r.fullName}
                  </a>
                  <span className="text-neutral-500"> — {r.visibility}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-500">No public repos found.</p>
          )
        ) : (
          <p className="text-sm text-neutral-500">Not connected to GitHub.</p>
        )}
      </section>

      <section className="mt-4">
        <h2 className="text-lg font-medium mb-2">Posts</h2>
        <p className="text-sm text-neutral-500">User posts will appear here in a later milestone.</p>
      </section>
    </div>
  );
}
