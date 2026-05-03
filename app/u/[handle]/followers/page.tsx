export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/ui/Avatar";

type PageProps = { params: { handle: string } };

type FollowerItem = {
  follower: {
    id: string;
    handle: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
};

export default async function FollowersPage({ params }: PageProps) {
  const handle = decodeURIComponent(params.handle).replace(/^@/, "");

  // Resolve user id by handle
  const user = await prisma.user.findFirst({
    where: { handle: { equals: handle, mode: "insensitive" } },
    select: { id: true, handle: true, displayName: true },
  });

  if (!user) {
    return (
      <div className="container py-10 max-w-3xl">
        <h1 className="text-2xl font-semibold text-text-primary">User not found</h1>
      </div>
    );
  }

  // List followers with user details
  const followers: FollowerItem[] = await prisma.follow.findMany({
    where: { followeeId: user.id },
    select: {
      follower: {
        select: { id: true, handle: true, displayName: true, avatarUrl: true },
      },
    },
  });

  return (
    <div className="container py-10 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">@{user.handle} • Followers</h1>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              if (window.history.length > 1) window.history.back();
              else window.location.href = `/u/${encodeURIComponent(user.handle!)}`;
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
            <li key={f.follower.id} className="card p-3 sm:p-4">
              <a href={`/u/${encodeURIComponent(f.follower.handle ?? "")}`} className="flex items-center gap-3">
                <Avatar
                  src={f.follower.avatarUrl ?? undefined}
                  name={f.follower.displayName || f.follower.handle || "@"}
                  size="sm"
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-text-primary truncate">
                    {f.follower.displayName || f.follower.handle || f.follower.id}
                  </div>
                  {f.follower.handle ? (
                    <div className="text-xs text-text-secondary truncate">@{f.follower.handle}</div>
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
