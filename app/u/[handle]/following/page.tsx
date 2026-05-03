export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/ui/Avatar";

type PageProps = { params: { handle: string } };

type FollowingItem = {
  followee: {
    id: string;
    handle: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
};

export default async function FollowingPage({ params }: PageProps) {
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

  // List following with user details
  const following: FollowingItem[] = await prisma.follow.findMany({
    where: { followerId: user.id },
    select: {
      followee: {
        select: { id: true, handle: true, displayName: true, avatarUrl: true },
      },
    },
  });

  return (
    <div className="container py-10 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">@{user.handle} • Following</h1>
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

      {following.length === 0 ? (
        <p className="text-sm text-text-secondary">Not following anyone yet.</p>
      ) : (
        <ul className="space-y-2">
          {following.map((f) => (
            <li key={f.followee.id} className="card p-3 sm:p-4">
              <a href={`/u/${encodeURIComponent(f.followee.handle ?? "")}`} className="flex items-center gap-3">
                <Avatar
                  src={f.followee.avatarUrl ?? undefined}
                  name={f.followee.displayName || f.followee.handle || "@"}
                  size="sm"
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-text-primary truncate">
                    {f.followee.displayName || f.followee.handle || f.followee.id}
                  </div>
                  {f.followee.handle ? (
                    <div className="text-xs text-text-secondary truncate">@{f.followee.handle}</div>
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
