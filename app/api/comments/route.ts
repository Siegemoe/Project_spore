import { NextResponse } from "next/server";
import { z } from "zod";
import { listComments, createComment } from "@/features/comments/actions";
import { ok, handleApiError } from "@/lib/api/response";

const QuerySchema = z.object({
  postId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const BodySchema = z.object({
  postId: z.string().uuid(),
  text: z.string().trim().min(1).max(2000),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      postId: searchParams.get("postId"),
      limit: searchParams.get("limit"),
    });

    if (!parsed.success) {
      return handleApiError(
        new (await import("@/lib/errors")).BadRequestError("Invalid query.", {
          issues: parsed.error.issues,
        })
      );
    }

    const { postId, limit } = parsed.data;
    const items = await listComments(postId, limit);
    return ok({ items });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = BodySchema.safeParse(json);

    if (!parsed.success) {
      return handleApiError(
        new (await import("@/lib/errors")).BadRequestError("Invalid payload.", {
          issues: parsed.error.issues,
        })
      );
    }

    const { postId, text } = parsed.data;
    const { item } = await createComment({ postId, body: text });
    return ok({ ok: true, item });
  } catch (error) {
    return handleApiError(error);
  }
}
