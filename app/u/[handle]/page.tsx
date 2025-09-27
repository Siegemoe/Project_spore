export const dynamic = "force-dynamic";

import { getSupabaseAdmin, hasSupabaseAdminEnv } from "@/lib/supabaseAdmin";
import { fetchPublicRepos } from "@/features/github/actions";
import { HeaderV2 } from "@/components/profile/HeaderV2";
import { ProfileTabs } from "@/components/profile/ProfileTabs";
import { StatsRow } from "@/components/profile/StatsRow";

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
    .select("id, handle, display_name, avatar_url, bio, created_at")
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

  // Compute display strings for stats
  const createdAt = (user as any).created_at ? new Date((user as any).created_at as string) : null;
  const ageText = createdAt
    ? (() => {
        const now = new Date();
        let months = (now.getFullYear() - createdAt.getFullYear()) * 12 + (now.getMonth() - createdAt.getMonth());
        if (months < 0) months = 0;
        const years = Math.floor(months / 12);
        const rem = months % 12;
        return `${years}y ${rem}m`;
      })()
    : undefined;

  const contributionsText = undefined; // TODO: posts + comments count endpoint (Phase 2 follow-up)

  return (
    <div className="container py-10 space-y-6 max-w-3xl">
      <HeaderV2
        user={{
          id: user.id,
          handle: user.handle!,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          bio: user.bio,
          created_at: (user as any).created_at ?? null,
        }}
        counts={counts}
        viewerId={viewerId}
        reposCount={repos.length}
      />

      <StatsRow reposCount={repos.length} contributionsText={contributionsText} accountAgeText={ageText} />

      <ProfileTabs
        repos={repos}
        about={{ bio: user.bio ?? null }}
        postsPlaceholder={
          <div className="card p-4">
            <p className="text-sm text-text-secondary">User posts will appear here in a later milestone.</p>
          </div>
        }
      />
    </div>
  );
}
