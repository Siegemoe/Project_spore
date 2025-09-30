import { NextResponse } from "next/server";
import { listFeed } from "@/features/posts/actions";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor") || undefined;
  const limitParam = searchParams.get("limit");
  const viewer = searchParams.get("viewer") || undefined;
  const limit = Math.min(Math.max(Number(limitParam ?? 20) || 20, 1), 50);

  try {
    const { items, nextCursor } = await listFeed({ cursor, limit, viewerId: viewer || undefined });
    return NextResponse.json({ items, nextCursor });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to fetch feed" }, { status: 500 });
  }
}
