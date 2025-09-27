export const dynamic = "force-dynamic";

import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const ALICE_ID = "11111111-1111-1111-1111-111111111111";
const BOB_ID = "22222222-2222-2222-2222-222222222222";

async function getSeedUsers() {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("users")
      .select("id, handle, display_name, avatar_url, bio")
      .in("id", [ALICE_ID, BOB_ID]);
    if (error) throw error;
    return data ?? [];
  } catch {
    // Build-safe fallback
    return [];
  }
}

export default async function DevProfilesPage() {
  const users = await getSeedUsers();

  return (
    <div className="container py-10 space-y-6 max-w-4xl">
      <h1 className="text-2xl font-semibold">Seed Profiles</h1>
      {users.length === 0 ? (
        <div className="card p-4 sm:p-6">
          <p className="text-sm text-neutral-600">
            Could not fetch profiles (likely missing Supabase env in this environment). If running locally,
            ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE are set. Otherwise, visit known profiles directly:
          </p>
          <ul className="list-disc list-inside text-sm mt-2">
            <li>
              <Link href="/u/alice" className="link">/u/alice</Link>
            </li>
            <li>
              <Link href="/u/bob" className="link">/u/bob</Link>
            </li>
          </ul>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {users.map((u) => (
            <div key={u.id} className="card p-4 sm:p-6 space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={u.avatar_url || "https://placehold.co/80x80?text=@"}
                alt={u.handle || ""}
                className="h-16 w-16 rounded-full border border-neutral-200 bg-neutral-100 object-cover"
              />
              <div>
                <h2 className="text-lg font-semibold">{u.display_name || u.handle}</h2>
                <p className="text-neutral-500">@{u.handle}</p>
                {u.bio && <p className="text-[15px] leading-relaxed mt-1">{u.bio}</p>}
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Link href={`/u/${u.handle}`} className="btn btn-outline">View profile</Link>
                {/* Dev-only viewer links to enable Follow button before auth is wired */}
                {u.id === ALICE_ID && (
                  <Link href={`/u/${u.handle}?uid=${BOB_ID}`} className="btn btn-accent">View as Bob</Link>
                )}
                {u.id === BOB_ID && (
                  <Link href={`/u/${u.handle}?uid=${ALICE_ID}`} className="btn btn-accent">View as Alice</Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-4">
        <Link href="/test" className="btn btn-outline">Go to Feature Feed (/test)</Link>
      </div>
    </div>
  );
}
