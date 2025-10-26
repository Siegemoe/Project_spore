import { z } from "zod";

export const ProfileUpdate = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  bio: z.string().trim().max(500).optional(),
  websites: z.array(z.string().url()).max(5, "Maximum 5 websites allowed").optional(),
  email_public: z.boolean().optional(),
});

export type ProfileUpdate = z.infer<typeof ProfileUpdate>;
