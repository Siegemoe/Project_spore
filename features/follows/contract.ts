import { z } from "zod";

export const FollowToggle = z.object({
  followeeId: z.string().uuid(),
});

export type FollowToggle = z.infer<typeof FollowToggle>;
