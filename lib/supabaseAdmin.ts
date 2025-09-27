import { createClient } from "@supabase/supabase-js";

/**
 * Lazy creator for the server-side Supabase client using the service role.
 * We avoid initializing at import time so that Next build does not throw
 * when env vars are not present on the build machine.
 */
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE;

  if (!url || !serviceKey) {
    throw new Error("Supabase admin env missing: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
