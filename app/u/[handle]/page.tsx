export const dynamic = "force-dynamic";

import { getSupabaseAdmin, hasSupabaseAdminEnv } from "@/lib/supabaseAdmin";
import { getServerSupabase } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
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

  const followersRes = await admin
    .from("follows")
    .select("*", { head: true, count: "exact" })
    .eq("followee_id", userId);

  if ((followersRes as any)?.error) {
    throw new Error(`Followers count failed: ${(followersRes as any).error.message}`);
  }

  const followingRes = await admin
    .from("follows")
    .select("*", { head: true, count: "exact" })
    .eq("follower_id", userId);

  if ((followingRes as any)?.error) {
    throw new Error(`Following count failed: ${(followingRes as any).error.message}`);
  }

  return {
    followers: (followersRes as any).count ?? 0,
    following: (followingRes as any).count ?? 0,
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
        <p className="text-sm text-neutral-600 mt-4">You can still navigate to known profiles:</p>
        <ul className="list-disc list-inside text-sm mt-1">
          <li>
            <a className="link" href="/u/alice">
              /u/alice
            </a>
          </li>
          <li>
            <a className="link" href="/u/bob">
              /u/bob
            </a>
          </li>
        </ul>
      </div>
    );
  }

  const admin = getSupabaseAdmin();

  const handle = decodeURIComponent(params.handle).replace(/^@/, "");

  // 1) Try to resolve by users.handle (case-insensitive)
  const { data: userData, error } = await admin
    .from("users")
    .select("id, handle, display_name, avatar_url, bio, created_at")
    .ilike("handle", handle)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  let user: any = userData;

  // 2) Fallback: allow visiting by GitHub login (/u/{github_login})
  if (!user) {
    const { data: ga } = await admin
      .from("git_accounts")
      .select("user_id, github_login")
      .ilike("github_login", handle)
      .maybeSingle();

    if (ga?.user_id) {
      const { data: u2 } = await admin
        .from("users")
        .select("id, handle, display_name, avatar_url, bio, created_at")
        .eq("id", ga.user_id)
        .maybeSingle();
      user = u2 ?? null;

      // If a user exists but has no handle, set one now based on the path
      if (user && !user.handle) {
        const desired = handle.toLowerCase().replace(/[^a-z0-9_-]/g, "");
        let newHandle = desired || `user-${String(ga.user_id).slice(0, 6)}`;
        const { data: exists } = await admin
          .from("users")
          .select("id")
          .ilike("handle", newHandle)
          .limit(1);
        if (exists && exists.length > 0) {
          newHandle = `${newHandle}-${String(ga.user_id).slice(0, 4)}`;
        }
        await admin.from("users").update({ handle: newHandle, is_public: true }).eq("id", ga.user_id);

        // Refresh
        const { data: refreshed } = await admin
          .from("users")
          .select("id, handle, display_name, avatar_url, bio, created_at")
          .eq("id", ga.user_id)
          .maybeSingle();
        user = refreshed ?? user;
      }
    }
  }

  if (!user) {
    // 3) Final safety: if the viewer is authenticated, load by their user id
    const supa = getServerSupabase();
    const {
      data: { user: sessionUser },
    } = await supa.auth.getUser();

    if (sessionUser?.id) {
      const { data: me } = await admin
        .from("users")
        .select("id, handle, display_name, avatar_url, bio, created_at")
        .eq("id", sessionUser.id)
        .maybeSingle();

      if (me) {
        // Backfill handle if still missing
        if (!me.handle) {
          const desired = handle.toLowerCase().replace(/[^a-z0-9_-]/g, "");
          let newHandle = desired || `user-${String(sessionUser.id).slice(0, 6)}`;
          const { data: exists } = await admin
            .from("users")
            .select("id")
            .ilike("handle", newHandle)
            .limit(1);
          if (exists && exists.length > 0) {
            newHandle = `${newHandle}-${String(sessionUser.id).slice(0, 4)}`;
          }
          await admin
            .from("users")
            .update({ handle: newHandle, is_public: true })
            .eq("id", sessionUser.id);
          // Redirect to the canonical path we just created
          return redirect(`/u/${newHandle}`);
        }

        // If we are already on the canonical handle (case-insensitive), render with this user instead of redirecting
        if (me.handle && me.handle.toLowerCase() === handle.toLowerCase()) {
          user = me;
        } else {
          // Otherwise, redirect to the canonical handle to normalize the URL
          return redirect(`/u/${me.handle}`);
        }
      }
    }

    if (!user) {
      return (
        <div className="container py-10">
          <h1 className="text-xl font-semibold">User not found</h1>
        </div>
      );
    }
  }

  // 3) Counts and GitHub info
  const counts = await getCounts(user.id);

  const { data: gitAccount } = await admin
    .from("git_accounts")
    .select("github_login")
    .eq("user_id", user.id)
    .maybeSingle();

  const repos = gitAccount?.github_login ? await fetchPublicRepos(gitAccount.github_login, 10) : [];
  const githubLogin = gitAccount?.github_login ?? null;

  // Contribution counts (posts + comments)
  const { getContributionCounts } = await import("@/features/profile/actions");
  const contributions = await getContributionCounts(user.id);

  // Initial page of this user's posts (newest first)
  const { data: upItems, error: upErr } = await admin
    .from("posts")
    .select("id,user_id,caption,media_url,media_type,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (upErr) {
    throw new Error(`Failed to load user posts: ${upErr.message}`);
  }
  const userPosts = (upItems ?? []) as Array<{
    id: string;
    user_id: string;
    caption: string | null;
    media_url: string | null;
    media_type: string | null;
    created_at: string;
  }>;
  const userPostsNextCursor = userPosts.length > 0 ? userPosts[userPosts.length - 1].id : undefined;

  // Determine viewer from server session; allow dev override via ?uid= for testing
  const supaViewer = getServerSupabase();
  const {
    data: { user: viewerUser },
  } = await supaViewer.auth.getUser();
  let viewerId: string | undefined = viewerUser?.id ?? undefined;
  if (!viewerId && typeof searchParams?.uid === "string") {
    viewerId = searchParams.uid as string;
  }

  let initialIsFollowing = false;
  if (viewerId) {
    const exists = await admin
      .from("follows")
      .select("follower_id", { head: true, count: "exact" })
      .eq("follower_id", viewerId)
      .eq("followee_id", user.id);
    initialIsFollowing = (exists.count ?? 0) > 0;
  }

  // 4) Stats formatting
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

  const contributionsText = undefined; // TODO: posts + comments count endpoint

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
        githubLogin={githubLogin}
        accountAgeText={ageText}
        contributionsTotal={contributions.total}
      />

      {/* StatsRow omitted per new design; we’ll add Contributions later in header or a dedicated section */}

      <ProfileTabs
        repos={repos}
        about={{ bio: user.bio ?? null }}
        posts={{
          userId: user.id,
          initialItems: userPosts,
          initialNextCursor: userPostsNextCursor,
        }}
      />
    </div>
  );
}
