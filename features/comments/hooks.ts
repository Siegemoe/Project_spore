import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listComments, createComment } from "./actions";

export type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

export const commentsQueryKey = (postId: string) => ["comments", postId] as const;

type UseCommentsOptions = {
  postId: string;
  initialData?: Comment[];
  enabled?: boolean;
};

export function useComments({ postId, initialData, enabled = true }: UseCommentsOptions) {
  return useQuery({
    queryKey: commentsQueryKey(postId),
    queryFn: () => listComments(postId),
    initialData,
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

type CreateCommentInput = {
  postId: string;
  body: string;
};

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCommentInput) => {
      const result = await createComment(input);
      return result.item;
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: commentsQueryKey(variables.postId) });

      // Snapshot previous value
      const previousComments = queryClient.getQueryData<Comment[]>(
        commentsQueryKey(variables.postId)
      );

      // Optimistically update to the new value
      const optimisticComment: Comment = {
        id: `temp-${Date.now()}`,
        post_id: variables.postId,
        user_id: "temp-user",
        body: variables.body,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<Comment[]>(
        commentsQueryKey(variables.postId),
        (old = []) => [...old, optimisticComment]
      );

      return { previousComments };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousComments) {
        queryClient.setQueryData(
          commentsQueryKey(variables.postId),
          context.previousComments
        );
      }
    },
    onSettled: (data, error, variables) => {
      // Refetch to get the real data
      queryClient.invalidateQueries({ queryKey: commentsQueryKey(variables.postId) });
    },
  });
}
