export const dynamic = "force-dynamic";

import { QueryClient, dehydrate } from "@tanstack/react-query";
import { Hydrate } from "@/components/providers/QueryProvider";
import FeedClient from "@/components/posts/FeedClient";
import { listFeed } from "@/features/posts/actions";
import { feedQueryKey, FeedResponse } from "@/features/posts/hooks";
import { getOptionalUser } from "@/lib/auth/session";

/**
 * Home now renders the global feed with React Query SSR hydration.
 */
export default async function HomeFeedPage() {
  const queryClient = new QueryClient();
  
  // Get current user for personalization
  const user = await getOptionalUser();
  const viewerId = user?.id;
  
  // Prefetch initial feed data
  let initialPage: FeedResponse;
  let initialCursor: string | undefined;
  try {
    const res = await listFeed({ limit: 20, viewerId });
    initialPage = { items: res.items, nextCursor: res.nextCursor };
    initialCursor = res.nextCursor;
    
    // Prefetch into React Query cache
    await queryClient.prefetchInfiniteQuery({
      queryKey: feedQueryKey(viewerId),
      queryFn: () => Promise.resolve(initialPage),
      initialPageParam: undefined,
    });
  } catch {
    initialPage = { items: [], nextCursor: undefined };
    initialCursor = undefined;
  }

  const dehydratedState = dehydrate(queryClient);

  return (
    <Hydrate state={dehydratedState}>
      <div className="container py-6 space-y-4">
        <FeedClient 
          initialPage={initialPage} 
          initialCursor={initialCursor} 
          viewerId={viewerId} 
        />
      </div>
    </Hydrate>
  );
}
