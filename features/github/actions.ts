export type PublicRepo = {
  fullName: string;
  visibility: "public" | "private";
  htmlUrl: string;
  description: string | null;
  updatedAt: string | null;
};

/**
 * Fetches public repositories for a GitHub user by login using the public REST API.
 * No OAuth token is required for public repos (Phase 1 scope).
 */
export async function fetchPublicRepos(login: string, limit = 10): Promise<{ repos: PublicRepo[]; error?: string }> {
  try {
    const url = new URL(`https://api.github.com/users/${encodeURIComponent(login)}/repos`);
    url.searchParams.set("per_page", String(limit));
    url.searchParams.set("sort", "updated");
    const res = await fetch(url.toString(), {
      // Helpful headers for GitHub API (GitHub recommends setting a UA)
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "Project-Spore/1.0 (+https://project-spore.vercel.app)",
      },
      // Run on server; ensure Next doesn't cache for long
      cache: "no-store",
      // Be resilient to transient failures
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return { repos: [], error: `GitHub API returned ${res.status}` };
    }
    const data: any[] = await res.json();
    return {
      repos: (data || []).slice(0, limit).map((r: any) => ({
        fullName: String(r.full_name || ""),
        visibility: (r.visibility || "public") as "public" | "private",
        htmlUrl: String(r.html_url || ""),
        description: r.description ? String(r.description) : null,
        updatedAt: r.updated_at ? String(r.updated_at) : null,
      })),
    };
  } catch {
    return { repos: [], error: "Unable to reach GitHub" };
  }
}
