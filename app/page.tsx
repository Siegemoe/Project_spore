export const dynamic = "force-dynamic";

import Composer from "@/components/posts/Composer";
import FeedClient from "@/components/posts/FeedClient";
import { listFeed } from "@/features/posts/actions";

/**
 * Home feed (server component)
 * NOTE: Auth wiring comes next; for now pass a temporary userId to Composer during dev.
 */
export default async function HomePage() {
  // Fetch initial feed (server-side)
  let items: any[] = [];
  let nextCursor: string | undefined = undefined;
  try {
    const res = await listFeed({ limit: 20 });
    items = res.items;
    nextCursor = res.nextCursor;
  } catch {
    // During build without env, fall back to empty feed
    items = [];
    nextCursor = undefined;
  }

  // TEMP until auth is wired (Stage 1): use empty user id to disable posting
  // Replace with session-derived userId (e.g. from Supabase Auth helpers) in next step.
  const TEMP_USER_ID = "";

  return (
    <div className="container py-10 space-y-6">
      <Composer userId={TEMP_USER_ID} onPosted={undefined} />
      <FeedClient initialItems={items} initialNextCursor={nextCursor} />
    </div>
  );
}
