import { z } from "zod";

export const CommentInsert = z.object({
  postId: z.string().uuid(),
  body: z.string().trim().min(1).max(2000),
});

export type CommentInsert = z.infer<typeof CommentInsert>;
