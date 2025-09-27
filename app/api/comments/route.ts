import { NextResponse } from "next/server";
import { listComments, createComment } from "@/features/comments/actions";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const postId = searchParams.get("postId") || undefined;
  const limitParam = searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitParam ?? 50) || 50, 1), 100);

  if (!postId) {
    return NextResponse.json({ error: "postId is required" }, { status: 400 });
  }

  try {
    const items = await listComments(postId, limit);
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to fetch comments" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    /**
     * body = { postId: string, userId: string, text: string }
     * NOTE: In a later milestone we will derive userId from a server session.
     */
    const postId = String(body?.postId || "");
    const userId = String(body?.userId || "");
    const text = String(body?.text || "");

    if (!postId || !userId || !text) {
      return NextResponse.json({ error: "postId, userId, and text are required" }, { status: 400 });
    }

    await createComment({ postId, userId, body: text });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to create comment" }, { status: 500 });
  }
}
