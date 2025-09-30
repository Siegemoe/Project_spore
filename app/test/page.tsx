export const dynamic = "force-dynamic";

import Composer from "@/components/posts/Composer";
import FeedClient from "@/components/posts/FeedClient";
import { listFeed } from "@/features/posts/actions";

/**
 * Feature test page for feed + composer.
 * Keeps / as marketing/landing while /test hosts product UI during buildout.
 */
export default async function TestFeedPage() {
  // Fetch initial page server-side for SSR
  let initialPage: { items: any[], nextCursor: string | undefined } = { 
    items: [], 
    nextCursor: undefined 
  };
  try {
    const res = await listFeed({ limit: 20 });
    initialPage = { items: res.items, nextCursor: res.nextCursor };
  } catch {
    // During build without env, fall back to empty feed
  }

  return (
    <div className="container py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Spore Test Feed</h1>
      <Composer onPosted={undefined} />
      <FeedClient initialPage={initialPage} />
    </div>
  );
}
