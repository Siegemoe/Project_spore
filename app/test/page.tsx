export const dynamic = "force-dynamic";

import Composer from "@/components/posts/Composer";
import FeedClient from "@/components/posts/FeedClient";
import { listFeed } from "@/features/posts/actions";

/**
 * Feature test page for feed + composer.
 * Keeps / as marketing/landing while /test hosts product UI during buildout.
 */
export default async function TestFeedPage() {
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

  // TEMP until auth is wired: set to empty to disable posting in prod
  const TEMP_USER_ID = "";

  return (
    <div className="container py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Spore Test Feed</h1>
      <Composer onPosted={undefined} />
      <FeedClient initialItems={items} initialNextCursor={nextCursor} />
    </div>
  );
}
