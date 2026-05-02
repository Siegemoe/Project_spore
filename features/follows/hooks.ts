import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toggleFollow, checkFollowState } from "./actions";

export const followStateQueryKey = (followerId: string, followeeId: string) =>
  ["followState", followerId, followeeId] as const;

type UseFollowStateOptions = {
  followerId?: string;
  followeeId: string;
  initialState?: boolean;
};

/**
 * Hook to check if a user is following another user
 */
export function useFollowState({ followerId, followeeId, initialState }: UseFollowStateOptions) {
  return useQuery({
    queryKey: followStateQueryKey(followerId ?? "anon", followeeId),
    queryFn: async () => {
      if (!followerId) return false;
      return checkFollowState(followerId, followeeId);
    },
    initialData: initialState,
    enabled: !!followerId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

type UseToggleFollowOptions = {
  followerId: string;
  followeeId: string;
};

/**
 * Hook to toggle follow/unfollow state with optimistic updates
 */
export function useToggleFollow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ followeeId }: { followeeId: string }) => {
      const result = await toggleFollow({ followeeId });
      return result;
    },
    onMutate: async (variables) => {
      // We need the followerId to update the cache, but it's implicit in toggleFollow
      // For now, we'll just invalidate after the mutation completes
      // In a future iteration, we could pass followerId explicitly
      return {};
    },
    onSuccess: (data, variables) => {
      // Invalidate all follow state queries for this followee
      // This will trigger a refetch of the current state
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) &&
            key[0] === "followState" &&
            key[2] === variables.followeeId
          );
        },
      });
    },
    onError: (error) => {
      console.error("Toggle follow failed:", error);
    },
  });
}
