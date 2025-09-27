import type { Metadata, Route } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Search • Spore",
  description: "Discover builders and projects."
};

export default function SearchPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-text-primary">Search</h1>
        <p className="text-sm text-text-secondary">Stub page — trending users and inline Follow will land here.</p>
      </header>

      <div className="grid gap-3">
        <div className="card p-4">
          <p className="text-sm text-text-secondary">Coming soon: search box, trending users, filters.</p>
        </div>
      </div>

      <div className="text-sm text-text-secondary">
        Not signed in?{" "}
        <Link href={"/auth/signin" as Route} className="underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
