"use client";

import * as React from "react";
import type { PublicRepo } from "@/features/github/actions";

export function RepoList({ repos }: { repos: PublicRepo[] }) {
  if (!repos || repos.length === 0) {
    return <p className="text-sm text-text-secondary">No public repos found.</p>;
  }
  return (
    <ul className="space-y-2">
      {repos.map((r) => (
        <li key={r.fullName} className="card p-3 sm:p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <a
                href={r.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="truncate text-sm font-medium text-text-primary underline underline-offset-2 hover:opacity-80"
                title={r.fullName}
              >
                {r.fullName}
              </a>
              {r.description ? (
                <p className="mt-1 line-clamp-2 text-[13px] text-text-secondary">{r.description}</p>
              ) : null}
            </div>
            <span className="shrink-0 rounded-full border border-border-subtle px-2 py-0.5 text-[11px] text-text-secondary">
              {r.visibility}
            </span>
          </div>
          {r.updatedAt ? (
            <p className="mt-2 text-[12px] text-text-secondary">Updated {new Date(r.updatedAt).toLocaleString()}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
