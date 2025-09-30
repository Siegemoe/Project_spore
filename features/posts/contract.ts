import { z } from "zod";
import { MAX_UPLOAD_BYTES } from "@/lib/config";

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

/**
 * Contracts for uploads and post creation (shared by actions/components).
 * Keep all zod schemas colocated here per build rules.
 */
export const UploadTargetInput = z.object({
  mediaType: MediaType,
  contentType: z.string().min(1),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});
export type UploadTargetInput = z.infer<typeof UploadTargetInput>;

export const CreatePostInput = z.object({
  caption: z.string().trim().max(2000).optional(),
  objectPath: z.string().min(1).optional(),
  mediaType: MediaType.optional(),
});
export type CreatePostInput = z.infer<typeof CreatePostInput>;
