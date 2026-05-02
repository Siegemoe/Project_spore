import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/user-comments?user={userId}&limit=20&cursor={commentId}
 * Returns comments authored by a user (newest first) with minimal post context.
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
      const cursorComment = await prisma.comment.findUnique({
        where: { id: cursor },
        select: { createdAt: true },
      });
      if (cursorComment) {
        cursorDate = cursorComment.createdAt;
      }
    }

    const comments = await prisma.comment.findMany({
      where: {
        userId,
        ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        post: {
          select: { id: true, userId: true, caption: true },
        },
      },
    });

    const rows = comments.map((c) => ({
      id: c.id,
      post_id: c.postId,
      user_id: c.userId,
      body: c.body,
      created_at: c.createdAt.toISOString(),
      post: c.post
        ? {
            id: c.post.id,
            user_id: c.post.userId,
            caption: c.post.caption,
          }
        : null,
    }));

    const nextCursor = rows.length > 0 ? rows[rows.length - 1].id : undefined;
    return NextResponse.json({ items: rows, nextCursor }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "unknown_error" }, { status: 500 });
  }
}
