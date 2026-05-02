import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Server-side resolver for "current user's profile".
 * - If authenticated, fetch user handle and redirect to /u/{handle}
 * - If not authenticated, redirect to /auth/signin?returnTo=/u/me
 */
export async function GET(req: Request) {
  const session = await auth();
  const url = new URL(req.url);
  const origin = url.origin;

  if (!session?.user?.id) {
    return NextResponse.redirect(
      `${origin}/auth/signin?returnTo=${encodeURIComponent("/u/me")}`,
      302
    );
  }

  const userId = session.user.id;

  // Resolve user's handle
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { handle: true },
  });

  let handle = user?.handle?.trim() || "";

  if (!handle) {
    // Fallback handle derived from user id
    handle = `user-${userId.slice(0, 6)}`;
    await prisma.user.update({
      where: { id: userId },
      data: { handle },
    });
  }

  return NextResponse.redirect(
    `${origin}/u/${encodeURIComponent(handle)}`,
    302
  );
}
