export const dynamic = "force-dynamic";

import FeedClient from "@/components/posts/FeedClient";
import { listFeed } from "@/features/posts/actions";

/**
 * Home now renders the global feed.
 */
export default async function HomeFeedPage() {
  let items: any[] = [];
  let nextCursor: string | undefined = undefined;
  try {
    const res = await listFeed({ limit: 20 });
    items = res.items;
    nextCursor = res.nextCursor;
  } catch {
    items = [];
    nextCursor = undefined;
  }

  return (
    <div className="container py-6 space-y-4">
      <FeedClient initialItems={items} initialNextCursor={nextCursor} />
    </div>
  );
}
