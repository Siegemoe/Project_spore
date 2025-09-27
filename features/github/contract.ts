import { z } from "zod";

export const Repo = z.object({
  fullName: z.string().min(1),
  visibility: z.enum(["public", "private"]),
});

export type Repo = z.infer<typeof Repo>;

export const RepoList = z.object({
  items: z.array(Repo),
  nextCursor: z.string().optional(),
});

export type RepoList = z.infer<typeof RepoList>;
