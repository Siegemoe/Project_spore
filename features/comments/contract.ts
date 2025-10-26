import { z } from "zod";

export const CommentInsert = z.object({
  postId: z.string().uuid(),
  body: z.string().trim().min(1).max(1000, "Comment must be 1000 characters or less"),
});

export type CommentInsert = z.infer<typeof CommentInsert>;
