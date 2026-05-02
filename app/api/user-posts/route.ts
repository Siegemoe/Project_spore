import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/user-posts?user={userId}&limit=20&cursor={postId}
 * Returns a page of posts for a specific user (newest first).
 * Cursor is a post id; we convert it to created_at cutoff for stable paging.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("user");
    const limit = Math.max(1, Math.min(Number(url.searchParams.get("limit") || 20), 50));
    const cursor = url.searchParams.get("cursor") || undefined;

    if (!userId) {
      return NextResponse.json({ error: "Missing user param" }, { status: 400 });
    }

    // Resolve cursor date
    let cursorDate: Date | undefined;
    if (cursor) {
      const cursorPost = await prisma.post.findUnique({
        where: { id: cursor },
        select: { createdAt: true },
      });
      if (cursorPost) {
        cursorDate = cursorPost.createdAt;
      }
    }

    const posts = await prisma.post.findMany({
      where: {
        userId,
        ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
      },
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
    }) as Array<{
      id: string;
      userId: string;
      caption: string | null;
      mediaUrl: string | null;
      mediaType: string | null;
      createdAt: Date;
    }>;

    const rows = posts.map((p) => ({
      id: p.id,
      user_id: p.userId,
      caption: p.caption,
      media_url: p.mediaUrl,
      media_type: p.mediaType,
      created_at: p.createdAt.toISOString(),
    }));

    const nextCursor = rows.length > 0 ? rows[rows.length - 1].id : undefined;
    return NextResponse.json({ items: rows, nextCursor }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "unknown_error" }, { status: 500 });
  }
}
