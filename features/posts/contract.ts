import { z } from "zod";

export const MediaType = z.enum(["image", "video"]);

export const PostInsert = z.object({
  userId: z.string().uuid(),
  caption: z.string().trim().max(2000).optional(),
  mediaUrl: z.string().url().optional(),
  mediaType: MediaType.optional(),
});

export type PostInsert = z.infer<typeof PostInsert>;

export const FeedQuery = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export type FeedQuery = z.infer<typeof FeedQuery>;
