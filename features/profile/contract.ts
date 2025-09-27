import { z } from "zod";

export const ProfileUpdate = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  bio: z.string().trim().max(280).optional(),
});

export type ProfileUpdate = z.infer<typeof ProfileUpdate>;
