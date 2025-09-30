import { useInfiniteQuery } from "@tanstack/react-query";

export type FeedItem = {
  id: string;
  user_id: string;
  caption: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  handle?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
};

export type FeedResponse = {
  items: FeedItem[];
  nextCursor?: string;
};

type FetchFeedArgs = {
  cursor?: string;
  limit?: number;
  viewerId?: string;
};

export const feedQueryKey = (viewerId?: string) => ["feed", viewerId ?? "anon"] as const;

async function fetchFeed({ cursor, limit = 20, viewerId }: FetchFeedArgs): Promise<FeedResponse> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (cursor) params.set("cursor", cursor);
  if (viewerId) params.set("viewer", viewerId);

  const res = await fetch(`/api/feed?${params.toString()}`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Failed to fetch feed");
    throw new Error(errorText || "Failed to fetch feed");
  }

  return res.json();
}

type UseFeedOptions = {
  initialPage?: FeedResponse;
  initialCursor?: string;
  viewerId?: string;
  limit?: number;
};

export function useFeed({ initialPage, initialCursor, viewerId, limit = 20 }: UseFeedOptions = {}) {
  const key = feedQueryKey(viewerId);

  return useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) =>
      fetchFeed({
        cursor: pageParam as string | undefined,
        limit,
        viewerId,
      }),
    initialPageParam: initialCursor,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialData: initialPage
      ? {
          pageParams: [undefined],
          pages: [initialPage],
        }
      : undefined,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
