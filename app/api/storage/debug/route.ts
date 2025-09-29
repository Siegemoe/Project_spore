import { NextResponse } from "next/server";
import { getSupabaseAdmin, hasSupabaseAdminEnv } from "@/lib/supabaseAdmin";

// GET /api/storage/debug
// Returns RLS enabled state and current policies for storage.objects
export async function GET() {
  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json(
      { error: "Missing Supabase service role env; cannot introspect storage policies." },
      { status: 500 }
    );
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("debug_storage_policies");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? {});
}
