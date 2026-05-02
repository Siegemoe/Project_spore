import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Upsert a git_accounts row for the given user.
 * Body: { userId: string, github_login: string, github_user_id: string }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = String(body?.userId || "");
    const github_login = String(body?.github_login || "");
    const github_user_id = String(body?.github_user_id || "");

    if (!userId || !github_login || !github_user_id) {
      return NextResponse.json(
        { error: "userId, github_login and github_user_id are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.gitAccount.findFirst({
      where: { userId },
    });

    if (existing) {
      await prisma.gitAccount.update({
        where: { id: existing.id },
        data: { githubLogin: github_login, githubUserId: github_user_id },
      });
    } else {
      await prisma.gitAccount.create({
        data: {
          userId,
          githubLogin: github_login,
          githubUserId: github_user_id,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to connect GitHub" },
      { status: 500 }
    );
  }
}
