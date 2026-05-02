export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { fetchPublicRepos } from "@/features/github/actions";
import { HeaderV2 } from "@/components/profile/HeaderV2";
import { ProfileTabs } from "@/components/profile/ProfileTabs";

type PageProps = {
  params: { handle: string };
  searchParams?: { [key: string]: string | string[] | undefined };
};

async function getCounts(userId: string) {
  const [followers, following] = await Promise.all([
    prisma.follow.count({ where: { followeeId: userId } }),
    prisma.follow.count({ where: { followerId: userId } }),
  ]);

  return { followers, following };
}

export default async function ProfilePage({ params, searchParams }: PageProps) {
  const handle = decodeURIComponent(params.handle).replace(/^@/, "");

  // 1) Try to resolve by users.handle (case-insensitive)
  let user = await prisma.user.findFirst({
    where: { handle: { equals: handle, mode: "insensitive" } },
    select: {
      id: true,
      handle: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      createdAt: true,
    },
  });

  // 2) Fallback: allow visiting by GitHub login (/u/{github_login})
  if (!user) {
    const gitAccount = await prisma.gitAccount.findFirst({
      where: { githubLogin: { equals: handle, mode: "insensitive" } },
      select: { userId: true, githubLogin: true },
    });

    if (gitAccount?.userId) {
      user = await prisma.user.findUnique({
        where: { id: gitAccount.userId },
        select: {
          id: true,
          handle: true,
          displayName: true,
          avatarUrl: true,
          bio: true,
          createdAt: true,
        },
      });

      // If a user exists but has no handle, set one now based on the path
      if (user && !user.handle) {
        const desired = handle.toLowerCase().replace(/[^a-z0-9_-]/g, "");
        let newHandle = desired || `user-${user.id.slice(0, 6)}`;
        const existing = await prisma.user.findFirst({
          where: { handle: { equals: newHandle, mode: "insensitive" } },
        });
        if (existing) {
          newHandle = `${newHandle}-${user.id.slice(0, 4)}`;
        }
        user = await prisma.user.update({
          where: { id: user.id },
          data: { handle: newHandle, isPublic: true },
          select: {
            id: true,
            handle: true,
            displayName: true,
            avatarUrl: true,
            bio: true,
            createdAt: true,
          },
        });
      }
    }
  }

  if (!user) {
    // 3) Final safety: if the viewer is authenticated, load by their user id
    const session = await auth();

    if (session?.user?.id) {
      const me = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          handle: true,
          displayName: true,
          avatarUrl: true,
          bio: true,
          createdAt: true,
        },
      });

      if (me) {
        // Backfill handle if still missing
        if (!me.handle) {
          const desired = handle.toLowerCase().replace(/[^a-z0-9_-]/g, "");
          let newHandle = desired || `user-${session.user.id.slice(0, 6)}`;
          const existing = await prisma.user.findFirst({
            where: { handle: { equals: newHandle, mode: "insensitive" } },
          });
          if (existing) {
            newHandle = `${newHandle}-${session.user.id.slice(0, 4)}`;
          }
          await prisma.user.update({
            where: { id: session.user.id },
            data: { handle: newHandle, isPublic: true },
          });
          // Redirect to the canonical path we just created
          return redirect(`/u/${newHandle}`);
        }

        // If we are already on the canonical handle (case-insensitive), render with this user instead of redirecting
        if (me.handle.toLowerCase() === handle.toLowerCase()) {
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

  const gitAccount = await prisma.gitAccount.findFirst({
    where: { userId: user.id },
    select: { githubLogin: true },
  });

  const reposResult = gitAccount?.githubLogin
    ? await fetchPublicRepos(gitAccount.githubLogin, 10)
    : { repos: [], error: undefined };
  const repos = reposResult.repos;
  const reposError = reposResult.error;
  const githubLogin = gitAccount?.githubLogin ?? null;

  // Contribution counts (posts + comments)
  const { getContributionCounts } = await import("@/features/profile/actions");
  const contributions = await getContributionCounts(user.id);

  // Initial page of this user's posts (newest first)
  const posts = await prisma.post.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      userId: true,
      caption: true,
      mediaUrl: true,
      mediaType: true,
      createdAt: true,
    },
  });

  const userPosts = posts.map((p) => ({
    id: p.id,
    user_id: p.userId,
    caption: p.caption,
    media_url: p.mediaUrl,
    media_type: p.mediaType,
    created_at: p.createdAt.toISOString(),
  }));
  const userPostsNextCursor = userPosts.length > 0 ? userPosts[userPosts.length - 1].id : undefined;

  // Determine viewer from server session; allow dev override via ?uid= for testing
  const session = await auth();
  let viewerId: string | undefined = session?.user?.id ?? undefined;
  if (!viewerId && typeof searchParams?.uid === "string") {
    viewerId = searchParams.uid as string;
  }

  let initialIsFollowing = false;
  if (viewerId) {
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followeeId: { followerId: viewerId, followeeId: user.id },
      },
    });
    initialIsFollowing = Boolean(existingFollow);
  }

  // 4) Stats formatting
  const ageText = user.createdAt
    ? (() => {
        const now = new Date();
        let months =
          (now.getFullYear() - user.createdAt.getFullYear()) * 12 +
          (now.getMonth() - user.createdAt.getMonth());
        if (months < 0) months = 0;
        const years = Math.floor(months / 12);
        const rem = months % 12;
        return `${years}y ${rem}m`;
      })()
    : undefined;

  return (
    <>
      <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen">
        <HeaderV2
          user={{
            id: user.id,
            handle: user.handle!,
            display_name: user.displayName,
            avatar_url: user.avatarUrl,
            bio: user.bio,
            created_at: user.createdAt?.toISOString() ?? null,
          }}
          counts={counts}
          viewerId={viewerId}
          initialIsFollowing={initialIsFollowing}
          reposCount={repos.length}
          githubLogin={githubLogin}
          accountAgeText={ageText}
          contributionsTotal={contributions.total}
        />
      </div>

      <div className="container py-6 space-y-6 max-w-3xl">
        <ProfileTabs
          repos={repos}
          reposError={reposError}
          about={{ bio: user.bio ?? null }}
          posts={{
            userId: user.id,
            initialItems: userPosts,
            initialNextCursor: userPostsNextCursor,
          }}
        />
      </div>
    </>
  );
}
