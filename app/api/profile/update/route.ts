import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProfileUpdate } from "@/features/profile/contract";

/**
 * POST /api/profile/update
 * Body: { displayName?: string, bio?: string }
 * Auth: required. Updates current user's profile.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const json = await req.json().catch(() => ({}));
    const parsed = ProfileUpdate.parse(json);

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        displayName: parsed.displayName ?? null,
        bio: parsed.bio ?? null,
      },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "unknown_error" },
      { status: 500 }
    );
  }
}
