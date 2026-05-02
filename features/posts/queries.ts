import { prisma } from "@/lib/prisma";

export type FeedRow = {
  id: string;
  user_id: string;
  caption: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
};

/**
 * Minimal feed query (newest first). Personalization will be added in a follow-up PR.
 */
export async function feedQuery(limit: number, createdBefore?: string) {
  const posts = await prisma.post.findMany({
    where: createdBefore
      ? { createdAt: { lt: new Date(createdBefore) } }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      userId: true,
      caption: true,
      mediaUrl: true,
      mediaType: true,
      createdAt: true,
    },
  });

  return posts.map((p) => ({
    id: p.id,
    user_id: p.userId,
    caption: p.caption,
    media_url: p.mediaUrl,
    media_type: p.mediaType,
    created_at: p.createdAt.toISOString(),
  }));
}
