import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client using service role (Node runtime only).
// Do NOT expose this key to the client/browser.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE!;

if (!url || !serviceKey) {
  // eslint-disable-next-line no-console
  console.warn("Supabase admin env missing: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE");
}

export const supabaseAdmin = createClient(url || "", serviceKey || "", {
  auth: { persistSession: false },
});
