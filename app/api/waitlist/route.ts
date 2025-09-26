import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status });
}

export async function POST(req: Request) {
  try {
    const { email, handle, publishMcp } = await req.json().catch(() => ({} as any));

    // Basic validation
    if (typeof email !== "string" || !email.includes("@")) {
      return json(400, { error: "Invalid email" });
    }
    if (handle && typeof handle !== "string") {
      return json(400, { error: "Invalid handle" });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE;

    if (!url || !serviceKey) {
      return json(500, { error: "Server is not configured with Supabase credentials" });
    }

    const admin = createClient(url, serviceKey);
    const { data, error } = await admin
      .from("waitlist_signups")
      .insert({
        email,
        handle: handle ?? null,
        // store a simple boolean flag for interest in publishing MCPs
        publish_interest: !!publishMcp
      })
      .select("id, created_at")
      .single();

    if (error) {
      // common constraint errors: duplicate email or handle unique violation
      if ((error as any).code === "23505") {
        return json(409, { error: "Already signed up" });
      }
      return json(500, { error: "Failed to save waitlist entry", details: error.message });
    }

    return json(201, { ok: true, id: data?.id, created_at: data?.created_at });
  } catch (e: any) {
    return json(500, { error: "Unexpected error", details: e?.message ?? String(e) });
  }
}
